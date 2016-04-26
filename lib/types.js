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
var ApiReference = function(service, endpoint, method){

	this.service = service;
	this.endpoint = endpoint;
	this.method = method || null;

};

ApiReference.prototype.toString = function(){

	return this.service + ":/" + this.endpoint + ( this.method ? "!" + this.method : "" );

};

ApiReference.prototype.splitPath = function(){

	var parts = this.endpoint.split("/");
	var r = [];

	for(var i in parts) if(parts[i]) r.push(parts[i]);

	return r;

};

ApiReference.fromString = function(uri){

	var partsA = uri.split("://");

	if(partsA.length !== 2) throw new Error("Invalid URI");

	var partsB = partsA[1].split("!");

	return new ApiReference(partsA[0], "/" + partsB[0], partsB[1] || null);

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