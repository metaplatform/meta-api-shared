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

	var makeLiveCacheId = function(params){

		return Crypto.createHash("md5").update(JSON.stringify(params)).digest("hex");

	};

	var Endpoint = function(parent, id){

		Base.call(this, parent, id, Endpoint.$.schema);

		this._liveCache = {};

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
		})
	}, function(params){

		if(!this._api) return Promise.reject(new Error("Bad endpoint configuration."));

		var self = this;
		var hash = makeLiveCacheId(params);

		if(this._liveCache[hash]){
			
			return Promise.resolve(new Types.ChannelReference(self._api ? self._api.serviceName : null, self._schema.path, "live_" + hash));

		} else {

			return schema.live.call(this, params).then(function(ref){

				ref.on("live-create", function(data){
					self.emitLive(hash, "insert", data.content);
				});

				ref.on("live-update", function(data){
					self.emitLive(hash, "update", data.content);
				});

				ref.on("live-delete", function(data){
					self.emitLive(hash, "delete", data.content);
				});

				self._liveCache[hash] = ref;

				return new Types.ChannelReference(self._api ? self._api.serviceName : null, self._schema.path, "live_" + hash);

			});

		}

	});

	Endpoint.prototype.emitLive = function(channelId, op, record){

		var self = this;
		var channel = self._api.serviceName + ":/" + self._schema.path + "#live_" + channelId;

		self._api.publish(channel, {
			op: op,
			record: record
		}).then(function(cnt){

			if(cnt === 0 && self._liveCache[channelId]){
				self._liveCache[channelId].unsubscribe();
				delete self._liveCache[channelId];
			}

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

Collection.Property = function(schema, handler){

	handler.schema = schema;
	return handler;

};

Collection.Method = function(schema, params, handler){

	handler.schema = schema;
	handler.schema.params = new Validator.Validator(params);

	handler.before = function(params){

		return handler.schema.params.validate(params || {}, true);

	};

	return handler;

};

//EXPORT
module.exports = Collection;