/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Types = require("../types.js");

var recordResolver = function(links){

	return function(record, props){

		var self = this;
		var tasks = [];

		var resolve = function(key, link){

			return new Promise(function(resolve, reject){

				self._api.callUri(link, "get").then(function(res){
					resolve({ key: key, result: res });
				}, function(){
					resolve({ key: key, result: null });
				});

			});

		};

		for(var l in links){

			if(props && props.indexOf("*") < 0 && props.indexOf(links[l]) < 0) continue;

			if(record[links[l]] instanceof Array){

				for(var k = 0; k < record[links[l]].length; k++)
					tasks.push( resolve(links[l], record[links[l]][k]) );

			} else {

				if(record[links[l]]) tasks.push( resolve(links[l], record[links[l]]) );

			}

		}

		return Promise.all(tasks).then(function(res){

			for(var i in res){
				
				if(record[res[i].key] instanceof Array){

					if(!record["$" + res[i].key])
						record["$" + res[i].key] = [];

					record["$" + res[i].key].push(res[i].result);

				} else {

					record["$" + res[i].key] = res[i].result;

				}

			}

			return record;

		});

	};

};

var collectionResolver = function(links){

	return function(records, props){

		var self = this;
		var tasks = [];

		var resolve = function(endpoint, ids){

			return new Promise(function(resolve, reject){

				self._api.callUri(endpoint, "map", { id: ids }).then(function(res){
					resolve({ endpoint: endpoint, result: res });
				}, function(){
					resolve({ endpoint: endpoint, result: null });
				});

			});

		};

		var endpoints = {};

		//Mine endpoints and ids
		for(var r in records){

			if(!records[r]._id) continue;

			for(var l in links){

				if(props && props.indexOf("*") < 0 && props.indexOf(links[l]) < 0) continue;

				if(!records[r][links[l]]) continue;

				try {
					
					var ref = Types.ApiReference.fromString(records[r][links[l]]);
					var path = ref.splitPath();
					var id = path.pop();

					var uri = ref.service + ":/" + path.join("/");

					if(!endpoints[uri]) endpoints[uri] = [];

					if(endpoints[uri].indexOf(id) < 0)
						endpoints[uri].push(id);

				} catch(e){
					continue;
				}

			}

		}

		//Add tasks
		for(var e in endpoints)
			tasks.push( resolve( e, endpoints[e] ) );

		return Promise.all(tasks).then(function(res){

			//Join results into resolved map
			var map = {};

			for(var i in res){

				if(!res[i].result) return;

				for(var j in res[i].result)
					map[res[i].endpoint + "/" + j] = res[i].result[j];

			}

			for(var x in records){

				for(var p in links){

					var link = links[p];

					if(!records[x][link]) continue;
					if(!map[ records[x][link] ]) continue;

					records[x]["$" + link] = map[ records[x][link] ];

				}

			}

			return records;

		});

	};

};

//EXPORT
module.exports = {
	record: recordResolver,
	collection: collectionResolver
};