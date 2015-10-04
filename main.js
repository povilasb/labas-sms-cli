#!/usr/bin/nodejs

var request = require('request');
var cookie = require('cookie');
var Xray = require('x-ray');
var xray = Xray();

var program = require('commander')


var baseUrl = 'https://mano.labas.lt';
var createSessionUrl = baseUrl + '/prisijungti';
var loginUrl = baseUrl + '/prisijungimo_patikrinimas';
var sendSmsUrl = baseUrl + '/';
var smsPageUrl = baseUrl + '/#dashboard-service-sms';

var phoneBook = require(process.env.HOME + '/.sms/phonebook');
var config = require(process.env.HOME + '/.sms/config');

var username = config['username'];
var password = config['password'];
var sendTo = '+37012345678';
var message = '';


/**
 * Program entry point.
 */
function main() {
	program.version('0.1.0')
		.usage('<phone number> <sms text>')
		.parse(process.argv);

	if (!cliArgsValid(program.args)) {
		program.outputHelp();
		exitWithError('Invalid CLI arguments.');
	}

	sendTo = program.args[0];
	message = program.args[1];

	if (phoneBookHasRecord(sendTo)) {
		sendTo = phoneBook[sendTo];
	}

	console.log('SMS to:', sendTo);

	initiateSession(function(sessionId) {
		login(sessionId, findSecurityToken, function (error) {
			console.log('Failed to login: ', error);
		});
	});
}

function phoneBookHasRecord(record) {
	return typeof phoneBook[record] !== 'undefined';
}

function exitWithError(errorMsg) {
	console.log(errorMsg);
	process.exit(1);
}

function cliArgsValid(args) {
	return args.length == 2;
}

function getCookieHeaders(headers) {
	return headers['set-cookie'];
}

function getCookie(cookieHeaders, cookieName) {
	var resultCookie = null;

	cookieHeaders.forEach(function(header) {
		var cookies = cookie.parse(header);
		if (cookies[cookieName] != undefined) {
			resultCookie = cookies[cookieName];
			return;
		}
	});

	return resultCookie;
}

function initiateSession(onSuccess) {
	request.get(createSessionUrl, function (error, response, body) {
		var sessionId = getCookie(getCookieHeaders(response.headers),
			'scml');
		if (onSuccess != null) {
			onSuccess(sessionId);
		}
	});
}

function login(sessionId, onSuccess, onError) {
	var headers = {
		Cookie: 'isUserLoggedIn=false; scml=' + sessionId,
		Referrer: createSessionUrl,
		'Content-Type': 'application/x-www-form-urlencoded',
	}

	request({
		uri: loginUrl,
		followRedirect: false,
		method: 'POST',
		headers: headers,
		form: {
			_username: username,
			_password: password,
		},
	}, function(error, response, body) {
		var cookieHeaders = getCookieHeaders(response.headers);
		var sessionId = getCookie(cookieHeaders, 'scml');
		var loginStatus = getCookie(cookieHeaders, 'isUserLoggedIn');

		var loggedIn = loginStatus == 'true' ? true : false;
		if (loggedIn) {
			onSuccess(sessionId);
		} else {
			onError(error);
		}
	});
}

function sendSms(sessionId, phoneNr, message, securityToken) {
	var headers = {
		Cookie: 'isUserLoggedIn=true; scml=' + sessionId,
	}

	request({
		uri: sendSmsUrl,
		followRedirect: false,
		method: 'POST',
		headers: headers,
		form: {
			'sms_submit[recipientNumber]': phoneNr,
			'sms_submit[textMessage]': message,
			'sms_submit[_token]': securityToken,
		}
	}, function(error, response, body) {
		if (response.statusCode == 200) {
			console.log('SMS successfully sent.');
		} else {
			console.log('Failed to send SMS.');
		}
	});
}

function findSecurityToken(sessionId) {
	var headers = {
		Cookie: 'isUserLoggedIn=true; scml=' + sessionId,
	}

	request({
		uri: smsPageUrl,
		followRedirect: false,
		method: 'GET',
		headers: headers
	}, function(error, response, body) {
		xray(body, '#sms_submit__token@value')(function(err, token) {
			sendSms(sessionId, sendTo, message, token);
		});
	});
}

main();
