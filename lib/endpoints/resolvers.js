/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Types = require("../types.js");

var recordResolver = function(links, subresolve){

	return function(record, props){

		var self = this;
		var tasks = [];

		var resolve = function(key, link){

			return new Promise(function(resolve, reject){

				var _params = {};
				if(subresolve) _params.resolve = subresolve;

				self._api.callUri(link, "get", _params).then(function(res){
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

var collectionResolver = function(links, subresolve){

	return function(records, props){

		var self = this;
		var tasks = [];

		var resolve = function(endpoint, ids){

			return new Promise(function(resolve, reject){

				var _params = { id: ids };
				if(subresolve) _params.resolve = subresolve;

				self._api.callUri(endpoint, "map", _params).then(function(res){
					resolve({ endpoint: endpoint, result: res });
				}, function(){
					resolve({ endpoint: endpoint, result: [] });
				});

			});

		};

		var endpoints = {};

		var checkLink = function(link){

			try {
				
				var ref = Types.ApiReference.fromString(link);
				var path = ref.splitPath();
				var id = path.pop();

				var uri = ref.service + "://" + ( path.length > 0 ? path.join("/") : '' );

				if(!endpoints[uri]) endpoints[uri] = [];

				if(endpoints[uri].indexOf(id) < 0)
					endpoints[uri].push(id);

				return true;

			} catch(e){
				return false;
			}

		};

		//Mine endpoints and ids
		for(var r in records){

			if(!records[r]._id) continue;

			for(var l in links){

				if(props && props.indexOf("*") < 0 && props.indexOf(links[l]) < 0) continue;

				if(!records[r][links[l]]) continue;

				if(records[r][links[l]] instanceof Array){

					for(var k = 0; k < records[r][links[l]].length; k++)
						checkLink(records[r][links[l]][k]);

				} else {

					checkLink(records[r][links[l]]);

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

					if(records[x][link] instanceof Array){

						records[x]["$" + link] = [];

						for(var t = 0; t < records[x][link].length; t++){
							records[x]["$" + link][t] = map[ records[x][link][t] ];
						}

					} else {

						if(!map[ records[x][link] ]) continue;

						records[x]["$" + link] = map[ records[x][link] ];

					}

				}

			}

			return records;

		});

	};

};

var recordJoinOneResolver = function(recordUri, recordKey, collectionUri, matchKey, defaultValue, subresolve){

	return function(record, props){

		var self = this;

		if(props && props.indexOf("*") < 0 && props.indexOf(recordKey) < 0)
			return Promise.resolve(record);

		return new Promise(function(resolve, reject){

			try {

				var query = {
					where: {},
					limit: 1
				};
				
				query.where[matchKey] = recordUri + "/" + record._id;

				if(subresolve)
					query.resolve = subresolve;

				self._api.callUri(collectionUri, "query", query).then(function(res){
					record["$" + recordKey] = res.records[0] || ( defaultValue || null );
					resolve(record);
				}, function(){
					record["$" + recordKey] = defaultValue || null;
					resolve(record);
				});

			} catch(err) {
				reject(err);
			}

		});

	};

};

var collectionJoinOneResolver = function(recordUri, recordKey, collectionUri, matchKey, defaultValue, subresolve){

	return function(records, props){

		var self = this;

		if(props && props.indexOf("*") < 0 && props.indexOf(recordKey) < 0)
			return Promise.resolve(records);

		return new Promise(function(resolve, reject){

			try {

				var targets = [];

				for(var i = 0; i < records.length; i++)
					targets.push(recordUri + "/" + records[i]._id);

				var query = {
					where: {},
				};
				
				query.where[matchKey] = { "$in": targets };

				if(subresolve)
					query.resolve = subresolve;

				self._api.callUri(collectionUri, "query", query).then(function(res){
					
					//Map results
					var map = {};

					for(var k = 0; k < res.records.length; k++)
						map[ res.records[k][matchKey] ] = res.records[k];
					
					//Map values to records
					for(var l = 0; l < records.length; l++)
						records[l]["$" + recordKey] = map[ recordUri + "/" + records[l]._id ] || (defaultValue || null);

					resolve(records);

				}, function(err){

					for(var j = 0; j < records.length; j++)
						records[j]["$" + recordKey] = defaultValue || null;

					resolve(records);

				});				

			} catch(err) {
				reject(err);
			}

		});

	};

};

var recordMultiResolve = function(resolvers){

	return function(record, props){

		var self = this;
		var tasks = [];

		for(var i = 0; i < resolvers.length; i++)
			tasks.push( resolvers[i].call(self, record, props) );

		return Promise.all(tasks).then(function(){

			return record;

		});

	};

};

var collectionMultiResolve = function(resolvers){

	return function(records, props){

		var self = this;
		var tasks = [];

		for(var i = 0; i < resolvers.length; i++)
			tasks.push( resolvers[i].call(self, records, props) );

		return Promise.all(tasks).then(function(){

			return records;

		});

	};

};

//EXPORT
module.exports = {
	record: recordResolver,
	collection: collectionResolver,
	recordJoinOne: recordJoinOneResolver,
	collectionJoinOne: collectionJoinOneResolver,

	recordMulti: recordMultiResolve,
	collectionMulti: collectionMultiResolve
};