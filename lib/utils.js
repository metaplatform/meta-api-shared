/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var clone = function(obj) {

    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null === obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");

};

var merge = function(target, source, cloneTarget){

    var result = ( cloneTarget !== false ? clone(target) : target );

    for(var i in source)
        result[i] = source[i];

    return result;

};

var filterProperties = function(obj, properties){

    var result = {};

    for(var i in properties)
        if(obj[ properties[i] ]) result[ properties[i] ] = obj[ properties[i] ];

    return result;

};

var excludeParams = function(params, exclude){

    var result = {};

    for(var i in params)
        if(exclude.indexOf(i) < 0) result[i] = params[i];

    return result;

};

//EXPORT
module.exports = {
	clone: clone,
    merge: merge,
    filterProperties: filterProperties,
    excludeParams: excludeParams
};