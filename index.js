var expressio = require('express.io');

var app = expressio();
app.http().io();


app.use(expressio.cookieParser());
app.use(expressio.static(__dirname + '/public'));

app.use(expressio.session({secret: 'express.io is the best framework ever!'}));
app.use(expressio.bodyParser());

var mongoose = require('mongoose');
var database = require("./queueSchemas.js"); // databas stuff
var Schema = mongoose.Schema;
var _ = require('lodash');
var async = require('async');

mongoose.connect('mongodb://localhost/queueBase');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("db open!");
});

//===============================================================

var User2 = database.user;
var Admin2 = database.admin;
var Course2 = database.course;

courseList = [];
adminList = [];

//===============================================================

function User(name,place,comment){
  this.name = name;
  this.place = place;
  this.comment = comment;
  this.gettingHelp = false;
}

function Course(name){
  this.name = name;
  this.locked = false;
  this.hidden = false;
  this.admins = [];
  this.length = 0;
}

// REFACTOR!
function setup(){
  var tmpList = [
    "dbas",
    "inda",
    "logik",
    "numme",
    "mvk",
    "progp",
    "mdi"
  ];

  for (var i = 0 ; i < tmpList.length ; i++) {
    var course = tmpList[i];
    var newCourse = new Course2({name: course});
    courseList.push(newCourse);
    newCourse.save();

    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var newUser = new User2({name: Math.random().toString(36).substring(7), place: 'Green', comment: 'lab1'});
      newCourse.addUser(newUser);
      newCourse.save();
    }

    console.log(course  + " " +  newCourse.queue.length);
  }

  // -----

  // Code to create collections in mongo
  var newAdmin = new Admin2({name: 'name'});
  newAdmin.save();
//  var newUserStatistic = new UserStatistic2({student: 'student', course: 'course', action: 'action'});
  //newUserStatistic.save();

  var testAdmin = new Admin2({name: 'pernyb'});
  testAdmin.save();
  adminList.push(testAdmin);
  testAdmin = new Admin2({name: 'antbac'});
  testAdmin.save();
  adminList.push(testAdmin);

//  var testTeacher = new Teacher2({name : 'pernyb', course : 'dbas'});
// testTeacher.save();
//  teacherList.push(testTeacher);
}

// Read in courses and admins from the database
function readIn(){
  // All the courses
  Course2.find(function (err, courses) {
    courses.forEach(function (course) {
       courseList.push(course);
       console.log('Course: ' + course.name + ' loaded!');
    });
  });

  // All the admins
  Admin2.find(function (err, admins) {
    admins.forEach(function (admin) {
       adminList.push(admin);
       console.log('Admin: ' + admin.name + ' loaded');
    });
  });

/*  // All the admins
  Teacher2.find(function (err, teachers) {
    teachers.forEach(function (teacher) {
       teacherList.push(teacher);
       console.log('Teacher: ' + teacher.name + ' loaded');
    });
  });*/

  // All the admins
/*  Assistant2.find(function (err, assistants) {
    assistants.forEach(function (assistant) {
       assistantList.push(assistant);
       console.log('Assistant: ' + assistant.name + ' loaded');
    });
  });*/
}

function findCourse(name) {
  for (var i = 0; i < courseList.length; i++) {
    if (courseList[i].name === name) {
      return courseList[i];
    }
  };
}

// name in Admins
function validate(name, type, course) {
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      console.log(name + ' is a valid admin');
      return true;
    }
  };

  console.log(name + ' is not a valid admin');
  return false;
}

// list of courses that a user is admin, teacher or TA for
function privilegeList(name) {
  list = [];
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      var obj = { "name" : adminList[i].name, "course" : "", "type" : "admin" };
      list.push(obj);
    }
  }
  
/*  for (var i = 0; i < teacherList.length; i++) {
    if (teacherList[i].name === name) {
      var obj = { "name" : teacherList[i].name, "course" : teacherList[i].course, "type" : "teacher" };
      list.push(obj);
    }
  }*/

/*  for (var i = 0; i < assistantList.length; i++) {
    if (assistantList[i].name === name) {
      var obj = { "name" : assistantList[i].name, "course" : assistantList[i].course, "type" : "assistant" };
      list.push(obj);
    }
  }*/
  
  return list;
}

//===============================================================

//setup();
readIn();

//===============================================================

// TODO: should a cookie be created/be received here?
app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
})

app.io.route('stopListening', function(req) {
  console.log('a user left ' + req.data);
  req.io.leave(req.data);
})

// user joins queue
app.io.route('join', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user joined to ' + queue);
  app.io.room(queue).broadcast('join', user);
  app.io.room("lobby").broadcast('lobbyjoin', queue);

  var course = findCourse(queue);
  course.addUser(new User2({name: user.name, place: user.place, comment: user.comment}));
})

// user tries to join a queue with a "bad location"
//  - do nothing in backend?
app.io.route('badLocation', function(req) {
  // assistant-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for badLocation failed");
    res.end();
    return;
  }
  var queue = req.data.queue;
  var name = req.data.name;

  app.io.room(queue).broadcast('badLocation'); 
  console.log("Bad location at " + queue + " for " + name);
})

// user gets updated
app.io.route('update', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  console.log('a was updated in ' + queue);
  app.io.room(queue).broadcast('update', user);

  var course = findCourse(queue);
  course.updateUser(user.name, user);
})

// admin helps a user (marked in the queue)
app.io.route('help', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var helper = req.data.helper;

  app.io.room(queue).broadcast('help', helper);
  console.log(name + ' is getting help in ' + queue);
})

// admin messages a user
app.io.route('messageUser', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var message = req.data.message;
  var sender = req.data.sender;

  app.io.room(queue).broadcast('msg', message); // Not having user as an identifier?
  console.log('user ' + name + ' was messaged from ' + sender + ' at ' + queue + ' with: ' + message);
})

// admin broadcasts to all users
app.io.route('broadcast', function(req) {
  var queue = req.data.queue;
  var message = req.data.message;

  app.io.room(queue).broadcast('msg', message);
  console.log('broadcast in ' + queue + ', msg: ' + message);
})

// user leaves queue
app.io.route('leave', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  var course = findCourse(queue);
  course.removeUser(user.name);

//  var newUserStatistic = new UserStatistic2({student: user.name, course: queue, action: '?'});
//  newUserStatistic.save();

  console.log('a user left ' + queue);
  app.io.room(queue).broadcast('leave', user);
  app.io.room("lobby").broadcast('lobbyleave', queue);
});

// admin purges a queue
app.io.route('purge', function(req) {
  // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for purge failed");
    res.end();
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
}

// admin locks a queue
app.io.route('lock', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for lock failed");
    res.end();
    return;
  }
  doOnCourse(req.data.queue, 'lock');
});

// admin unlocks a queue
app.io.route('unlock', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for unlock failed");
    res.end();
    return;
  }
  doOnCourse(req.data.queue, 'unlock');
});

app.io.route('hibernate', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for hibernate failed");
    res.end();
    return;
  }
  doOnCourse(req.data.queue, 'hibernate');
});

app.io.route('unhibernate', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for unhibernate failed");
    res.end();
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
})

//===============================================================

//
app.io.route('createQueue', function(req) {
 // admin-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for createQueue failed");
    res.end();
    return;
  }
  var queueName = req.data.name;
  var queue = req.data.queue;

  var newCourse = new Course2({name: queueName});
  courseList.push(newCourse);
  newCourse.save();

  console.log(queueName + ' is getting created');
})

//
app.io.route('addAdmin', function(req) {
 // admin-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addAdmin failed");
    res.end();
    return;
  }
  var adminName = req.data.name;
  var queue = req.data.queue;

  var newAdmin = new Admin2({name: adminName});
  adminList.push(newAdmin);
  newAdmin.save();

  console.log(adminName + ' is a new admin!');
})

//
app.io.route('addTeacher', function(req) {
 // admin-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addTeacher failed");
    res.end();
    return;
  }
  var teacherName = req.data.name;
  var queue = req.data.queue;
  var course = req.data.course;

/*  var newTeacher = new Teacher2({name: teacherName, course: course});
  teacherList.push(newTeacher);
  newTeacher.save();*/

  console.log(teacherName + ' is a new teacher (but not really)!');
})

//
app.io.route('addAssistant', function(req) {
 // teacher-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for addAssistant failed");
    res.end();
    return;
  }
  var assistantName = req.data.name;
  var queue = req.data.queue;
  var course = req.data.course;

/*  var newAssistant = new Assistant2({name: assistantName, course: course});
  assistantList.push(newAssistant);
  newAssistant.save();*/

  console.log(assistantName + ' is a new assistant (but not really)!');
})

//
app.io.route('flag', function(req) {
 // assistant-validation
  if (!validate("pernyb", "type", "course")) {
    console.log("validation for flag failed");
    res.end();
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
})

// =================================================================================

// returnerar alla kurser som finns (lista av strängar)
app.get('/API/courseList', function(req, res) {
  var retList = [];

  for (i = 0 ; i < courseList.length ; i++) {
    console.log("trying to get length of " + courseList[i].name + ": " + courseList[i].queue.length);
    retList.push({name: courseList[i].name, length: courseList[i].queue.length, locked: courseList[i].locked, hibernating: courseList[i].hibernating});
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of courses requested');
})

// returns the queue-list
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var course = findCourse(req.params.queue);
    console.log('queue '+ req.params.queue +' requested');
    console.log(course);
    res.end(JSON.stringify(course));
})

// TODO: add a list of admin
app.get('/API/userData', function(req, res) {
    console.log("user data: ");
    console.log(req.session.user);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session.user));
})

app.post('/API/setUser', function(req,res) {
  req.session.user = req.body;
  console.log("User settings set");
  res.writeHead(200);
  res.end();
})

app.listen(8080);