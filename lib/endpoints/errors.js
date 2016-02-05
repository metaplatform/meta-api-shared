/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

/*
 * Endpoint not found error
 *
 * @param String path
 */
var EndpointNotFound = function(path){

	this.name = "EndpointNotFound";
	this.code = 404;
	this.message = "Endpoint '" + path + "' not found.";

};

EndpointNotFound.prototype = Object.create(Error.prototype);

/*
 * Undefined method error
 *
 * @param String path
 * @param String method
 */
var UndefinedMethod = function(path, method){

	this.name = "UndefinedMethod";
	this.code = 400;
	this.message = "Endpoint '" + path + "' has not method '" + method + "'.";

};

UndefinedMethod.prototype = Object.create(Error.prototype);

/*
 * Invalid property constuctor error
 *
 * @param String path
 * @param String dir
 */
var InvalidPropertyConstructor = function(path, dir){

	this.name = "InvalidPropertyConstructor";
	this.code = 501;
	this.message = "Endpoint '" + path + "' has invalid property constructor for '" + dir + "'.";

};

InvalidPropertyConstructor.prototype = Object.create(Error.prototype);

/*
 * Invalid method constuctor error
 *
 * @param String path
 * @param String method
 */
var InvalidMethodConstructor = function(path, method){

	this.name = "InvalidMethodConstructor";
	this.code = 502;
	this.message = "Endpoint '" + path + "' has invalid method constructor for '" + method + "'.";

};

InvalidMethodConstructor.prototype = Object.create(Error.prototype);

//EXPORT
module.exports = {
	EndpointNotFound: EndpointNotFound,
	UndefinedMethod: UndefinedMethod,
	InvalidPropertyConstructor: InvalidPropertyConstructor,
	InvalidMethodConstructor: InvalidMethodConstructor
};