/* jshint node: true */
/* jshint esnext: true */
"use strict";

const envConfig = require("../secrets/envConfig");
envConfig.environmentName = "development";
var config = {
	credentials: envConfig[envConfig.environmentName].authService.credentials,
	authUrl: envConfig[envConfig.environmentName].authService.authUrl,
	server: {
		port: 8002
	},
	default_error_http_code: 200,
	default_error_code: 1,
	default_success_code: 0,
	default_error_message: "Invalid token",
	default_error_request_message: "Error encountered processing the request",
	default_success_message: "Successfully processed the request",
	retryTokenCounter: 3
};

module.exports = config;
