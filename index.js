var expressio = require('express.io');

var app = expressio();
app.http().io();


app.use(expressio.cookieParser());
app.use(expressio.static(__dirname + '/public'));

app.use(expressio.session({secret: 'express.io is the best framework ever!'}));
app.use(expressio.bodyParser());

// STARTTEST
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');
var async = require('async');

//var util = require('./util.js');
//var fluent = util.fluent;
//var saving = util.saving;

mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("db open!");
});


var userSchema = new Schema({
  name: String,
  place: String,
  time: { type: Number, default: Date.now },
  action: { type: String, default: '' },
  comment: { type: String, default: '' }
});

userSchema.methods.toJSON = function () {
  return {
    name: this.name,
    place: this.place,
    time: this.time,
    action: this.action,
    comment: this.comment
  };
};

var courseSchema = new Schema({
  name: String,
  open: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  queue: {type:[userSchema], default: []}
});

courseSchema.methods.addUser = function (user) {
  this.queue.push(user);
  this.save();
};

courseSchema.methods.removeUser = function (username) {
  this.queue = this.queue.filter(function (user) {
    return user.name !== username;
  });
  this.save();
};

courseSchema.methods.forUser = function (fn) {
  this.queue.forEach(fn);
  this.save();
};

courseSchema.methods.updateUser = function (name, user) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      _.extend(queue[i], user);
    }
  });
  this.save();
};

var messageSchema = new Schema({
  course: String,
  from: String,
  to: String,
  msg: String,
});

var broadcastSchema = new Schema({
  course: String,
  from: String,
  msg: String,
});


var User2 = mongoose.model("User", userSchema);

var Course2 = mongoose.model("Course", courseSchema);

var Msg2 = mongoose.model("Message", messageSchema);

var Broadcast2 = mongoose.model("Broadcast", messageSchema);
/*
*/

// var queues = {};

// Course.find(function (err, courses) {
//   courses.forEach(function (course) {
//     queues[course.name] = new QueueRoom(course);
//   });
// });

// ENDTEST


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

// HÅRDKODAD! => ska läsas ifrån databasen vid ett senare skede
var tmpList = [
  "dbas", 
  "inda", 
  "logik", 
  "numme", 
  "mvk",
  "progp",
  "mdi"
];
 courseList = []
 messageList = []
 broadcastList = []
// var cList = new Map();

// Map för varje rum
// innehåller alla users som står i resp kö
// REFACTOR!
function setup(){
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
    };

    console.log(course  + " " +  newCourse.queue.length);
  }  

  var newMessage = new Msg2({course: 'course', from: 'from', to: 'to', msg: 'msg'});
  newMessage.save();
  var newBroadcast = new Broadcast2({course: 'course', from: 'from', msg: 'msg'});
  newBroadcast.save();
}

function readIn(){
  Course2.find(function (err, courses) {
    courses.forEach(function (course) {
      //cList[course.name] = course;
       courseList.push(course);
      // console.log(courseList);

      console.log(course.name + ' loaded: ' + course);
    });
  });
}

function findCourse(name) {
  for (var i = 0; i < courseList.length; i++) {
    if (courseList[i].name === name) {
      return courseList[i];
    }
  };
}

/**
 THIS IS IMPORTANT STUFF!!!
*/
setup();
//readIn();

app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
})

// user joins queue
app.io.route('join', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user joined to ' + queue);
  app.io.room(queue).broadcast('join', user);

  var course = findCourse(queue);
  course.addUser(new User2({name: user.name, place: user.place, comment: user.comment}));
})

// user tries to join a queue with a "bad location"
//  - do nothing in backend?
app.io.route('badLocation', function(req) {
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

  for(var i = list[queue].length - 1; i >= 0; i--) {
      if(list[queue][i].name === name) {
        list[queue][i].gettingHelp = true;
        console.log("helptrue!!");
      }
  }

  app.io.room(queue).broadcast('help', name);
  console.log(name + ' is getting help in ' + queue);
})

// admin messages a user
app.io.route('messageUser', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var message = req.data.message;

  app.io.room(queue).broadcast('msg', message); // Not having user as an identifier?
  console.log('user ' + name + ' was messaged at ' + queue + ' with: ' + message);

  var newMessage = new Msg2({course: queue, from: '', to: name, msg: message});
  messageList.push(newMessage);
  newMessage.save();
})

// admin broadcasts to all users
app.io.route('broadcast', function(req) {
  var queue = req.data.queue;
  var message = req.data.message;

  app.io.room(queue).broadcast('msg', message);
  console.log('broadcast in ' + queue + ', msg: ' + message);

  var newBroadcast = new Broadcast2({course: queue, from: '', msg: message});
  broadcastList.push(newBroadcast);
  newBroadcast.save();
})

// user leaves queue
app.io.route('leave', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user left ' + queue);
  app.io.room(queue).broadcast('leave', user);

  var course = findCourse(queue);
  course.removeUser(user.name);
})

// admin purges a queue
app.io.route('purge', function(req) {
  var queue = req.data.queue;

  var course = findCourse(queue);
  course.queue = [];
  app.io.room(queue).broadcast('purge');
  console.log(req.data.queue + ' -list purged');
})

// admin locks a queue
app.io.route('lock', function(req) {
  var queue = req.data.queue;

  console.log('trying to lock ' + queue);
})

// returns the queue-list
// => returnera rätt kö (inte samma kö)
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    // console.log(list[req.params.queue] + " " + req.params.queue);
    var course = findCourse(req.params.queue);
    res.end(JSON.stringify(course.queue));
    console.log('queue requested');
})

// /API/list
// => returnerar alla kurser som finns (lista av strängar)
app.get('/API/courseList', function(req, res) {
  var retList = [];

  for (i = 0 ; i < courseList.length ; i++) {
    console.log("trying to get length of " + courseList[i].name + ": " + courseList[i].queue.length);
    retList.push({name: courseList[i].name, length:courseList[i].queue.length});
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of courses requested');
})

app.get('/API/userData', function(req, res) {
    console.log("user data: ");
    console.log(req.session.user);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session.user));
})

app.post('/API/setUser', function(req,res) {
  // console.log(req.body);
  req.session.user = req.body;
  console.log("User settings set");
  res.writeHead(200);
  res.end();
})

app.listen(8080);
