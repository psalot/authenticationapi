var express = require("express"),
	fs = require("fs"),
	bodyParser = require("body-parser"),
	path = require("path"),
	morgan = require("morgan"),
	helmet = require("helmet"),
	compression = require("compression"),
	moment = require("moment"),
	winston = require("winston"),
	os = require("os");

var app = express();

if (global.fetchingToken === undefined) {
	global.fetchingToken = false;
}

// global.async = require('async');
global.config = require("./config/appConfig");
console.log("SERVER CONFIG : ", global.config);
/**
 * Specify a single subnet for trusted proxy.
 **/
app.set("trust proxy", "loopback");

/**
 * Protects the application from some well known web vulnerabilities by setting HTTP headers appropriately.
 **/
app.use(helmet());

/**
 * Decrease the size of the response body to increase the speed of a web application.
 **/
app.use(compression());

/**
 * CORS middleware
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
let allowCrossDomain = function(req, res, next) {
	var allowOrigin = req.headers.origin || "*";
	res.header("Access-Control-Allow-Origin", allowOrigin);
	res.header("Access-Control-Allow-Credentials", true);
	res.header(
		"Access-Control-Allow-Headers",
		"X-Requested-With, Content-Type, Authentication, x-access-token"
	);
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
	res.header("Cache-Control", "no-cache, no-store, must-revalidate");
	res.header("Pragma", "no-cache");
	if (req.method === "OPTIONS") {
		res.status(200).send();
	} else {
		next();
	}
};
app.use(allowCrossDomain);

/**
 * Create Log folder if not exists
 */

let logFolder = `/logs/${os.hostname()}`;
if (!fs.existsSync(logFolder)) {
	try {
		fs.mkdirSync(logFolder);
	} catch (e) {
		throw new Error(
			`Error creating log folder ${logFolder} - ${JSON.stringify(e)}`
		);
	}
}

/**
 * Create access log stream.
 **/
const accessLogStream = fs.createWriteStream(`${logFolder}/access.log`, {
	flags: "a"
});
/**
 * Initialize access log writer.
 **/
global.logger = new winston.Logger({
	transports: [
		new winston.transports.File({
			timestamp: function() {
				return moment.utc().format("YYYY-MM-DDTHH:mm:ss");
			},
			formatter: function(options) {
				return (
					options.timestamp() +
					" " +
					options.level.toUpperCase() +
					" " +
					(undefined !== options.message ? options.message : "") +
					(options.meta && Object.keys(options.meta).length
						? "\n\t" + JSON.stringify(options.meta)
						: "")
				);
			},
			colorize: true,
			name: "access-file",
			stream: accessLogStream,
			handleExceptions: true,
			humanReadableUnhandledException: true,
			json: false
		})
	],
	exitOnError: false
});

/**
 * Create server log stream.
 **/
var serverLogStream = fs.createWriteStream(`${logFolder}/server.log`, {
	flags: "a"
});

/**
 * Define server log date format.
 **/
morgan.token("date", function(req, res) {
	return moment.utc().format("YYYY-MM-DDTHH:mm:ss");
});

/**
 * Define server log request headers to be written.
 **/
morgan.token("type", function(req, res) {
	return JSON.stringify(req.headers);
});

/**
 * Define server log UUID to be written.
 **/
morgan.token("uuid", function(req, res) {
	return "UUID=" + res._headers["x-request-id"];
});

/**
 * Initialize server log writer.
 **/
app.use(
	morgan(
		':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" \':type\' :uuid - :response-time ms',
		{
			stream: serverLogStream
		}
	)
);

/**************************************/
// var options = {
// 	swaggerDefinition: {
// 		info: {
// 			title: "search engine", // Title (required)
// 			version: "1.0.0" // Version (required)
// 		}
// 	},
// 	apis: ["./controllers/*.js", "./api-docs/dist/parameters.yaml"] // Path to the API docs
// // };
// app.use("/apidocs", express.static(path.join(__dirname, "/api-docs/dist")));
// var swaggerSpec = swaggerJSDoc(options);
// app.get("/swagger.json", function(req, res) {
// 	res.setHeader("Content-Type", "application/json");
// 	res.send(swaggerSpec);
// });
/*************************************/

/**
 * Configure body parser
 */
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
app.use(bodyParser.json());

/**
 * Auto authenticate to the thir dparty api server
 */
const Auth = require("./helpers/auth");
const auth = new Auth();
auth.initAuth();

/**
 * Auto schedule for refresh token
 */
const Cronjob = require("./services/cronjob");
const cron = new Cronjob();
cron.init();

/**
 * ROUTES FOR OUR API
 * get an instance of the express Router
 */
let router = express.Router();

/*
|--------------------------------------------
| Register all Controller
|--------------------------------------------
*/
app.use("/", require("./controllers"));

/**
 * Default handler for invalid API endpoint.
 **/
app.all("*", function(req, res) {
	res.status(global.config.default_error_http_code).json({
		responseCode: global.config.default_error_code,
		responseDesc: global.config.default_error_request_message
	});
});

/**
 * Default handler for uncaught exception error.
 **/
app.use(function(err, req, res, next) {
	global.logger.warn(
		"UUID=" + res._headers["x-request-id"],
		"UncaughtException is encountered",
		"Error=" + err,
		"Stacktrace=" + err.stack
	);
	if (res.headersSent) {
		return next(err);
	}
	res.status(global.config.default_error_http_code).json({
		responseCode: global.config.default_error_code,
		responseDesc: global.config.default_error_request_message
	});
});

/**
 * Server setup
 */
let port = process.env.PORT || config.server.port || 3000;
let server = app.listen(port, function() {
	console.log(
		"Server running on port:" + port + " Link: http://localhost:" + port
	);
});
