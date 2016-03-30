/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require(__dirname + "/base.js");
var Validator = require("../validator.js");

/*
 * Schematic endpoint constructor
 */
var Template = function(schema){

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
	Endpoint.$.schema = schema.schema;

	//Add properties construtors
	if(schema.properties){

		for(var i in schema.properties)
			Endpoint.prototype["$" + i] = schema.properties[i];

	}

	//Add method constructors
	if(schema.methods){

		for(var j in schema.methods)
			Endpoint.prototype["@" + j] = schema.methods[j];

	}

	return Endpoint;

};

Template.Property = function(schema, handler){

	handler.schema = schema;
	return handler;

};

Template.Method = function(schema, handler){

	handler.schema = schema;
	return handler;

};

Template.ParamsMethod = function(schema, params, handler){

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
module.exports = Template;