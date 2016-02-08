/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

/*
 * API reference
 *
 * @param String service
 * @param String endpoint
 */
var ApiReference = function(service, endpoint){

	this.service = service;
	this.endpoint = endpoint;

};

ApiReference.prototype.toString = function(){

	return this.service + ":/" + this.endpoint;

};

ApiReference.prototype.splitPath = function(){

	return this.endpoint.split("/");

};

/*
 * API Channel reference
 *
 * @param String service
 * @param String endpoint
 * @param String channelId
 */
var ChannelReference = function(service, endpoint, channelId){

	this.service = service;
	this.endpoint = endpoint;
	this.id = channelId;

};

ChannelReference.prototype.toString = function(){

	return this.service + ":/" + this.endpoint + "#" + this.id;

};

//EXPORT
module.exports = {

	ApiReference: 	 	ApiReference,
	ChannelReference: 	ChannelReference

};