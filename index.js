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
var Course = database.course;
var Statistic = database.statistic;

//---

var queueSystem = require('./model/queueSystem.js');
var adminList = queueSystem.adminList;
var statisticsList = queueSystem.statisticsList;

//===============================================================
// Methods for setting up or reading in the database (in production, only readIn should be used)


//===============================================================
// 

// return the course with the name "name"
function findCourse(name) {
  for (var i = 0; i < queueSystem.courseList.length; i++) {
    if (queueSystem.courseList[i].name === name) {
      return queueSystem.courseList[i];
    }
  }
}

// validates if a person is the privilege-type given for given course
// TODO: make the validation more secure
function validate(name, type, course) {
  if (type === "super") {
    return validateSuper(name);
  } else if (type === "teacher") {
    return validateTeacher(name, course);
  } else if (type === "assistant") {
    return validateAssistant(name, course);
  };

  console.log("that privilege-type is not defined"); // temporary for error-solving
  return false;
}

function validateSuper(name) {
  for (var i = 0; i < adminList.length; i++) {
    console.log("admin: " + adminList[i].name + " vs " + name);
    if (adminList[i].name === name) {
      console.log(name + ' is a valid super-admin'); // temporary for error-solving
      return true;
    }
  }
}

function validateTeacher(username, courseName) {
  var teacherList = teacherForCourses(username);

  for (var i = 0; i < teacherList.length; i++) {
    if (teacherList[i] === courseName) {
      console.log(username + ' is a valid teacher'); // temporary for error-solving
      return true;
    }
  }
}

function validateAssistant(username, courseName) {
  var assistantList = assistantForCourses(username);

  for (var i = 0; i < assistantList.length; i++) {
    if (assistantList[i] === courseName) {
      console.log(username + ' is a valid assistant'); // temporary for error-solving
      return true;
    }
  }
}

// list of courses that a user is admin, teacher or TA for
// TODO: make the list containing a field which says which kind of privilege-type the person has
// DEPREMERAD (DEPRECATED)
function privilegeList(name) {
  var list = [];
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      var obj = {
        "name": adminList[i].name,
        "course": "",
        "type": "admin"
      };
      list.push(obj);
    }
  }

  return list;
}


function doOnCourse(courseName, action) {
  var course = findCourse(courseName);
  course[action]();
  console.log('trying to ' + action + ' ' + courseName);
  io.to(courseName).emit(action);
  io.to("lobby").emit("lobby" + action, courseName);

  if (action === 'hibernate') {
    io.to("admin").emit('hibernate', courseName);
  } else if (action === 'unhibernate') {
    io.to("admin").emit('unhibernate', courseName);
  }
}


// the average time in 'queue' of students who joined the queue 
//  from 'start' and left before/was still in queue at 'end'
function getAverageQueueTime(queueName, start, end) {
  var course = findCourse(queueName);
  var queue = course.queue;

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

    if (statistic.course === queueName && statistic.startTime >= start &&
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

    var course = findCourse(queue);
    var newUser = new User({
      name: user.name,
      place: user.place,
      comment: user.comment
    });
    course.addUser(newUser);

    var newStatistic = new Statistic({
      name: newUser.name,
      course: queue,
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
    var courseName = req.queue;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for badLocation failed");
      //res.end();
      return;
    }

    io.to(courseName).emit('badLocation', {name: name, sender: username}); 
    console.log("Bad location at " + courseName + " for " + name);
  });

  // user gets updated
  socket.on('update', function(req) {
    var queue = req.queue;
    var user = req.user;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"

    console.log('a was updated in ' + queue);
    io.to(queue).emit('update', user);

    var course = findCourse(queue);
    course.updateUser(user.name, user);
  });

  // admin helps a user (marked in the queue)
  socket.on('help', function(req) {
    var courseName = req.queue;
    var name = req.name;
    var username = req.helper;

    // teacher/assistant-validation
    if (!(validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for help failed");
      //res.end();
      return;
    }

    io.to(courseName).emit('help', {
      name: name,
      helper: username
    });
    console.log(name + ' is getting help in ' + courseName);
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
    var courseName = req.queue;
    var message = req.message;
    var username = req.sender;

    // teacher/assistant-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for emit failed");
      //res.end();
      return;
    }

    io.to(courseName).emit('msg', {
      message: message,
      sender: username
    });
    console.log('emit in ' + courseName + ', msg: ' + message);
  });

  // teacher/assistant emits to all teacher/assistant
  socket.on('emitTA', function(req) {
    var courseName = req.queue;
    var message = req.message;
    var username = req.sender;

    // teacher/assistant-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for emitTA failed");
      //res.end();
      return;
    }

    var course = findCourse(courseName);
    var teacherList = course.teacher;
    var assistantList = course.assistant;

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

    //  io.to(courseName).emit('msg', {message: message, sender: username});
    console.log('emitTA in ' + courseName + ', msg: ' + message);
  });

  // user leaves queue
  socket.on('leave', function(req) {
    var queue = req.queue;
    var user = req.user;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"
    console.log("Validerande: " + JSON.stringify(socket.handshake.session.user));

    var course = findCourse(queue);
    course.removeUser(user.name);

    for (var i = statisticsList.length - 1; i >= 0; i--) {
      var statistic = statisticsList[i];
      if (statistic.name === user.name) {
        var queueLength = Date.now() - statistic.startTime;
        var newStatistic = new Statistic({
          name: statistic.name,
          course: statistic.course,
          startTime: statistic.startTime,
          action: '',
          leftQueue: true,
          queueLength: queueLength
        });
        statisticsList.splice(i, 1, newStatistic);
        newStatistic.save();
      }
    };


    //  var newUserStatistic = new UserStatistic({student: user.name, course: queue, action: '?'});
    //  newUserStatistic.save();

    console.log('a user left ' + queue);
    io.to(queue).emit('leave', user);
    io.to("lobby").emit('lobbyleave', {
      queueName: queue,
      username: user.name
    });
  });

  // admin purges a queue
  socket.on('purge', function(req) {
    console.log("called purge:");
    console.log(socket.handshake.session.user);

    var courseName = req.queue;
    var username = socket.handshake.session.user.name;
    socket.handshake.session.user = "troll";

    // admin/teacher/assistant-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for purge failed");
      //res.end();
      return;
    }

    var course = findCourse(courseName);
    course.purgeQueue();
    course.queue = [];

    console.log(req.courseName + ' -list purged by ' + username);
    io.to(courseName).emit('purge');
    io.to("lobby").emit('lobbypurge', courseName);
  });

  //===============================================================


  // admin locks a queue
  socket.on('lock', function(req) {
    var courseName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for lock failed");
      //res.end();
      return;
    }

    doOnCourse(courseName, 'lock');
  });

  // admin unlocks a queue
  socket.on('unlock', function(req) {
    var courseName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName) || validate(username, "assistant", courseName))) {
      console.log("validation for unlock failed");
      //res.end();
      return;
    }

    doOnCourse(courseName, 'unlock');
  });

  socket.on('hibernate', function(req) {
    var courseName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("Current user " + username + " is not a teacher for that queue or an admin.");
      //console.log("validation for hibernate failed");
      //res.end();
      return;
    }

    doOnCourse(req.queue, 'hibernate');
  });

  socket.on('unhibernate', function(req) {
    var courseName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for unhibernate failed");
      //res.end();
      return;
    }

    doOnCourse(req.queue, 'unhibernate');
  });

  //===============================================================

  socket.on('getAverageQueueTime', function(req) {
    var courseName = req.queueName;
    var start = req.start;
    var end = req.end;

    console.log("Counting..");

    var averageQueueTime = getAverageQueueTime(courseName, start, end);

    io.to('statistics').emit('getAverageQueueTime', averageQueueTime);
  });


  socket.on('numbersOfPeopleLeftQueue', function(req) {
    var courseName = req.queueName;
    var start = req.start;
    var end = req.end;

    console.log("Bounty hunting..");

    var numbersOfPeopleLeft = numbersOfPeopleLeftQueue(courseName, start, end);

    io.to('statistics').emit('numbersOfPeopleLeftQueue', numbersOfPeopleLeft);
  });


  //===============================================================

  //
  socket.on('addQueue', function(req) {
    console.log("Trying to add Queue!");
    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "course")) {
      console.log("validation for addQueue failed");
      //res.end();
      return;
    }
    var queueName = req.queueName;

    var newCourse = new Course({
      name: queueName
    });
    queueSystem.courseList.push(newCourse);
    newCourse.save();

    console.log(queueName + ' is getting created as ' + JSON.stringify(newCourse));

    io.to('admin').emit('addQueue', newCourse);
  });

  //
  socket.on('removeQueue', function(req) {
    console.log("Trying to remove Queue!");
    var username = socket.handshake.session.user.name;
    var courseName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for removeQueue failed");
      //res.end();
      return;
    }

    for (var i = queueSystem.courseList.length - 1; i >= 0; i--) {
      var course = queueSystem.courseList[i];
      if (course.name === courseName) {
        queueSystem.courseList.splice(i, 1);
        course.remove();
        break;
      }
    };

    console.log(courseName + ' is getting removed from queues');

    io.to('admin').emit('removeQueue', courseName);
  });

  //
  socket.on('addAdmin', function(req) {
    console.log("Trying to add Admin!");
    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "course")) {
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
    var courseName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for addTeacher failed");
      //res.end();
      return;
    }

    var username = req.username;
    var teacherName = username;
    var course = findCourse(courseName);

    var newTeacher = new Admin({
      name: teacherName,
      username: username
    });

    course.addTeacher(newTeacher);

    console.log(teacherName + ' is a new teacher!');
    io.to('admin').emit('addTeacher', {
      name: teacherName,
      username: username,
      queueName: courseName
    });
  });

  //
  socket.on('addAssistant', function(req) {
    var username = socket.handshake.session.user.name;
    var courseName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var assistantName = username;
    var course = findCourse(courseName);

    var newAssistant = new Admin({
      name: assistantName,
      username: username
    });

    course.addAssistant(newAssistant);

    console.log(assistantName + ' is a new assistant!');
    io.to('admin').emit('addAssistant', {
      name: assistantName,
      username: username,
      queueName: courseName
    });
  });

  //
  socket.on('removeAdmin', function(req) {
    console.log("Trying to remove Admin!");

    var username = socket.handshake.session.user.name;

    // admin-validation
    if (!validate(username, "super", "course")) {
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
    var courseName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var course = findCourse(courseName);

    course.removeTeacher(username);

    console.log(username + ' is a removed as a teacher in ' + courseName + '!');
    io.to('admin').emit('removeTeacher', {
      username: username,
      queueName: courseName
    });
  });

  //
  socket.on('removeAssistant', function(req) {
    var username = socket.handshake.session.user.name;
    var courseName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "course") || validate(username, "teacher", courseName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var course = findCourse(courseName);

    course.removeAssistant(username);

    console.log(username + ' is a removed as a assistant in ' + courseName + '!');
    io.to('admin').emit('removeAssistant', {
      username: username,
      queueName: courseName
    });
  });

  //
  socket.on('flag', function(req) {
    var username = req.name;
    var courseName = req.queue;
    var sender = req.sender;
    var message = req.message;

    // teacher/assistant-validation
    if (!(validate(sender, "teacher", courseName) || validate(sender, "assistant", courseName))) {
      console.log("validation for flag failed");
      //res.end();
      return;
    }

    var course = findCourse(courseName);
    course.addAssistantComment(username, sender, courseName, message);

    console.log('flagged');
    io.to(courseName).emit('flag', {
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




// returnerar alla kurser som finns (lista av strängar)
app.get('/API/queueList', function(req, res) {
  var retList = [];

  for (var i = 0; i < queueSystem.courseList.length; i++) {
    console.log("trying to get length of " + queueSystem.courseList[i].name + ": " + queueSystem.courseList[i].queue.length);
    retList.push({
      name: queueSystem.courseList[i].name,
      length: queueSystem.courseList[i].queue.length,
      locked: queueSystem.courseList[i].locked,
      hibernating: queueSystem.courseList[i].hibernating
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of courses requested');
});

// returns the queue-list
app.get('/API/queue/:queue', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var course = findCourse(req.params.queue);
  console.log('queue ' + req.params.queue + ' requested');
  //console.log(course);
  res.status(200);
  res.end(JSON.stringify(course));
});

// returns the admin-list
// needs to be restricted
app.get('/API/adminList', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(adminList));
});

// TODO: add a list of admin
app.get('/API/userData', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  console.log("user data: ");
  if (req.session.user === undefined) {
    console.log("not logged in yet");
    res.end();
  } else {
    console.log("userData - logged in: " + JSON.stringify(req.session.user));

    var username = req.session.user.name;
    var teacherList = teacherForCourses(username);
    var assistantList = assistantForCourses(username);
    var admin = validateSuper(username);

    //      socket.join("user_" + username); // for exclusive-emits/private messages

    res.end(JSON.stringify({
      name: username,
      admin: admin,
      teacher: teacherList,
      assistant: assistantList
    }));
  }
});

function teacherForCourses(username) {
  var teacherList = [];

  console.log("Looking for courses with " + username);

  for (var n = queueSystem.courseList.length - 1; n >= 0; n--) {
    var course = queueSystem.courseList[n];
    var courseName = course.name;
    var courseTeacherList = course.teacher;

    console.log("Seacrhing in " + courseName);

    for (var i = courseTeacherList.length - 1; i >= 0; i--) {
      var teacher = courseTeacherList[i];
      if (teacher.name === username) {
        console.log("Found " + username + " in " + courseName);

        teacherList.push(courseName);
        break;
      }
    };
  };

  return teacherList;
}

function assistantForCourses(username) {
  var assistantList = [];
  for (var n = queueSystem.courseList.length - 1; n >= 0; n--) {
    var course = queueSystem.courseList[n];
    var courseName = course.name;
    var courseAssistantList = course.assistant;
    for (var i = courseAssistantList.length - 1; i >= 0; i--) {
      var assistant = courseAssistantList[i];
      if (assistant.name === username) {
        assistantList.push(courseName);
        break;
      }
    };
  };

  return assistantList;
}

app.post('/API/setUser', function(req, res) {
  req.session.user = req.body;
  // Robert-TODO: set socket
  console.log("User settings set");
  res.writeHead(200);
  res.end();
});


httpServer.listen(port, function() {
  console.log("server listening on port", port);
});