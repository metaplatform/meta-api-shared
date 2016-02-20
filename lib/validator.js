/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

/*
 * Validator constructor
 *
 * @param Object params Property validators
 */
var Validator = function(params){

	for(var i in params)
		this[i] = params[i];

};

/*
 * Validates parameters
 *
 * @param Object params
 * @param Boolean strict If to strip properties that are not defined by validators
 * @param String subName Prefix for fields name - for sub-validating
 * @return Promise
 * @resolve Object Validated and transformed params
 */
Validator.prototype.validate = function(params, strict, subName){

	var self = this;
	var p = Promise.resolve( strict ? {} : params );

	var validateParam = function(key){

		return function(data){

			var r = self[key].validate(( subName ? subName + "." : "" ) + key, ( strict ? params[key] : data[key] ), strict);

			if(r instanceof Promise){

				return r.then(function(value){

					data[key] = value;
					return data;

				});

			} else {

				data[key] = r;
				return data;

			}

		};

	};

	for(var i in self)
		if(self[i].validate && self[i].validate instanceof Function)
			p = p.then(validateParam(i));

	return p;

};

/* ------------------------------------------------------------------------
 *
 * VALIDATORS
 *
 * ------------------------------------------------------------------------ */

/*
 * Error
 */
var InvalidValueError = function(type, subject, message) {
	this.name = "InvalidValueError:" + type;
	this.message = "Value of parameter {" + subject + "} is not valid: " + message;
	this.type = type;
	this.subject = subject;
};

InvalidValueError.prototype = Object.create(Error.prototype);

/*
 * Base - implements required
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return Mixed
 */
var BaseValidator = function(opts){

	if(!opts) opts = {};

	this.type = "Base";
	this.required = opts.required || false;

	if(opts.label)
		this.label = opts.label;

	if(opts.description)
		this.description = opts.description;

};

BaseValidator.prototype.validate = function(name, value){

	if(this.required && ( value === null || value === undefined ))
		throw new InvalidValueError("Mandatory", name, "Value must be specified.");

	return ( value !== undefined ? value : null );

};

/*
 * Text validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		empty: Boolean If to allow empty string
 * 		minLength: Number Minimal allowed string length
 * 		maxLength: Number Maximal allowed string length
 * @return String|null
 */
var TextValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Text";
	this.empty = opts.empty || false;
	this.minLength = opts.minLength || null;
	this.maxLength = opts.maxLength || null;
	this.pattern = opts.pattern || null;

};

TextValidator.prototype = Object.create(BaseValidator.prototype);

TextValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Is empty?
	if(this.required && !this.empty && value === "")
		throw new InvalidValueError("Empty", name, "Value must not be empty.");

	if(value){

		//Min and max length
		if(this.minLength !== null && String(value).length < this.minLength)
			throw new InvalidValueError("MinLength", name, "Value length must be greater or equal to '" + this.minLength + "'.");

		if(this.maxLength !== null && String(value).length > this.maxLength)
			throw new InvalidValueError("MaxLength", name, "Value length must be lesser or equal to '" + this.maxLength + "'.");

		//Check pattern
		if(this.pattern && !String(value).match(new RegExp(this.pattern)))
			throw new InvalidValueError("InvalidPattern", name, "Value must match pattern '" + this.pattern + "'.");

	}

	return value;

};

/*
 * E-mail validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return String|null
 */
var EmailValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Email";

};

EmailValidator.prototype = Object.create(BaseValidator.prototype);

EmailValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check pattern
	if(value !== null && !String(value).match(new RegExp("^[a-zA-Z0-9\\.\\-_]*@[a-zA-Z0-9\\.\\-_]*$")))
		throw new InvalidValueError("NotEmail", name, "Value must be a valid e-mail address.");

	return value;

};

/*
 * Numeric validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		float: Boolean If to parse as float
 * 		min: Number Minimal allowed value
 * 		max: Number Maximal allowed value
 * @return Number|null
 */
var NumberValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Number";
	this.min = ( opts.min !== undefined ? opts.min : null );
	this.max = ( opts.max !== undefined ? opts.max : null );
	this.float = opts.float || false;

};

NumberValidator.prototype = Object.create(BaseValidator.prototype);

NumberValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return null;

	//Parse
	if(this.float)
		value = parseFloat(value);
	else
		value = parseInt(value);

	//Check
	if(isNaN(value))
		throw new InvalidValueError("NotNumeric", name, "Value must be a " + ( this.float ? "floating point " : "" ) + "number.");

	//Check min and max
	if(this.min !== null && value < this.min)
		throw new InvalidValueError("MinValue", name, "Value must be greater or equal to '" + this.min + "'.");

	if(this.max !== null && value > this.max)
		throw new InvalidValueError("MaxValue", name, "Value must be lesser or equal to '" + this.max + "'.");

	return value;

};

/*
 * Boolean validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return Boolean|null
 */
var BooleanValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Boolean";

};

BooleanValidator.prototype = Object.create(BaseValidator.prototype);

BooleanValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value !== null && value !== true && value !== false )
		throw new InvalidValueError("NotBoolean", name, "Value must boolean.");

	return value;

};

/*
 * Date validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return Date|null
 */
var DateValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Date";

};

DateValidator.prototype = Object.create(BaseValidator.prototype);

DateValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check pattern
	if(value !== null && !String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/))
		throw new InvalidValueError("NotDate", name, "Value must be a valid ISO 8601 date.");

	if(value === null)
		return value;

	return new Date(value + "T00:00:00.0Z");

};

/*
 * Datetime validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return Date|null
 */
var DateTimeValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":DateTime";

};

DateTimeValidator.prototype = Object.create(BaseValidator.prototype);

DateTimeValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check pattern
	if(value !== null && !String(value).match(/^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/))
		throw new InvalidValueError("NotDateTime", name, "Value must be a valid ISO 8601 date with time.");

	if(value === null)
		return value;

	return new Date(value);

};

/*
 * Time validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return String|null
 */
var TimeValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Time";

};

TimeValidator.prototype = Object.create(BaseValidator.prototype);

TimeValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check pattern
	if(value !== null && !String(value).match(/^([1]?[0-9]|[2][0-3]):[0-5]?[0-9]:[0-5]?[0-9]$/))
		throw new InvalidValueError("NotTime", name, "Value must be a valid time.");

	if(value === null)
		return value;

	return value;

};

/*
 * Array validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * @return Array|null
 */
var ArrayValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Array";

};

ArrayValidator.prototype = Object.create(BaseValidator.prototype);

ArrayValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check type
	if(value !== null && !(value instanceof Array))
		throw new InvalidValueError("NotArray", name, "Value must be an array.");

	return value || [];

};

/*
 * Object validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		properties: Object Optional subvalidator properties
 * @return Object|Promise|null
 * @resolve Object
 */
var ObjectValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Object";
	this.properties = ( opts.properties ? new Validator(opts.properties) : null );

};

ObjectValidator.prototype = Object.create(BaseValidator.prototype);

ObjectValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check type
	if(value !== null && !(value instanceof Object))
		throw new InvalidValueError("NotObject", name, "Value must be an object.");

	//Sub-validate?
	if(value instanceof Object && this.properties)
		return this.properties.validate(value, strict, name);
	else
		return value || {};

};

/*
 * Option validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		options: Object Valid options
 * @return Mixed|null
 */
var OptionValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Option";
	this.options = opts.options || {};

};

OptionValidator.prototype = Object.create(BaseValidator.prototype);

OptionValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check option
	if(value !== null && this.options.indexOf(value) < 0)
		throw new InvalidValueError("InvalidOption", name, "Value must be one of following options: '" + this.options.join(",") + "'.");

	return value;

};

/*
 * MultiOption validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		options: Object Valid options
 * 		empty: Boolean Allow empty list
 * @return Array|null
 */
var MultiOptionValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":MultiOption";
	this.options = opts.options || {};
	this.empty = ( opts.empty !== undefined ? opts.empty : true );

};

MultiOptionValidator.prototype = Object.create(BaseValidator.prototype);

MultiOptionValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	//Check type
	if(value !== null && !(value instanceof Array))
		throw new InvalidValueError("NotArray", name, "Value must be an array.");

	//Check options
	if(value){
		
		if(!this.empty && value.length === 0)
			throw new InvalidValueError("Empty", name, "Value must be an array with at least one element.");

		for(var i in value)
			if(this.options.indexOf(value[i]) < 0)
				throw new InvalidValueError("InvalidOption", name, "Values must be one of following options: '" + this.options.join(",") + "'.");

	}

	return value || [];

};

/*
 * Data validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		format: String (base64|json|raw)
 * @return Mixed
 */
var DataValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Data";
	this.format = opts.format || "raw";

};

DataValidator.prototype = Object.create(BaseValidator.prototype);

DataValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return null;

	if(this.format == "base64"){

		if(!value.match(/^[A-Za-z0-9+\/=]+$/))
			throw new InvalidValueError("NotBase64", name, "Value must be Base64 encoded.");

		try {
			value = new Buffer(value, 'base64').toString('ascii');
		} catch(e){
			throw new InvalidValueError("NotBase64", name, "Value must be Base64 encoded.");
		}

	} else if(this.format == "json"){

		try {
			value = JSON.parse(value);
		} catch(e){
			throw new InvalidValueError("NotJSON", name, "Value must be JSON encoded.");
		}

	}

	return value;

};

/*
 * API link validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 *		pattern: String
 * @param Client apiClient
 * @return Promise|null
 * @resolve String
 */
var LinkValidator = function(opts, apiClient){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":Link";
	this.pattern = opts.pattern || null;

	if(!apiClient)
		throw new Error("API Client is required for Link validator.");

	this.getClient = function(){
		return apiClient;
	};

};

LinkValidator.prototype = Object.create(BaseValidator.prototype);

LinkValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return null;

	//Check format pattern
	if(!String(value).match(/^[a-zA-Z0-9\-_]+:\/\/.*$/))
		throw new InvalidValueError("InvalidLink", name, "Value must be valid API link in format '<service>://<endpoint.'.");

	//Check custom pattern
	if(this.pattern && !String(value).match(new RegExp(this.pattern)))
		throw new InvalidValueError("InvalidLink", name, "Value must match pattern '" + this.pattern + "'.");

	//Parse
	var dbq = value.indexOf(":");
	var service = value.substr(0, dbq);
	var endpoint = value.substr(dbq + 2);

	return this.getClient().call(service, endpoint, "schema").then(function(){
		return value;
	}, function(err){
		throw new InvalidValueError("InvalidLink", name, "Provided API endpoint '" + service + ":/" + endpoint + "' is not accessable.");
	});

};

/*
 * API multiple link validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		empty: Bool If empty array is allowed
 *		pattern: String
 * @param Client apiClient
 * @return Promise|null
 * @resolve String
 */
var MultiLinkValidator = function(opts, apiClient){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":MultiLink";
	this.pattern = opts.pattern || null;
	this.empty = ( opts.empty !== undefined ? opts.empty : true );

	if(!apiClient)
		throw new Error("API Client is required for MultiLink validator.");

	this.getClient = function(){
		return apiClient;
	};

};

MultiLinkValidator.prototype = Object.create(BaseValidator.prototype);

MultiLinkValidator.prototype.validate = function(name, value, strict){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return null;

	//Check type
	if(!(value instanceof Array))
		throw new InvalidValueError("NotArray", name, "Value must be an array.");

	//Check if empty
	if(!this.empty && value.length === 0)
		throw new InvalidValueError("Empty", name, "Value must be an array with at least one element.");

	//Check values
	var checks = [];

	for(var i in value){

		//Check format pattern
		if(!String(value[i]).match(/^[a-zA-Z0-9\-_]+:\/\/.*$/))
			throw new InvalidValueError("InvalidLink", name, "Value must be valid API link in format '<service>://<endpoint.'.");

		//Check custom pattern
		if(this.pattern && !String(value[i]).match(new RegExp(this.pattern)))
			throw new InvalidValueError("InvalidLink", name, "Value must match pattern '" + this.pattern + "'.");

		//Parse
		var dbq = value[i].indexOf(":");
		var service = value[i].substr(0, dbq);
		var endpoint = value[i].substr(dbq + 2);

		checks.push(this.getClient().call(service, endpoint, "schema"));

	}

	return Promise.all(checks).then(function(){
		return value;
	}, function(err){
		throw new InvalidValueError("InvalidLink", name, "Provided API endpoint '" + service + ":/" + endpoint + "' is not accessable.");
	});

};

/*
 * IPv4 address validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		pattern: String
 * @return String|null
 */
var IPv4Validator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":IPv4";
	this.pattern = opts.pattern || null;

};

IPv4Validator.prototype = Object.create(BaseValidator.prototype);

IPv4Validator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return value;

	//Check format
	if(!String(value).match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/))
		throw new InvalidValueError("NotIPv4", name, "Value must be a valid IPv4 address.");

	//Check custom pattern
	if(this.pattern && !String(value).match(new RegExp(this.pattern)))
		throw new InvalidValueError("InvalidPattern", name, "Value must match pattern '" + this.pattern + "'.");

	return value;

};

/*
 * IPv4 mask validator
 *
 * @param Object opts
 *		required: Bool
 * 		label: String
 * 		description: String
 * 		minBits: Number
 * 		maxBits: Number
 * @return String|null
 */
var IPv4MaskValidator = function(opts){

	if(!opts) opts = {};

	BaseValidator.call(this, opts);

	this.type = this.type + ":IPv4Mask";
	this.minBits = opts.minBits || 0;
	this.maxBits = ( opts.maxBits !== undefined ? opts.maxBits : 32);

};

IPv4MaskValidator.prototype = Object.create(BaseValidator.prototype);

IPv4MaskValidator.prototype.validate = function(name, value){

	value = BaseValidator.prototype.validate.call(this, name, value);

	if(value === null) return value;

	//Check format
	if(!String(value).match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/))
		throw new InvalidValueError("NotIPv4", name, "Value must be a valid IPv4 address.");

	//Decbin
	function decbin(dec, length){
		var out = "";
		while(length--)
			out += (dec >> length ) & 1;    
		return out;  
	}

	//Convert to bits
	var parts = value.split(".");
	var bin = decbin(parseInt(parts[0]), 8) + decbin(parseInt(parts[1]), 8) + decbin(parseInt(parts[2]), 8) + decbin(parseInt(parts[3]), 8);

	var firstOne = bin.indexOf("1");
	var firstZero = bin.indexOf("0");
	var secondOne = bin.indexOf("1", firstZero);

	if(firstZero >= 0 && (firstZero < firstOne || secondOne > firstZero))
		throw new InvalidValueError("NotIPv4Mask", name, "Value must be a valid IPv4 mask.");

	if((firstZero >= 0 ? firstZero : 32) < this.minBits || (firstZero >= 0 ? firstZero : 32) > this.maxBits)
		throw new InvalidValueError("NotIPv4MaskOutOfRange", name, "IPv4 mask is out of range.");

	return value;

};

//EXPORT
module.exports = {
	Validator: 	Validator,

	Text: 			TextValidator,
	Email: 			EmailValidator,
	Number: 		NumberValidator,
	Boolean: 		BooleanValidator,
	Date: 			DateValidator,
	DateTime: 		DateTimeValidator,
	Time: 			TimeValidator,
	Array: 			ArrayValidator,
	Object: 		ObjectValidator,
	Option: 		OptionValidator,
	MultiOption: 	MultiOptionValidator,
	Data: 			DataValidator,
	Link: 			LinkValidator,
	MultiLink: 		MultiLinkValidator,
	IPv4: 			IPv4Validator,
	IPv4Mask: 		IPv4MaskValidator,

	text: 			function(opts){ return new TextValidator(opts); },
	email: 			function(opts){ return new EmailValidator(opts); },
	number: 		function(opts){ return new NumberValidator(opts); },
	boolean: 		function(opts){ return new BooleanValidator(opts); },
	date: 			function(opts){ return new DateValidator(opts); },
	datetime: 		function(opts){ return new DateTimeValidator(opts); },
	time: 			function(opts){ return new TimeValidator(opts); },
	array: 			function(opts){ return new ArrayValidator(opts); },
	object: 		function(opts){ return new ObjectValidator(opts); },
	option: 		function(opts){ return new OptionValidator(opts); },
	multioption: 	function(opts){ return new MultiOptionValidator(opts); },
	data: 	 		function(opts){ return new DataValidator(opts); },
	link: 	 		function(opts, apiClient){ return new LinkValidator(opts, apiClient); },
	multilink: 	 	function(opts, apiClient){ return new MultiLinkValidator(opts, apiClient); },
	ipv4: 	 		function(opts){ return new IPv4Validator(opts); },
	ipv4mask: 	 	function(opts){ return new IPv4MaskValidator(opts); }

};