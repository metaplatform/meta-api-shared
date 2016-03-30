/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require("./base.js");
var Validator = require("../validator.js");
var Utils = require("../utils.js");
var Types = require("../types.js");

/*
 * Schematic endpoint constructor
 */
var Record = function(schema){

	var liveCache = {};
	var gcInterval = schema.gcInterval || 10000;

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

		var self = this;

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
	Endpoint.$.schema.interfaces = [ "record" ];

	/*
	 * Get method
	 */
	if(schema.get) Endpoint.prototype["@get"] = Record.Method({
		title: "Get record",
		description: "Returns record properties.",
		icon: "magnify"
	}, {
		"properties": Validator.array({
			label: "Properties",
			description: "Return only specified properties."
		}),
		"resolve": Validator.array({
			label: "Resolve relations"
		})
	}, function(params){

		return schema.get.call(this, params).then(function(data){

			if(Object.keys(params.properties).length > 0)
				return Utils.filterProperties(data, params.properties);
			else
				return data;

		});

	});

	/*
	 * Update method
	 */
	if(schema.update) Endpoint.prototype["@update"] = Record.Method({
		title: "Update record",
		description: "Updates record data",
		icon: "content-save"
	},
	schema.properties,
	schema.update,
	true);

	/*
	 * Delete method
	 */
	if(schema.delete) Endpoint.prototype["@delete"] = Record.Method({
		title: "Delete record",
		description: "Deletes record",
		icon: "delete"
	}, {}, schema.delete);

	/*
	 * Live method
	 */
	if(schema.live) Endpoint.prototype["@live"] = Record.Method({
		title: "Live query",
		description: "Returns channel where record updates will be published.",
		icon: "magnify"
	}, {}, function(){

		if(!this._api) return Promise.reject(new Error("Bad endpoint configuration."));

		var self = this;

		if(liveCache[self._schema.path]){
			
			liveCache[self._schema.path].updated = (new Date().getTime());
			return Promise.resolve(liveCache[self._schema.path].channel);

		} else {

			return schema.live.call(this).then(function(ref){

				ref.on("live-create", function(data){
					self.emitLive(self._schema.path, "insert", data, schema.liveMapper);
				});

				ref.on("live-update", function(data){
					self.emitLive(self._schema.path, "update", data, schema.liveMapper);
				});

				ref.on("live-delete", function(data){
					self.emitLive(self._schema.path, "delete", data, schema.liveMapper);
				});

				liveCache[self._schema.path] = {
					api: self._api,
					ref: ref,
					channel: new Types.ChannelReference(self._api.serviceName, self._schema.path, "live"),
					updated: (new Date().getTime())
				};

				return liveCache[self._schema.path].channel;

			});

		}

	});

	Endpoint.prototype.emitLive = function(channelId, op, data, recordMapper){

		var self = this;

		if(!liveCache[channelId]) return;

		var record = data.content;
		record["@rid"] = "#" + data.cluster + ":" + data.position;

		console.log("LIVE RECORD", channelId, op, data);

		if(recordMapper)
			mapper = recordMapper.call(this, record, data, op);
		else
			mapper = Promise.resolve(record);

		return mapper.then(function(record){

			liveCache[channelId].api.publish(liveCache[channelId].channel.toString(), {
				op: op,
				record: record
			}).then(function(cnt){

				if(cnt === 0 && this._liveHandler){
					liveCache[channelId].ref.unsubscribe();
					delete liveCache[channelId];
				}

			});

		});

	};

	/*
	 * Setup properties
	 */
	for(var p in schema.properties)
		Endpoint.prototype["$" + p] = Record.ModelProperty(schema.properties[p]).$;

	/*
	 * Custom methods
	 */

	//Add custom properties construtors
	if(schema._properties){

		for(var i in schema._properties)
			Endpoint.prototype["$" + i] = schema._properties[i];

	}

	//Add custom methods constructors
	if(schema.methods){

		for(var j in schema.methods)
			Endpoint.prototype["@" + j] = schema.methods[j];

	}

	return Endpoint;

};

Record.ModelProperty = function(validator){

	var Endpoint = function(parent, id){

		Base.call(this, parent, id, Endpoint.$.schema);

	};

	Endpoint.prototype = Object.create(Base.prototype);

	Endpoint.$ = function(parent, id){

		return Promise.resolve(new Endpoint(parent, id));
		
	};

	Endpoint.$.schema = {
		title: validator.label,
		interfaces: [ "record:property", "property:" + validator.type ],
		validator: validator
	};

	Endpoint.prototype["@get"] = Record.Method({
		label: "Returns property value",
		icon: "magnify"
	}, {}, function(){

		var id = this._schema.id;

		return this._parent["@get"].call(this._parent, { properties: [ id ] }).then(function(res){

			return res[id];

		});

	});

	Endpoint.prototype["@set"] = Record.Method({
		label: "Sets property value",
		icon: "content-save"
	}, {
		value: validator
	}, function(params){

		var self = this;
		var id = this._schema.id;

		return this._parent["@get"].call(this._parent, { properties: [] }).then(function(original){

			var update = {};
			update[id] = params.value;

			return self._parent["@update"].call(self._parent, update);

		});

	});

	return Endpoint;

};

Record.Method = function(schema, params, handler, optionalValidation){

	if(!params._caller) params._caller = Validator.text({
		label: "_caller"
	});

	handler.schema = schema;
	handler.schema.params = new Validator.Validator(params);

	handler.before = function(params){

		if(optionalValidation)
			return handler.schema.params.validateOptional(params || {}, true);
		else
			return handler.schema.params.validate(params || {}, true);

	};

	return handler;

};

//EXPORT
module.exports = Record;