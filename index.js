/* jslint node: true */
"use strict";
var express = require('express'),
  bodyParser = require('body-parser'),
  http = require('http'),
  app = express(),
  session = require('express-session')({
    secret: "MoveFromHereOrTheSecretWillBeOnGit",
    resave: true,
    saveUninitialized: true
  }),
  sharedsession = require('express-socket.io-session'),
  port = 8080;

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(session);

var httpServer = http.Server(app);


var io = require('socket.io').listen(httpServer);
io.use(sharedsession(session));


var mongoose = require('mongoose');
var database = require("./model/model.js"); // databas stuff

mongoose.connect('mongodb://localhost/queueBase');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("db open!");
});

//===============================================================
// Setting up schemas and lists for the program

var User = database.user;
var Admin = database.admin;
var Queue = database.queue;
var Statistic = database.statistic;

//---

var queueSystem = require('./model/queueSystem.js');
var adminList = queueSystem.adminList;
var statisticsList = queueSystem.statisticsList;
var validate = queueSystem.validate;
var validateSuper = queueSystem.validateSuper;
var validateTeacher = queueSystem.validateTeacher;
var validateAssistant = queueSystem.validateAssistant;

var router = require('./routes.js');
app.use('/API',router);

//===============================================================
// 


function doOnQueue(queueName, action) {
  var queue = queueSystem.findQueue(queueName);
  queue[action]();
  console.log('trying to ' + action + ' ' + queueName);
  io.to(queueName).emit(action);
  io.to("lobby").emit("lobby" + action, queueName);

  if (action === 'hibernate') {
    io.to("admin").emit('hibernate', queueName);
  } else if (action === 'unhibernate') {
    io.to("admin").emit('unhibernate', queueName);
  }
}


// the average time in 'queue' of students who joined the queue 
//  from 'start' and left before/was still in queue at 'end'
function getAverageQueueTime(queueName, start, end) {
  var queue = queueSystem.findQueue(queueName);
  var queue = queue.queue;

  var counter = 0;
  var totalTime = 0;
  var now = Date.now();

  for (var i = queue.length - 1; i >= 0; i--) {
    var user = queue[i];
    if (user.startTime >= start && user.startTime < end) {
      var d = new Date(user.startTime);
      console.log("User " + user.name + " started at " + d);

      totalTime += now - user.startTime;
      counter++;
    }
  };

  console.log("Counted: " + counter);
  console.log("Total time: " + totalTime);
  console.log("Average: " + totalTime / counter)
  return totalTime / counter;
}

// number of people who joined the queue from 'start' and left before 'end'
function numbersOfPeopleLeftQueue(queueName, start, end) {
  var counter = 0;

  for (var i = statisticsList.length - 1; i >= 0; i--) {
    var statistic = statisticsList[i];

    if (statistic.queue === queueName && statistic.startTime >= start &&
      statistic.startTime < end &&
      statistic.leftQueue &&
      statistic.startTime + statistic.queueLength < end) {
      counter++;
    }
  };

  return counter;
}




io.on('connection', function(socket) {
  console.log("connected");
  // Setup the ready route, join room and emit to room.
  socket.on('listen', function(req) {
    console.log('a user added to ' + req);
    socket.join(req);
  });

  socket.on('stopListening', function(req) {
    console.log('a user left ' + req);
    socket.leave(req);
  });

  // user joins queue
  socket.on('join', function(req) {
    var queue = req.queue;
    var user = req.user;
    console.log('a user joined to ' + queue);
    io.to(queue).emit('join', user);
    io.to("lobby").emit('lobbyjoin', {
      queueName: queue,
      username: user.name
    });

    var queue = queueSystem.findQueue(queue);
    var newUser = new User({
      name: user.name,
      place: user.place,
      comment: user.comment
    });
    queue.addUser(newUser);

    var newStatistic = new Statistic({
      name: newUser.name,
      queue: queue,
      startTime: newUser.startTime,
      action: ''
    });
    statisticsList.push(newStatistic);
    newStatistic.save();
  });

  // user tries to join a queue with a "bad location"
  //  - do nothing in backend?
  socket.on('badLocation', function(req) {
    var username = req.session.user.name;
    var name = req.name;
    var queueName = req.queue;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for badLocation failed");
      //res.end();
      return;
    }

    io.to(queueName).emit('badLocation', {name: name, sender: username}); 
    console.log("Bad location at " + queueName + " for " + name);
  });

  // user gets updated
  socket.on('update', function(req) {
    var queue = req.queue;
    var user = req.user;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"

    console.log('a was updated in ' + queue);
    io.to(queue).emit('update', user);

    var queue = queueSystem.findQueue(queue);
    queue.updateUser(user.name, user);
  });

  // admin helps a user (marked in the queue)
  socket.on('help', function(req) {
    var queueName = req.queue;
    var name = req.name;
    var username = req.helper;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for help failed");
      //res.end();
      return;
    }

    io.to(queueName).emit('help', {
      name: name,
      helper: username
    });
    console.log(name + ' is getting help in ' + queueName);
  });

  // teacher/assistant messages a user
  socket.on('messageUser', function(req) {
    var queue = req.queue;
    var name = req.name;
    var message = req.message;
    var sender = req.sender;

    io.to("user_" + name).emit('msg', {
      message: message,
      sender: sender
    }); // 
    console.log('user ' + name + ' was messaged from ' + sender + ' at ' + queue + ' with: ' + message);
  });

  // teacher/assistant emits to all users (teacher/assistant included)
  socket.on('broadcast', function(req) {
    var queueName = req.queue;
    var message = req.message;
    var username = req.sender;

    // teacher/assistant-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for emit failed");
      //res.end();
      return;
    }

    io.to(queueName).emit('msg', {
      message: message,
      sender: username
    });
    console.log('emit in ' + queueName + ', msg: ' + message);
  });

  // teacher/assistant emits to all teacher/assistant
  socket.on('emitTA', function(req) {
    var queueName = req.queue;
    var message = req.message;
    var username = req.sender;

    // teacher/assistant-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for emitTA failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    var teacherList = queue.teacher;
    var assistantList = queue.assistant;

    for (var i = teacherList.length - 1; i >= 0; i--) {
      var teacher = teacherList[i];
      io.to("user_" + teacher.name).emit('msg', {
        message: message,
        sender: username
      });
      console.log("emiting teacher: " + "user_" + teacher.name);
    };

    for (var i = assistantList.length - 1; i >= 0; i--) {
      var assistant = assistantList[i];
      io.to("user_" + assistant.name).emit('msg', {
        message: message,
        sender: username
      });
      console.log("emiting assistant: " + assistant.name);
    };

    //  io.to(queueName).emit('msg', {message: message, sender: username});
    console.log('emitTA in ' + queueName + ', msg: ' + message);
  });

  // user leaves queue
  socket.on('leave', function(req) {
    var queueName = req.queue;
    var user = req.user;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"
    console.log("Validerande: " + JSON.stringify(socket.handshake.session.user));

    var queue = queueSystem.findQueue(queueName);
    queue.removeUser(user.name);

    for (var i = statisticsList.length - 1; i >= 0; i--) {
      var statistic = statisticsList[i];
      if (statistic.name === user.name) {
        var queueLength = Date.now() - statistic.startTime;
        var newStatistic = new Statistic({
          name: statistic.name,
          queue: statistic.queue,
          startTime: statistic.startTime,
          action: '',
          leftQueue: true,
          queueLength: queueLength
        });
        statisticsList.splice(i, 1, newStatistic);
        newStatistic.save();
      }
    };


    //  var newUserStatistic = new UserStatistic({student: user.name, queue: queue, action: '?'});
    //  newUserStatistic.save();

    console.log('a user left ' + queueName);
    io.to(queueName).emit('leave', user);
    io.to("lobby").emit('lobbyleave', {
      queueName: queueName,
      username: user.name
    });
  });

  // admin purges a queue
  socket.on('purge', function(req) {
    console.log("called purge:");
    console.log(socket.handshake.session.user);

    var queueName = req.queue;
    var username = socket.handshake.session.user.name;
    // socket.handshake.session.user = "troll";

    // admin/teacher/assistant-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for purge failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    queue.purgeQueue();
    queue.queue = [];

    console.log(req.queue + ' -list purged by ' + username);
    io.to(queueName).emit('purge');
    io.to("lobby").emit('lobbypurge', queueName);
  });

  //===============================================================


  // admin locks a queue
  socket.on('lock', function(req) {
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for lock failed");
      //res.end();
      return;
    }

    doOnQueue(queueName, 'lock');
  });

  // admin unlocks a queue
  socket.on('unlock', function(req) {
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName) || validate(username, "assistant", queueName))) {
      console.log("validation for unlock failed");
      //res.end();
      return;
    }

    doOnQueue(queueName, 'unlock');
  });

  socket.on('hibernate', function(req) {
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("Current user " + username + " is not a teacher for that queue or an admin.");
      //console.log("validation for hibernate failed");
      //res.end();
      return;
    }

    doOnQueue(req.queue, 'hibernate');
  });

  socket.on('unhibernate', function(req) {
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for unhibernate failed");
      //res.end();
      return;
    }

    doOnQueue(req.queue, 'unhibernate');
  });

  //===============================================================

  socket.on('getAverageQueueTime', function(req) {
    var queueName = req.queueName;
    var start = req.start;
    var end = req.end;

    console.log("Counting..");

    var averageQueueTime = getAverageQueueTime(queueName, start, end);

    io.to('statistics').emit('getAverageQueueTime', averageQueueTime);
  });


  socket.on('numbersOfPeopleLeftQueue', function(req) {
    var queueName = req.queueName;
    var start = req.start;
    var end = req.end;

    console.log("Bounty hunting..");

    var numbersOfPeopleLeft = numbersOfPeopleLeftQueue(queueName, start, end);

    io.to('statistics').emit('numbersOfPeopleLeftQueue', numbersOfPeopleLeft);
  });


  //===============================================================

  //
  socket.on('addQueue', function(req) {
    console.log("Trying to add Queue!");
    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for addQueue failed");
      //res.end();
      return;
    }
    var queueName = req.queueName;

    var newQueue = queueSystem.addQueue(queueName);

    io.to('admin').emit('addQueue', newQueue);
  });

  //
  socket.on('removeQueue', function(req) {
    console.log("Trying to remove Queue!");
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for removeQueue failed");
      //res.end();
      return;
    }

    queueSystem.removeQueue(queueName);

    console.log(queueName + ' is getting removed from queues');

    io.to('admin').emit('removeQueue', queueName);
  });

  //
  socket.on('addAdmin', function(req) {
    console.log("Trying to add Admin!");
    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for addAdmin failed");
      //res.end();
      return;
    }

    var username = req.username;
    var adminName = username;

    var newAdmin = new Admin({
      name: adminName,
      username: username
    });
    adminList.push(newAdmin);
    newAdmin.save();

    console.log(adminName + ' is a new admin!');
    io.to('admin').emit('addAdmin', {
      name: adminName,
      username: username,
      addedBy: ''
    });
  });

  //
  socket.on('addTeacher', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addTeacher failed");
      //res.end();
      return;
    }

    var username = req.username;
    var teacherName = username;
    var queue = queueSystem.findQueue(queueName);

    var newTeacher = new Admin({
      name: teacherName,
      username: username
    });

    queue.addTeacher(newTeacher);

    console.log(teacherName + ' is a new teacher!');
    io.to('admin').emit('addTeacher', {
      name: teacherName,
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('addAssistant', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var assistantName = username;
    var queue = queueSystem.findQueue(queueName);

    var newAssistant = new Admin({
      name: assistantName,
      username: username
    });

    queue.addAssistant(newAssistant);

    console.log(assistantName + ' is a new assistant!');
    io.to('admin').emit('addAssistant', {
      name: assistantName,
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('removeAdmin', function(req) {
    console.log("Trying to remove Admin!");

    var username = socket.handshake.session.user.name;

    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for removeAdmin failed");
      //res.end();
      return;
    }

    var username = req.username;

    for (var i = adminList.length - 1; i >= 0; i--) {
      var admin = adminList[i];
      if (admin.username === username) {
        adminList.splice(i, 1);
        admin.remove();
        break;
      }
    };

    console.log(username + ' is a removed from admin!');
    io.to('admin').emit('removeAdmin', username);
  });

  //
  socket.on('removeTeacher', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var queue = queueSystem.findQueue(queueName);

    queue.removeTeacher(username);

    console.log(username + ' is a removed as a teacher in ' + queueName + '!');
    io.to('admin').emit('removeTeacher', {
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('removeAssistant', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var queue = queueSystem.findQueue(queueName);

    queue.removeAssistant(username);

    console.log(username + ' is a removed as a assistant in ' + queueName + '!');
    io.to('admin').emit('removeAssistant', {
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('flag', function(req) {
    var username = req.name;
    var queueName = req.queue;
    var sender = req.sender;
    var message = req.message;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", queueName) || validate(sender, "assistant", queueName))) {
      console.log("validation for flag failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    queue.addAssistantComment(username, sender, queueName, message);

    console.log('flagged');
    io.to(queueName).emit('flag', {
      name: username,
      message: message
    });
  });

  // TODO : This has been changed to only have them join a room based on their ID, no more session interaction
  socket.on('setUser', function(req) {
    socket.join("user_" + req.name); // joina sitt eget rum, för privata meddelande etc
    socket.handshake.session.user = req;
    console.log('Socket-setUser: ' + JSON.stringify(req));
    console.log('session is: ' + JSON.stringify(socket.handshake.session.user));
  });
});

httpServer.listen(port, function() {
  console.log("server listening on port", port);
});