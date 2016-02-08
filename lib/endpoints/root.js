/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require(__dirname + "/base.js");

/*
 * Root endpoint
 */
var Root = function(api, serviceName){

	Base.call(this, null, "", {
		title: "Service root",
		description: "Root of service API",
		interfaces: [ "Root" ],
		icon: "settings"
	});

	this._api = api;

};

Root.prototype = Object.create(Base.prototype);

Root.prototype._addProperty = function(name, handler){

	this["$" + name] = handler;

};

//EXPORT
module.exports = Root;