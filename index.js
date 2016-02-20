/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

module.exports = {
	
	//Libraries
	Client: 	require("./lib/client.js"),
	Endpoints: 	require("./lib/endpoints/index.js"),
	Types: 		require("./lib/types.js"),
	Utils: 		require("./lib/utils.js"),
	Validator: 	require("./lib/validator.js"),

	//Enums
	protocol: 	require("./lib/protocol.js"),
	wsHandler: 	require("./lib/wsHandler.js")

};