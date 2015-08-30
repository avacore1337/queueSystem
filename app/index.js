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
var request = require('request');
var dns = require('dns');

mongoose.connect('mongodb://localhost/queueBase');

app.use(express.static(__dirname + '/../public'));
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

function getHostname(ip, callback) {
  try {
    if (ip.indexOf("::ffff:") > -1) {
      ip = ip.substring(7);
    }

    dns.reverse(ip, function (err, hostnames) {
      if (err || !hostnames || !hostnames[0]) {
        callback("");
      } else{
        callback(hostnames[0]);
      }
    });
  } catch (err) {
    callback("");
  }
}

function getLocation (ip, callback) {
  getHostname(ip, function (hostname) {
    console.log("hostname = " + hostname);
    var pattern = /(\.kth\.se)/g;
    var result = hostname.match(pattern);
    if (result) {
      var location = hostname.split(".")[0].replace("-", " ").toLowerCase();
      console.log("local location-variable = " + location);
      // Test if they are at a recognized school computer
      // Recognized computers are:
      // E-house floor 4 : Blue, Red, Orange, Yellow, Green, Brown
      // E-house floor 5 : Grey, Karmosin, White, Magenta, Violett, Turkos
      // D-house floor 5 : Spel, Sport, Musik, Konst, Mat
      pattern = /(blue|red|orange|yellow|green|brown|grey|karmosin|white|magenta|violett|turkos|spel|sport|musik|konst|mat)/g;
      result = location.match(pattern);
      if (result) {
        console.log("local location-variable = " + location);
        if (result == "mat") { // Do not add a third equal sign. (Result does not appear to be a string)
          location = location.replace("mat", "mat ");
        }
        callback(location);
      }
      else{
        callback("");
      }
    }
  });
}

function getUID (ticket, callback) {
  var url = 'https://login.kth.se/serviceValidate?ticket='+ ticket  + '&service=http://queue.csc.kth.se/auth';
  request({ url: url}, function (err, response, body) {
    if (err) {
      console.log(err);
    }
    else{
      var uid = "";
      // console.log("statusCode:");
      // console.log(response.statusCode);
      // console.log(body);
      var uidMatches = body.match(/u1[\d|\w]+/g);
      if (uidMatches) {
        uid = uidMatches[0];
      }
      else{
        console.log("no match found");
      }
      callback(uid);
    }
  });
}

app.get('/auth', function(req, res) {
  console.log('printing ticket data:');
  console.log(req.query.ticket);
  getUID(req.query.ticket, function (uid) {
    console.log("uid:");
    console.log(uid);
    req.session.user.name = uid;
    res.redirect('/#' + req.session.user.loginTarget)
  });
});

app.post('/API/setUser', function (req, res) {
  req.session.user = req.body;
  req.session.user.name = 'guest-' + req.session.user.name;
  req.session.user.location = "";

  var ip = req.connection.remoteAddress;
  
  getLocation(ip, function (location) {
    req.session.user.location = location;
    console.log("Is this happening before ?");
    res.writeHead(200);
    res.end();
  });
});

app.get('/login', function(req, res) {
  console.log(req.query);
  req.session.user = {};
  if (req.query.target) {
    req.session.user.loginTarget = req.query.target;
  }
  else{
    req.session.user.loginTarget = ""
  }  
  res.redirect('https://login.kth.se/login?service=http://queue.csc.kth.se/auth');
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('https://login.kth.se/logout');
});

httpServer.listen(port, function () {
  console.log("server listening on port", port);
});