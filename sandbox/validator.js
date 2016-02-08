var ApiClient = require("../lib/client.js");
var Endpoints = require("../lib/endpoints");
var Validator = require("../lib/validator.js");

//MOCKUP API CLIENT
var client = new ApiClient();
client.endpoint("test", Endpoints.Test.$);

client.call = function(service, endpoint, method, params){

	return client.handleCall(endpoint, method, params);

};

//VALIDATOR
var val = new Validator.Validator({
	
	"text": Validator.text({
		label: "Text field",
		minLength: 3,
		maxLength: 5,
		required: true,
		empty: true,
		pattern: "^[a-z]*$"
	}),

	"email": Validator.email({
		label: "E-mail field"
	}),

	"number": Validator.number({
		label: "Numeric field",
		min: -1.27,
		max: 1.27,
		required: true,
		float: true
	}),

	"bool": Validator.boolean({
		label: "Boolean field",
		required: true
	}),

	"date": Validator.date({
		label: "Date field",
		description: "ISO date."
	}),

	"datetime": Validator.datetime({
		label: "Date and time field",
		required: true
	}),

	"time": Validator.time({
		label: "Only time field",
		required: true
	}),

	"array": Validator.array({
		label: "Array field",
		required: true
	}),

	"object": Validator.object({
		label: "Object field",
		description: "With sub validator",
		required: true,
		properties: {
			"email": Validator.email()
		}
	}),

	"option": Validator.option({
		label: "Choose one",
		required: true,
		options: [ "hello", "world" ]
	}),

	"multioption": Validator.multioption({
		label: "Choose many",
		required: true,
		options: [ "hello", "world", "api" ],
		empty: false
	}),

	"dataRaw": Validator.data({
		label: "Raw data",
		required: true
	}),

	"dataBase": Validator.data({
		label: "Base64 data",
		required: true,
		format: "base64"
	}),

	"dataJson": Validator.data({
		label: "JSON data",
		required: false,
		format: "json"
	}),

	"link": Validator.link({
		label: "API link",
		required: true,
		pattern: "local\:\/\/.*"
	}, client),

	"multilink": Validator.multilink({
		label: "API multiple links",
		required: false,
		pattern: "local\:\/\/.*",
		empty: false
	}, client)

});

console.log("VALIDATOR");
console.dir(val, { colors: true, depth: null });

//TEST
console.log("TESTING");

val.validate({
	
	text: "xxxx",
	email: "me@domain.tld",
	number: 1.1,
	bool: true,
	date: "2016-01-12",
	datetime: "2016-02-08T09:52:15+01:00",
	time: "15:24:00",
	array: [1, 2],
	object: { name: "John Doe", email: "john@doe" },
	option: "hello",
	multioption: [ "hello", "api" ],
	dataRaw: "Whatever I want!",
	dataBase: new Buffer("Hello World!").toString('base64'),
	dataJson: '{ "hello": "world" }',
	link: "local://test",
	multilink: [ "local://test", "local://" ]

}).then(function(res){
	console.log("OK", res);
}, function(err){
	console.log("ERR", err, err.stack);
});