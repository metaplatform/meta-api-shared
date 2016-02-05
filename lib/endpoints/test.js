/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Base = require(__dirname + "/base.js");

/*
 * Test endpoint
 */
var Test = function(parent, id){

	Base.call(this, parent, id, Test.$.schema);

};

Test.$ = function(parent, id){

	return Promise.resolve(new Test(parent, id));

};

Test.$.schema = {
	title: "Test endpoint",
	description: "Endpoint for various testing purposes.",
	interfaces: [ "Test" ],
	publishes: [ "test" ]
};

Test.prototype = Object.create(Base.prototype);

Test.prototype["@test"] = function(params){

	return new Promise(function(resolve, reject){

		try {

			resolve({
				reply: params
			});

		} catch(e){
			reject(e);
		}

	});

};

Test.prototype["@test"].schema = {
	title: "Echo test",
	description: "Returns params in reply object.",
	returns: "Object"
};

//EXPORT
module.exports = Test;