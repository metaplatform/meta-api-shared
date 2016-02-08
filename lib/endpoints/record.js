/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require("./base.js");
var Validator = require("../validator.js");
var Types = require("../types.js");

/*
 * Schematic endpoint constructor
 */
var Record = function(schema){

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
	 * Custom properties and methods
	 */

	//Add custom methods constructors
	if(schema.methods){

		for(var j in schema.methods)
			Endpoint.prototype["@" + j] = schema.methods[j];

	}

	return Endpoint;

};

Record.Property = function(schema, handler){

	handler.schema = schema;
	return handler;

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