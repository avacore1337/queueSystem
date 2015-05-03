/* jslint node: true */
"use strict";

//===============================================================

var expressio = require('express.io');

var app = expressio();
app.http().io();


app.use(expressio.cookieParser());
app.use(expressio.static(__dirname + '/public'));

app.use(expressio.session({secret: 'express.io is the best framework ever!!'}));
app.use(expressio.bodyParser());

var mongoose = require('mongoose');
var database = require("./model.js"); // databas stuff
var Schema = mongoose.Schema;
var _ = require('lodash');
var async = require('async');

//===============================================================
// Setting up the database-connection

mongoose.connect('mongodb://localhost/queueBase');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("db open!");
});

//===============================================================
// Setting up schemas and lists for the program

var User2 = database.user;
var Admin2 = database.admin;
var Course2 = database.course;
var Statistic2 = database.statistic;

//---

var courseList = [];
var adminList = [];
var statisticsList = [];

//===============================================================
// Methods for setting up or reading in the database (in production, only readIn should be used)

setup(); // temporary method
//readIn();

function setup(){
  // list of courses to be used
  var tmpList = [
    "dbas",
    "inda",
    "logik",
    "numme",
    "mvk",
    "progp",
    "mdi",
  ];

  // creates database-objects from the list (of courses)
  for (var i = 0 ; i < tmpList.length ; i++) {
    var course = tmpList[i];
    var newCourse = new Course2({name: course});
    courseList.push(newCourse);
    newCourse.save();

//---------------------------------------------------------------------------------------
/*TEST*/    var randomTime = Date.now() - Math.random() * 3 * 1000000;
//---------------------------------------------------------------------------------------
    // for every course, create users
    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var newUser = new User2({name: Math.random().toString(36).substring(7), place: 'Green', comment: 'lab1', startTime: randomTime});
      newCourse.addUser(newUser);
      newCourse.save();
      var newStatistic = new Statistic2({name: newUser.name, course: newCourse.name, startTime: newUser.startTime, action: ''});
      statisticsList.push(newStatistic);
      newStatistic.save();

//---------------------------------------------------------------------------------------
/*TEST*/      randomTime += Math.random() * 5 * 10000;
//---------------------------------------------------------------------------------------
    }

    console.log(course  + " " +  newCourse.queue.length); // temporary for error-solving
  }

  var newAdmin = new Admin2(name: pernyb, username: pernyb);
  adminList.push(newAdmin);
  newAdmin = new Admin2(name: antbac, username: antbac);
  adminList.push(newAdmin);
  newAdmin = new Admin2(name: rwb, username: rwb);
  adminList.push(newAdmin);
}

// Read in courses and admins from the database
function readIn(){
  // All the courses
  Course2.find(function (err, courses) {
    courses.forEach(function (course) {
       courseList.push(course);

       console.log('Course: ' + course.name + ' loaded!'); // temporary for error-solving
    });
  });
}

//===============================================================
// 

// return the course with the name "name"
function findCourse(name) {
  for (var i = 0; i < courseList.length; i++) {
    if (courseList[i].name === name) {
      return courseList[i];
    }
  }
}

// validates if a person is the privilege-type given for given course
// TODO: make the validation more secure
function validate(name, type, course) {
  return true;
  var course = findCourse(course);

  if (type === 'super') {
    return validateSuper(name);
  };

  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      console.log(name + ' is a valid admin'); // temporary for error-solving
      return true;
    }
  }

  console.log(name + ' is not a valid admin'); // temporary for error-solving
  return false;
}

// list of courses that a user is admin, teacher or TA for
// TODO: make the list containing a field which says which kind of privilege-type the person has
function privilegeList(name) {
  var list = [];
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      var obj = { "name" : adminList[i].name, "course" : "", "type" : "admin" };
      list.push(obj);
    }
  }
  
  return list;
}

//===============================================================

// TODO: should a cookie be created/be received here?
app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
});

app.io.route('stopListening', function(req) {
  console.log('a user left ' + req.data);
  req.io.leave(req.data);
});

// user joins queue
app.io.route('join', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user joined to ' + queue);
  app.io.room(queue).broadcast('join', user);
  app.io.room("lobby").broadcast('lobbyjoin', queue);

  var course = findCourse(queue);
  course.addUser(new User2({name: user.name, place: user.place, comment: user.comment}));
});

// user tries to join a queue with a "bad location"
//  - do nothing in backend?
app.io.route('badLocation', function(req) {
  // assistant-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for badLocation failed");
    //res.end();
    return;
  }
  var queue = req.data.queue;
  var name = req.data.name;
  var message = "Bad location given";
  var sender = req.data.sender;

  app.io.room(queue).broadcast('badLocation', {message: message, sender: sender}); 
  console.log("Bad location at " + queue + " for " + name);

  getAverageQueueTime(queue, 0, 0);
});

// user gets updated
app.io.route('update', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  console.log('a was updated in ' + queue);
  app.io.room(queue).broadcast('update', user);

  var course = findCourse(queue);
  course.updateUser(user.name, user);
});

// admin helps a user (marked in the queue)
app.io.route('help', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var helper = req.data.helper;

  app.io.room(queue).broadcast('help', helper);
  console.log(name + ' is getting help in ' + queue);
});

// admin messages a user
app.io.route('messageUser', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var message = req.data.message;
  var sender = req.data.sender;

  app.io.room(queue).broadcast('msg', {message: message, sender: sender}); // Not having user as an identifier?
  console.log('user ' + name + ' was messaged from ' + sender + ' at ' + queue + ' with: ' + message);
});

// admin broadcasts to all users
app.io.route('broadcast', function(req) {
  var queue = req.data.queue;
  var message = req.data.message;
  var sender = req.data.sender;

  app.io.room(queue).broadcast('msg', {message: message, sender: sender});
  console.log('broadcast in ' + queue + ', msg: ' + message);
});

// user leaves queue
app.io.route('leave', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  var course = findCourse(queue);
  course.removeUser(user.name);

  for (var i = statisticsList.length - 1; i >= 0; i--) {
    var statistic = statisticsList[i];
    if (statistic.name === user.name) {
      var queueLength = Date.now() - statistic.startTime;
      var newStatistic = new Statistic2({name: statistic.name, course: statistic.course, startTime: statistic.startTime, action: '', leftQueue: true, queueLength: queueLength});
      statisticsList.splice(i, 1, newStatistic);
      newStatistic.save();
    }
  };


//  var newUserStatistic = new UserStatistic2({student: user.name, course: queue, action: '?'});
//  newUserStatistic.save();

  console.log('a user left ' + queue);
  app.io.room(queue).broadcast('leave', user);
  app.io.room("lobby").broadcast('lobbyleave', queue);
});

// admin purges a queue
app.io.route('purge', function(req) {

  console.log("called purge:");
  console.log(req.session.user);
  req.session.user = "troll";
  // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for purge failed");
    //res.end();
    return;
  }
  var queue = req.data.queue;

  var course = findCourse(queue);
  course.purgeQueue();
  course.queue = [];

  console.log(req.data.queue + ' -list purged');
  app.io.room(queue).broadcast('purge');
  app.io.room("lobby").broadcast('lobbypurge', queue);

  // ====== PrivList - testoutput =======
  var usr = "pernyb";
  var list = privilegeList(usr);
  console.log("PrivList for " + usr + ": " + JSON.stringify(list));
});

//===============================================================

function doOnCourse(courseName, action){
  var course = findCourse(courseName);
  course[action]();
  console.log('trying to ' + action + ' ' + courseName);
  app.io.room(courseName).broadcast(action);
  app.io.room("lobby").broadcast("lobby" + action, courseName);

  if (action === 'hibernate') {
    app.io.room("admin").broadcast('hibernate', courseName);
  } else if (action === 'unhibernate') {
    app.io.room("admin").broadcast('unhibernate', courseName);
  }
}

// admin locks a queue
app.io.route('lock', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for lock failed");
    //res.end();
    return;
  }
  doOnCourse(req.data.queue, 'lock');
});

// admin unlocks a queue
app.io.route('unlock', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for unlock failed");
    //res.end();
    return;
  }
  doOnCourse(req.data.queue, 'unlock');
});

app.io.route('hibernate', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for hibernate failed");
    //res.end();
    return;
  }
  doOnCourse(req.data.queue, 'hibernate');
});

app.io.route('unhibernate', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for unhibernate failed");
    //res.end();
    return;
  }
  doOnCourse(req.data.queue, 'unhibernate');
});

//===============================================================
// ### STATISTICS ###

// not done yet -> should be implemented in a different way
app.io.route('numbers helped', function(req) {
  var queue = req.data.queue;
  var starttime = req.data.starttime;
  var endtime = req.data.endtime;

  var helpedList = [];

  // MAGIC WHERE WE GET ALL THE PEOPLE THAT LEFT THE QUEUE, BY AN ASSISTENT, BEFORE ENDTIME

  app.io.room(queue).broadcast('numbers helped', helpedList);
});

app.io.route('queueing users', function(req) {
  var queue = req.data.queue;
  var time = req.data.startTime;

  var course = findCourse(queue);
  var length = course.queue.length;

  console.log('queueing users: ' + length);
  app.io.room(queue).broadcast('queueing users', length);
});

//---------------------------------------------------

app.io.route('getAverageQueueTime', function(req) {
  var queueName = req.data.queueName;
  var start = req.data.start;
  var end = req.data.end;

  console.log("Counting..");

  var averageQueueTime = getAverageQueueTime(queueName, start, end);

  app.io.room('statistics').broadcast('getAverageQueueTime', averageQueueTime);
});


app.io.route('numbersOfPeopleLeftQueue', function(req) {
  var queueName = req.data.queueName;
  var start = req.data.start;
  var end = req.data.end;

  console.log("Bounty hunting..");

  var numbersOfPeopleLeft = numbersOfPeopleLeftQueue(queueName, start, end);

  app.io.room('statistics').broadcast('numbersOfPeopleLeftQueue', numbersOfPeopleLeft);
});

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
  console.log("Average: " + totalTime/counter)
  return totalTime/counter;
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

//===============================================================

//
app.io.route('addQueue', function(req) {
 console.log("Trying to add Queue!");
 // admin-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addQueue failed");
    //res.end();
    return;
  }
  var queueName = req.data.queue;

  var newCourse = new Course2({name: queueName});
  courseList.push(newCourse);
  newCourse.save();

  console.log(queueName + ' is getting created');

  app.io.room('admin').broadcast('addQueue', newCourse);
});

//
app.io.route('addAdmin', function(req) {
 // admin-validation
 console.log("Trying to add Admin!");
/*  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addAdmin failed");
    //res.end();
    return;
  }*/
  var adminName = req.data.name;
//  var username = req.data.username;
/*TEST*/  var username = adminName;
  var queue = req.data.queue;

  var newAdmin = new Admin2({name: adminName, username: username});
  adminList.push(newAdmin);
  newAdmin.save();

  console.log(adminName + ' is a new admin!');
  app.io.room('admin').broadcast('addAdmin', {name: adminName, username: username});
});

//
app.io.route('addTeacher', function(req) {
 // admin-validation
/*  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addTeacher failed");
    //res.end();
    return;
  }*/
  var teacherName = req.data.name;
//  var username = req.data.username;
/*TEST*/  var username = teacherName;
  var queueName = req.data.queue;
  var course = findCourse(queueName);

  var newTeacher = new Admin2({name: teacherName, username: username});

  course.teacher = course.teacher.push(newTeacher);
  course.save();

  console.log(teacherName + ' is a new teacher (but not really)!');
  app.io.room('admin').broadcast('addTeacher', {name: teacherName, username: username, queueName: queueName});
});

//
app.io.route('addAssistant', function(req) {
 // teacher-validation
/*  if (!validate("pernyb", "super", "course")) {
    console.log("validation for addAssistant failed");
    //res.end();
    return;
  }*/
  var assistantName = req.data.name;
//  var username = req.data.username;
/*TEST*/  var username = assistantName;
  var queueName = req.data.queue;
  var course = findCourse(queueName);

  var newAssistant = new Admin2({name: assistantName, username: username});

  course.teacher.push(newAssistant);
  course.save();

  console.log(assistantName + ' is a new assistant (but not really)!');
  app.io.room('admin').broadcast('addAssistant', {name: assistantName, username: username, queueName: queueName});
});

//
app.io.route('removeAdmin', function(req) {
 // admin-validation
 console.log("Trying to remove Admin!");
/*  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addAdmin failed");
    //res.end();
    return;
  }*/
  var username = req.data.username;
  var queueName = req.data.queueName;

  for (var i = adminList.length - 1; i >= 0; i--) {
    var admin = adminList[i];
    if (admin.username === username) {
      adminList.splice(i, 1);
      break;
    }
  };
  adminList.save();

  console.log(adminName + ' is a removed from admin!');
  app.io.room('admin').broadcast('removeAdmin', username);
});

//
app.io.route('flag', function(req) {
 // assistant-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for flag failed");
    //res.end();
    return;
  }
  var queue = req.data.queue;
  var sender = req.data.sender;
  var name = req.data.name;
  var message = req.data.message;
 
  var course = findCourse(queue);
  course.addAssistantComment(name, sender, queue, message);

  console.log('flagged');
  app.io.room(queue).broadcast('flag', name, message);
});

// =================================================================================

// returnerar alla kurser som finns (lista av strängar)
app.get('/API/queueList', function(req, res) {
  var retList = [];

  for (var i = 0 ; i < courseList.length ; i++) {
    console.log("trying to get length of " + courseList[i].name + ": " + courseList[i].queue.length);
    retList.push({name: courseList[i].name, length: courseList[i].queue.length, locked: courseList[i].locked, hibernating: courseList[i].hibernating});
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of courses requested');
});

// returns the queue-list
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var course = findCourse(req.params.queue);
    console.log('queue '+ req.params.queue +' requested');
    console.log(course);
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
    console.log("user data: ");
    console.log(req.session.user);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session.user));
});

app.post('/API/setUser', function(req,res) {
  req.session.user = req.body;
  console.log("User settings set");
  res.writeHead(200);
  res.end();
});

app.listen(8080);