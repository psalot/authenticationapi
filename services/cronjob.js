/* jshint node: true */
/* jshint esnext: true */
"use strict";
const CronJob = require("cron").CronJob;
var Auth = require("../helpers/auth");
class Cronjob {
	init() {
		let auth = new Auth();
		let cron = new CronJob({
			cronTime: " */1 * * * *",
			onTick: function() {
				auth.refresh();
			},
			start: false,
			timeZone: "Asia/Kolkata"
		});
		cron.start();
		console.log("job1 status", cron.running);
	}
}

module.exports = Cronjob;
