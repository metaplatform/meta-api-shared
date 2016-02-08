/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Errors = require(__dirname + "/errors.js");
var Utils = require(__dirname + "/../utils.js");

/*
 * Endpoint superclass
 */
var Base = function(parent, id, baseSchema){

	this._parent = parent;
	this._api = ( parent ? parent._api : null );

	this._schema = {
		id: id,
		path: ( parent && parent._schema.path != "/" ? parent._schema.path : "" ) + "/" + id,
		title: id,
		interfaces: []
	};

	for(var i in baseSchema)
		this._schema[i] = baseSchema[i];

};

Base.prototype.getSchema = function(deep){

	var properties = null;
	var methods = null;

	if(deep){

		properties = {};
		methods = {};

		for(var i in this.prototype){

			if(i.substr(0, 1) == "$")
				properties[ i.substr(1) ] = ( this.prototype[i].schema ? this.prototype[i].schema : {} );
			else if(i.substr(0, 1) == "@")
				methods[ i.substr(1) ] = ( this.prototype[i].schema ? this.prototype[i].schema : {} );

		}

		for(var j in this){

			if(j.substr(0, 1) == "$")
				properties[ j.substr(1) ] = ( this[j].schema ? this[j].schema : {} );
			else if(j.substr(0, 1) == "@")
				methods[ j.substr(1) ] = ( this[j].schema ? this[j].schema : {} );

		}

	}

	var s = Utils.clone(this._schema);

	if(properties) s.properties = properties;
	if(methods) s.methods = methods;

	return s;

};

Base.prototype._prop = function(name){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			var p;

			if(!self["$" + name] || !(self["$" + name] instanceof Function)){
				
				if(!self.$_ || !(self.$_ instanceof Function))
					return reject(new Errors.EndpointNotFound(self._schema.path + "/" + name));
				else
					p = self.$_(self, name);

			} else {

				p = self["$" + name](self, name);

			}

			if(!(p instanceof Promise))
				return reject(new Error.InvalidPropertyConstructor(self._schema.path, name));

			p.then(resolve, reject);

		} catch(e){
			reject(e);
		}

	});

};

Base.prototype._call = function(method, params){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self["@" + method] || !(self["@" + method] instanceof Function))
				return reject(new Errors.UndefinedMethod(self._schema.path, method));

			var makeCall = function(localParams){

				var m = self["@" + method](localParams);

				if(!m.then || !(m.then instanceof Function))
					return reject(new Errors.InvalidMethodConstructor(self._schema.path, method));

				m.then(resolve, reject);

			};

			var before = self["@" + method].before;

			if(before){

				var b = self["@" + method].before(params);

				if(!b.then || !(b.then instanceof Function))
					return reject(new Errors.InvalidMethodConstructor(self._schema.path, method));

				b.then(function(newParams){
					
					makeCall(newParams);

				}, reject);

			} else {
				
				makeCall(params);

			}

		} catch(e){
			reject(e);
		}

	});

};

Base.prototype["@schema"] = function(params){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			resolve(self.getSchema(true));

		} catch(e){
			reject(e);
		}

	});

};

Base.prototype["@schema"].schema = {
	title: "Schema",
	description: "Returns object schema",
	params: {}
};

//EXPORT
module.exports = Base;