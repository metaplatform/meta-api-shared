/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Utils = require("./utils.js");
var Endpoints = require("./endpoints/index.js");

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

/*
 * API local client lib
 *
 * Create API interface for local communication
 *
 * @param String serviceName
 */
Client = function(serviceName){

	this.serviceName = serviceName;
	this.subscriptions = {};
	this.queueSubscriptions = {};

	this.connection = null;

	this.rootEndpoint = new Endpoints.Root(this, serviceName);

};

/*
 * Incoming call handler
 */
Client.prototype.handleCall = function(endpoint, method, params){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			var path = endpoint.split("/");
			var handler = Promise.resolve(self.rootEndpoint);
			var dir = path.shift();

			var getEndpoint = function(dirName){

				return function(parentEndpoint){

					var r = parentEndpoint._prop(dirName, endpoint);

					if(!(r instanceof Promise))
						throw new InvalidPropertyConstructor(endpoint, dirName);

					return r;

				};

			};

			while(dir !== undefined){

				if(dir !== "")
					handler = handler.then(getEndpoint(dir));

				//Get next dir
				dir = path.shift();

			}

			handler.then(function(finalEndpoint){

				var m = finalEndpoint._call(method, params);

				if(!(m instanceof Promise))
					throw new InvalidMethodConstructor(endpoint, method);

				m.then(resolve, reject);

				m = null;

			}, reject);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Incoming message handler
 */
Client.prototype.handleMessage = function(channel, message){

	if(!this.subscriptions[channel])
		return;

	for(var i in this.subscriptions[channel])
		this.subscriptions[channel][i].call(null, message, channel);

};

/*
 * Incoming queue message handler
 */
Client.prototype.handleQueueMessage = function(queue, message){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.queueSubscriptions[queue])
				return resolve();
			
			self.queueSubscriptions[queue].call(null, message, queue).then(resolve, reject);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Creates connection to broker - must be overrided
 *
 * @param Broker broker
 * @return Promise
 * @resolve true
 */
Client.prototype.connect = function(broker){

	return Promise.reject("Not implemented.");

};

/*
 * Closes connection - must be overrided
 *
 * @return Promise
 * @resolve true
 */
Client.prototype.close = function(){

	return Promise.reject("Not implemented.");

};

/*
 * Add property to root endpoint
 *
 * @param String name
 * @param Function handler
 * @return Endpoint
 */
Client.prototype.endpoint = function(name, handler){

	return this.rootEndpoint._addProperty(name, handler);

};

/*
 * RPC call
 *
 * @param String service
 * @param String endpoint
 * @param String method
 * @param Object params
 * @return Promise
 * @resolve Object
 */
Client.prototype.call = function(service, endpoint, method, params){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			self.connection.call(service, endpoint, method, Utils.clone(params)).then(resolve, reject);

		} catch(e){
			reject(e);
		}

	});
	
};

/*
 * Subscribe to channel
 *
 * @param String channel
 * @param Function cb
 * @return Promise
 * @resolve Object Subscription handler with remove() method
 */
Client.prototype.subscribe = function(channel, cb){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));
			
			self.connection.subscribe(channel).then(function(resolve){

				if(!self.subscriptions[channel])
					self.subscriptions[channel] = [];

				self.subscriptions[channel].push(cb);

				return resolve({
					remove: function(){
						self.unsubscribe(channel, cb);
					}
				});

			}, reject);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Unsubscribes from channel
 *
 * @param String channel
 * @param Function cb
 * @return Promise
 * @resolve Bool true if was subscribed
 */
Client.prototype.unsubscribe = function(channel, cb){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			if(!self.subscriptions[channel])
				return resolve(false);

			var i = self.subscriptions[channel].indexOf(cb);

			if(i < 0)
				return resolve(false);

			//Remove from subscription table
			self.subscriptions.splice(i, 1);

			//Remove element if empty
			if(self.subscriptions[channel].length === 0){
				
				delete self.subscriptions[channel];

				//Also unsubcribe from connection
				self.connection.unsubscribe(channel).then(function(resolve){
					
					return resolve(true);

				}, reject);

			} else {

				return resolve(true);

			}

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Publish message
 *
 * @param String channel
 * @param Object message
 * @return Promise
 * @resolve Integer subscriber count
 */
Client.prototype.publish = function(channel, message){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			self.connection.publish(channel, Utils.clone(message)).then(resolve, reject);

		} catch(e){
			reject(e);
		}

	});
	
};

/*
 * Subscribes to queue messages
 *
 * @param String queue
 * @param Function cb
 * @return Promise
 * @resolve Object Subscription handler with remove() method
 */
Client.prototype.subscribeQueue = function(queue, cb){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			if(self.queueSubscriptions[queue])
				return reject(new Error("Already subscribed to queue '" + queue + "'."));

			self.connection.subscribeQueue(queue).then(function(){

				self.queueSubscriptions[queue] = cb;

				return resolve({
					remove: function(){
						self.unsubscribeQueue(queue);
					}
				});

			}, reject);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Unsubscribes from queue messages
 *
 * @param String queue
 * @param Function cb
 * @return Promise
 * @resolve Bool true if was subscribed
 */
Client.prototype.unsubscribeQueue = function(queue){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			if(!self.queueSubscriptions[queue])
				return resolve(false);

			//Unsubcribe from connection
			self.connection.unsubscribeQueue(queue).then(function(resolve){
				
				delete self.queueSubscriptions[queue];

				return resolve(true);

			}, reject);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Enqueue message
 *
 * @param String queue
 * @param Object message
 * @return Promise
 * @resolve true
 */
Client.prototype.enqueue = function(queue, message){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));

			self.connection.enqueue(queue, Utils.clone(message)).then(resolve, reject);

		} catch(e) {
			reject(e);
		}

	});
	
};

//EXPORT
module.exports = Client;