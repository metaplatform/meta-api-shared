/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require("./base.js");
var Record = require("./record.js");
var Validator = require("../validator.js");
var Types = require("../types.js");

var Crypto = require("crypto");

/*
 * Schematic endpoint constructor
 */
var Collection = function(schema){

	var liveCache = {};
	var gcInterval = schema.gcInterval || 10000;

	var makeLiveCacheId = function(path, params){

		return Crypto.createHash("md5").update(path + ":" + JSON.stringify(params)).digest("hex");

	};

	/*
	 * Garbage collector
	 */
	setInterval(function(){

		if(Object.keys(liveCache).length === 0) return;

		var now = (new Date()).getTime();

		var checkCache = function(id, cache){

			if(cache.updated + 10000 >= now) return;

			cache.api.subscribers(cache.channel.toString()).then(function(cnt){

				if(cnt === 0){
					cache.ref.unsubscribe();
					delete liveCache[id];
				}

			});

		};

		for(var i in liveCache)
			checkCache(i, liveCache[i]);

	}, gcInterval);

	/*
	 * ENDPOINT constructor
	 */
	var Endpoint = function(parent, id){

		Base.call(this, parent, id, Endpoint.$.schema);

	};

	Endpoint.prototype = Object.create(Base.prototype);

	//Endpoint constructor
	Endpoint.$ = function(parent, id){

		return new Promise(function(resolve, reject){

			try {

				var instance = new Endpoint(parent, id);

				if(!schema.init)
					return resolve(instance);

				schema.init.call(instance, id).then(function(){

					resolve(instance);

				}, reject);

			} catch(e){
				reject(e);
			}

		});

	};

	//Assign schema
	Endpoint.$.schema = schema.schema || {};
	Endpoint.$.schema.interfaces = [ "collection" ];

	/*
	 * Query method
	 */
	if(schema.query && schema.count) Endpoint.prototype["@query"] = Collection.Method({
		title: "Query",
		description: "Returns collection records by query.",
		icon: "magnify"
	}, {
		"where": Validator.object({
			label: "Filter",
			description: "Query conditions in Mongo format."
		}),
		"sort": Validator.object({
			label: "Sort options",
			description: "Sorting of results in format <column>: <direction: 1=ASC|-1=DESC>"
		}),
		"properties": Validator.array({
			label: "Properties",
			description: "Return only specified properties."
		}),
		"skip": Validator.number({
			label: "Skip",
			description: "How many records to skip.",
			float: false
		}),
		"limit": Validator.number({
			label: "Limit",
			description: "Maximal count of returned records.",
			float: false
		}),
		"resolve": Validator.array({
			label: "Resolve relations"
		})
	}, function(params){

		var self = this;

		//Get total count
		return schema.count.call(self, { where: params.where }).then(function(count){

			return schema.query.call(self, params).then(function(records){

				return {
					records: records,
					count: records.length,
					total: count
				};

			});

		});

	});

	/*
	 * Create method
	 */
	if(schema.create && schema.record) Endpoint.prototype["@create"] = Collection.Method({
		title: "Create record",
		description: "Creates new record into collection.",
		icon: "plus"
	}, schema.record.properties, function(params){

		var self = this;

		return schema.create.call(this, params).then(function(id){

			return new Types.ApiReference(self._api ? self._api.serviceName : null, self._schema.path + "/" + id);

		});

	});

	/*
	 * Delete method
	 */
	if(schema.delete) Endpoint.prototype["@delete"] = Collection.Method({
		title: "Delete records",
		description: "Deletes multiple records from collection.",
		icon: "delete"
	}, {
		"id": Validator.array({
			label: "IDs",
			description: "Array of record IDs to remove.",
			required: true,
			empty: false
		})
	}, schema.delete);

	/*
	 * Count method
	 */
	if(schema.count) Endpoint.prototype["@count"] = Collection.Method({
		title: "Returns record count",
		description: "Returns count of all record in collection filtered by conditions.",
		icon: "magnify"
	}, {
		"where": Validator.object({
			label: "Filter",
			description: "Query conditions in Mongo format."
		})
	}, schema.count);

	/*
	 * Live method
	 */
	if(schema.live) Endpoint.prototype["@live"] = Collection.Method({
		title: "Live query",
		description: "Makes live query and returns channel name where changes will be published.",
		icon: "magnify"
	}, {
		"where": Validator.object({
			label: "Filter",
			description: "Query conditions in Mongo format."
		}),
		"sort": Validator.object({
			label: "Sort options",
			description: "Sorting of results in format <column>: <direction: 1=ASC|-1=DESC>"
		}),
		"properties": Validator.array({
			label: "Properties",
			description: "Return only specified properties."
		}),
		"skip": Validator.number({
			label: "Skip",
			description: "How many records to skip.",
			float: false
		}),
		"limit": Validator.number({
			label: "Limit",
			description: "Maximal count of returned records.",
			float: false
		})
	}, function(params){

		if(!this._api) return Promise.reject(new Error("Bad endpoint configuration."));

		var self = this;
		var hash = makeLiveCacheId(this._schema.path, params);

		if(liveCache[hash]){
			
			liveCache[hash].updated = (new Date().getTime());
			return Promise.resolve(liveCache[hash].channel);

		} else {

			return schema.live.call(this, params).then(function(ref){

				ref.on("live-create", function(data){
					self.emitLive(hash, "insert", data, schema.liveMapper);
				});

				ref.on("live-update", function(data){
					self.emitLive(hash, "update", data, schema.liveMapper);
				});

				ref.on("live-delete", function(data){
					self.emitLive(hash, "delete", data, schema.liveMapper);
				});

				liveCache[hash] = {
					api: self._api,
					ref: ref,
					channel: new Types.ChannelReference(self._api.serviceName, self._schema.path, "live_" + hash),
					updated: (new Date().getTime())
				};

				return liveCache[hash].channel;

			});

		}

	});

	/*
	 * Map method
	 */
	if(schema.map) Endpoint.prototype["@map"] = Collection.Method({
		title: "Map",
		description: "Map properties against record IDs.",
		icon: "link"
	}, {
		"id": Validator.array({
			label: "ID",
			description: "Record ID list.",
			required: true
		}),
		"properties": Validator.array({
			label: "Properties",
			description: "Return only specified properties."
		}),
		"resolve": Validator.array({
			label: "Resolve relations"
		})
	}, schema.map);

	/*
	 * Live map method
	 */
	if(schema.liveMap) Endpoint.prototype["@liveMap"] = Collection.Method({
		title: "Live map",
		description: "Makes live query and returns map of properties againts record IDs.",
		icon: "link"
	}, {
		"id": Validator.array({
			label: "ID",
			description: "Record ID list.",
			required: true
		}),
		"properties": Validator.array({
			label: "Properties",
			description: "Return only specified properties."
		})
	}, function(params){

		if(!this._api) return Promise.reject(new Error("Bad endpoint configuration."));

		params._liveMap = true;

		var self = this;
		var hash = makeLiveCacheId(params);

		if(liveCache[hash]){
			
			liveCache[hash].updated = (new Date().getTime());
			return Promise.resolve(liveCache[hash].channel);

		} else {

			return schema.liveMap.call(this, params).then(function(ref){

				ref.on("live-create", function(data){
					self.emitLive(hash, "insert", data, schema.liveMapMapper);
				});

				ref.on("live-update", function(data){
					self.emitLive(hash, "update", data, schema.liveMapMapper);
				});

				ref.on("live-delete", function(data){
					self.emitLive(hash, "delete", data, schema.liveMapMapper);
				});

				liveCache[hash] = {
					api: self._api,
					ref: ref,
					channel: new Types.ChannelReference(self._api.serviceName, self._schema.path, "live_" + hash),
					updated: (new Date().getTime())
				};

				return liveCache[hash].channel;

			});

		}

	});

	Endpoint.prototype.emitLive = function(channelId, op, data, recordMapper){

		var self = this;
		var cache = liveCache[channelId];

		if(!cache) return;

		var mapper;

		if(recordMapper)
			mapper = recordMapper.call(this, data.content, data, op);
		else
			mapper = Promise.resolve(data.content);

		mapper.then(function(record){

			cache.api.publish(cache.channel.toString(), {
				op: op,
				record: record,
				position: data.position
			}).then(function(cnt){

				if(cnt === 0 && liveCache[channelId]){
					liveCache[channelId].ref.unsubscribe();
					delete liveCache[channelId];
				}

			});

		});

	};

	/*
	 * Record property
	 */
	if(schema.record) Endpoint.prototype.$_ = Record(schema.record).$;

	/*
	 * Custom properties and methods
	 */

	//Add custom properties construtors
	if(schema.properties){

		for(var i in schema.properties)
			Endpoint.prototype["$" + i] = schema.properties[i];

	}

	//Add custom methods constructors
	if(schema.methods){

		for(var j in schema.methods)
			Endpoint.prototype["@" + j] = schema.methods[j];

	}

	return Endpoint;

};

Collection.Method = function(schema, params, handler){

	if(!params._caller) params._caller = Validator.text({
		label: "_caller"
	});

	handler.schema = schema;
	handler.schema.params = new Validator.Validator(params);

	handler.before = function(params){

		return handler.schema.params.validate(params || {}, true);

	};

	return handler;

};

//EXPORT
module.exports = Collection;