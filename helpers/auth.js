/* jshint node: true */
/* jshint esnext: true */
"use strict";
const request = require("request");
const moment = require("moment");
class Auth {
	initAuth(callback) {
		console.log("in init");
		global.fetchingToken = true;
		this.authenticate((error, response) => {
			let errMsg = null;
			if (error) {
				global.logger.error(error);
				errMsg = "search engine authentication failed";
			} else {
				console.log(
					moment.utc().format("YYYY-MM-DDTHH:mm:ss") + " TOKEN :",
					response
				);
				global.tokendata = response;
			}
			global.fetchingToken = false;
			if (callback !== undefined && typeof callback === "function") {
				callback(errMsg, response);
			} else {
				return errMsg;
			}
		});
	}

	refresh(callback) {
		console.log("test");
		if (global.fetchingToken) {
			let myTimer = setInterval(function() {
				if (!global.fetchingToken) {
					clearInterval(myTimer);
					if (callback !== undefined && typeof callback === "function") {
						return callback(null);
					} else {
						return false;
					}
				}
			}, 10);
			return;
		}
		global.fetchingToken = true;
		this.refreshToken((error, response) => {
			if (error) {
				global.logger.error(error);
				return this.initAuth(callback);
			}
			console.log(
				moment.utc().format("YYYY-MM-DDTHH:mm:ss") +
					" TOKEN REFRESH SUCCESS : ",
				response
			);
			global.tokendata = response;
			global.fetchingToken = false;
			if (callback !== undefined && typeof callback === "function") {
				callback(null, response);
			} else {
				return response;
			}
		});
	}

	authenticate(callback) {
		let errMsg = null;
		global.tokenDataError = null;
		request.post(
			{
				url: global.config.authUrl + "/oauth/token",
				form: global.config.credentials,
				contentType: "application/x-www-form-urlencoded"
			},
			function(error, response, responseBody) {
				let body;
				try {
					body = !!responseBody ? JSON.parse(responseBody) : null;
				} catch (e) {
					errMsg =
						"Error parsing response body returned from search engine during fetching access token";
					global.logger.error(
						`Error UUID=${
							this.uuid
						} ${errMsg}, Response=${responseBody}, StatusCode=${
							response.statusCode
						}, Error=${e}, StackTrace=${e.stack}`
					);
					body = null;
				}
				if (!response || response.statusCode !== 200 || !body) {
					global.tokenDataError = !errMsg
						? "Error fetching token from search engine"
						: errMsg;
					return callback(
						global.tokenDataError +
							", Request=" +
							JSON.stringify({
								url: global.config.authUrl + "/oauth/token",
								form: global.config.credentials,
								contentType: "application/x-www-form-urlencoded"
							}) +
							", StatusCode=" +
							(response ? response.statusCode : "undefined") +
							", Response=" +
							responseBody
					);
				}
				callback(null, body);
			}
		);
	}

	refreshToken(callback) {
		let errMsg = null;
		global.tokenDataError = null;
		request.post(
			{
				url: global.config.authUrl + "/oauth/token",
				form: {
					client_id: "aoservercoreapp",
					client_secret: "my-secret-token-to-change-in-production",
					grant_type: "refresh_token",
					refresh_token: global.tokendata.refresh_token
				},
				contentType: "application/x-www-form-urlencoded"
			},
			function(error, response, responseBody) {
				let body;
				try {
					body = !!responseBody ? JSON.parse(responseBody) : null;
				} catch (e) {
					errMsg =
						"Error parsing response body returned from search engine during fetching refresh token";
					global.logger.error(
						`Error ${errMsg}, Response=${responseBody}, StatusCode=${
							response.statusCode
						}, Error=${e}, StackTrace=${e.stack}`
					);
					body = null;
				}
				if (!response || response.statusCode !== 200 || !body) {
					global.tokenDataError = !errMsg
						? "Error fetching refresh token from search engine"
						: errMsg;
					return callback(
						global.tokenDataError +
							" Request=" +
							JSON.stringify({
								url: global.config.authUrl + "/oauth/token",
								form: {
									client_id: "aoservercoreapp",
									client_secret: "my-secret-token-to-change-in-production",
									grant_type: "refresh_token",
									refresh_token: global.tokendata.refresh_token
								},
								contentType: "application/x-www-form-urlencoded"
							}) +
							", StatusCode=" +
							(response ? response.statusCode : "undefined") +
							", Response=" +
							responseBody
					);
				}
				callback(null, body);
			}
		);
	}
}

module.exports = Auth;
