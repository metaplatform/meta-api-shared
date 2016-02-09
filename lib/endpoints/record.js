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

	var liveHandler = null;
	var gcInterval = schema.gcInterval || 10000;

	/*
	 * Garbage collector
	 */
	setInterval(function(){

		if(!liveHandler) return;

		liveHandler.api.subscribers(liveHandler.channel.toString()).then(function(cnt){

			if(cnt === 0){
				liveHandler.ref.unsubscribe();
				liveHandler = null;
			}

		});

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
	schema.update);

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

		if(liveHandler){
			
			return Promise.resolve(liveHandler.channel);

		} else {

			return schema.live.call(this).then(function(ref){

				ref.on("live-create", function(data){
					self.emitLive("insert", data);
				});

				ref.on("live-update", function(data){
					self.emitLive("update", data);
				});

				ref.on("live-delete", function(data){
					self.emitLive("delete", data);
				});

				liveHandler = {
					api: self._api,
					ref: ref,
					channel: new Types.ChannelReference(self._api.serviceName, self._schema.path, "live")
				};

				return liveHandler.channel;

			});

		}

	});

	Endpoint.prototype.emitLive = function(op, data){

		var self = this;

		if(!liveHandler) return;

		var record = data.content;
		record["@rid"] = "#" + data.cluster + ":" + data.position;

		liveHandler.api.publish(liveHandler.channel.toString(), {
			op: op,
			record: record
		}).then(function(cnt){

			if(cnt === 0 && liveHandler){
				liveHandler.ref.unsubscribe();
				liveHandler = null;
			}

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
		title: validator.label || id,
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

Record.Method = function(schema, params, handler){

	handler.schema = schema;
	handler.schema.params = new Validator.Validator(params);

	handler.before = function(params){

		return handler.schema.params.validate(params || {}, true);

	};

	return handler;

};

//EXPORT
module.exports = Record;