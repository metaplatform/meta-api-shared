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

ApiReference.fromString = function(uri){

	var parts = uri.split("://");

	if(parts.length !== 2) throw new Error("Invalid URI");

	return new ApiReference(parts[0], "/" + parts[1]);

};

ApiReference.prototype._type = "ApiReference";

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

ChannelReference.fromString = function(uri){

	var hash = uri.indexOf("#");
	var base = uri.substr(0, hash);
	var parts = base.split("://");

	if(hash < 0 || parts.length !== 2) throw new Error("Invalid URI");

	return new ChannelReference(parts[0], parts[1], uri.substr(hash + 1));

};

ChannelReference.prototype._type = "ChannelReference";

/*
 * API Storage reference
 *
 * @param String bucket
 * @param String objectId
 */
var StorageReference = function(bucket, objectId){

	this.bucket = bucket;
	this.objectId = objectId;

};

StorageReference.prototype.toString = function(){

	return this.bucket + "/" + this.objectId;

};

StorageReference.fromString = function(id){

	var parts = id.split("/");

	if(hash < 0 || parts.length !== 2) throw new Error("Invalid ID");

	return new StorageReference(parts[0], parts[1]);

};

StorageReference.prototype._type = "StorageReference";

//EXPORT
module.exports = {

	ApiReference: 	 	ApiReference,
	ChannelReference: 	ChannelReference,
	StorageReference: 	StorageReference

};