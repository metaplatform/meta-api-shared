/*
 * META Cryonix
 *
 * @author Cryonix Innovations <www.cryonix.cz>
 * @license See LICENSE file distributed with this source code
 */

var protocol = require("./protocol.js");

module.exports = function(ws, logger, connConstructor, authHandler){

	//State variables
	var self = this;
	var conn = null;

	var requests = {};
	var resId = 0;

	var session = null;

	/*
	 * Respond function
	 */
	var respond = function(rid, data, command){

		var res;

		if(data instanceof Error)
			res = { r: rid, c: protocol.commands.error, e: { code: data.code || 500, message: data.message }};
		else
			res = { r: rid, c: command || protocol.commands.response, d: data };

		logger.debug("Sending response to %s, RID: %s, Command: %s", ws.upgradeReq.connection.remoteAddress, rid, res.c);

		ws.send(JSON.stringify(res));

	};

	var sendRequest = function(command, params, cb){

		resId++;
		var rid = "s" + resId;

		requests[rid] = cb;

		logger.debug("Sending request to %s, RID: %s, Command: %s", ws.upgradeReq.connection.remoteAddress, rid, command);

		ws.send(JSON.stringify({
			r: rid,
			c: command,
			p: params || {}
		}));

	};

	/*
	 * Connection functions
	 */
	 var HandleCall = function(endpoint, method, params){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliCall, {
	 				endpoint: endpoint,
	 				method: method,
	 				params: params
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleMessage = function(channel, message){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliMessage, {
	 				channel: channel,
	 				message: message
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleQueueMessage = function(queue, message){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliQueueMessage, {
	 				queue: queue,
	 				message: message
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleResponse = function(rid, err, data){

	 	if(!requests[rid])
	 		return;

	 	var cb = requests[rid];
	 	delete requests[rid];

	 	cb(err, data);

	 };

	 Auth = function(params){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			connConstructor(params.service, params, function(endpoint, method, params){

	 				return HandleCall(endpoint, method, params);

	 			}, function(channel, message){

	 				return HandleMessage(channel, message);

	 			}, function(queue, message){

	 				return HandleQueueMessage(queue, message);

	 			}).then(function(newConn){

	 				conn = newConn;
	 				resolve(conn.authSession);

	 			}, reject);

	 		} catch(e) {
	 			reject(e);
	 		}

	 	});

	};

	/*
	 * Handlers
	 */
	ws.on("message", function(msg){

		try {

			var data = JSON.parse(msg);
			var req = null;

			if(!data.c)
				return respond(null, new Error("Invalid request."));

			logger.debug("Request from %s, RID: %s, Command: %d", ws.upgradeReq.connection.remoteAddress, data.r, data.c);

			switch(data.c){

				case protocol.commands.response:
					if(data.r)
						HandleResponse(data.r, null, data.d);
					return;
				case protocol.commands.error:
					if(data.r)
						HandleResponse(data.r, new Error(data.e.message));
					return;

				case protocol.commands.auth:
					req = Auth(data.p);
					break;

				case protocol.commands.srvCall:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.service || !data.p.endpoint || !data.p.method) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "call", data.p.service, data.p.endpoint, data.p.method)) return respond(data.r, new Error("Unauthorized."));
					req = conn.call(data.p.service, data.p.endpoint, data.p.method, data.p.params || {});
					break;

				case protocol.commands.srvSubscribe:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "subscribe", data.p.channel)) return respond(data.r, new Error("Unauthorized."));
					req = conn.subscribe(data.p.channel);
					break;

				case protocol.commands.srvUnsubscribe:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "unsubscribe", data.p.channel)) return respond(data.r, new Error("Unauthorized."));
					req = conn.unsubscribe(data.p.channel);
					break;

				case protocol.commands.srvPublish:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel || ! data.p.message) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "publish", data.p.channel)) return respond(data.r, new Error("Unauthorized."));
					req = conn.publish(data.p.channel, data.p.message);
					break;

				case protocol.commands.srvSubscribers:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "subscribers", data.p.channel)) return respond(data.r, new Error("Unauthorized."));
					req = conn.subscribers(data.p.channel);
					break;

				case protocol.commands.srvSubscribeQueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "subscribeQueue", data.p.queue)) return respond(data.r, new Error("Unauthorized."));
					req = conn.subscribeQueue(data.p.queue);
					break;

				case protocol.commands.srvUnsubscribeQueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "unsubscribeQueue", data.p.queue)) return respond(data.r, new Error("Unauthorized."));
					req = conn.unsubscribeQueue(data.p.queue);
					break;

				case protocol.commands.srvEnqueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue || !data.p.message) return respond(data.r, new Error("Invalid request params."));
					if(authHandler && !authHandler(conn.authSession, "enqueue", data.p.queue)) return respond(data.r, new Error("Unauthorized."));
					req = conn.enqueue(data.p.queue, data.p.message);
					break;

				default:
					return respond(data.r, new Error("Undefined command."));

			}

			req.then(function(res){

				respond(data.r, res);

			}, function(err){

				respond(data.r, err);

			});

		} catch(e){

			respond(null, new Error("Invalid request format. Cannot parse JSON."));

		}

	});

	ws.on("close", function(){

		if(conn) conn.close();

		logger.info("WS connection from %s closed.", ws.upgradeReq.connection.remoteAddress);

		requests = {};

	});

	logger.info("New WS connection from %s", ws.upgradeReq.connection.remoteAddress);

	//Send hello message
	respond(null, {
		version: "1.0",
		auth: true
	}, protocol.commands.hello);

};