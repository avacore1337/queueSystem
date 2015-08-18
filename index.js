/* jslint node: true */
"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var expressSession = require('express-session');
var MongoStore = require('connect-mongo')(expressSession);
var sharedsession = require('express-socket.io-session');
var port = 8080;
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/queueBase');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
var session = expressSession({
    secret: "MoveFromHereOrTheSecretWillBeOnGit",
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({mongooseConnection: mongoose.connection})
  });
app.use(session);


var httpServer = http.Server(app);
var io = require('socket.io').listen(httpServer);
io.use(sharedsession(session));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("db open!");
});

var router = require('./routes/httpRoutes.js');
app.use('/API', router);
var socketRoutes = require('./routes/socket.js');
var adminRoutes = require('./routes/admin.js');
var assistantsRoutes = require('./routes/assistant.js');

io.on('connection', function (socket) {
  socketRoutes(socket, io);
  adminRoutes(socket, io);
  assistantsRoutes(socket, io);
});

var queueSystem = require('./model/queueSystem.js');
var utils = require('./utils.js');
var scheduleForEveryNight = utils.scheduleForEveryNight;
scheduleForEveryNight(function () {
  queueSystem.forQueue(function (queue) {
    queue.purgeQueue();
    queue.setMOTD("");
    queue.clearAssistantComments();
    queue.clearCompletions();
    //queue.purgeBookings();
  })
  //queueSystem.updateAllBookings();
});

httpServer.listen(port, function () {
  console.log("server listening on port", port);
});