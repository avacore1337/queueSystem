  /* jslint node: true */
"use strict";

//===============================================================

var async = require('async');
var lodash = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//===============================================================

// Schema used for global MOTD
var globalMOTDSchema = new Schema({
  message: { type: String, default: '' },
});

// Updates the MOTD
globalMOTDSchema.methods.addGlobalMOTD = function (message) {
  this.message = message;
  this.save();
};

//-----

// Schema used for admins, teachers and teacher assistans
var adminSchema = new Schema({
  name: String,
  username: String,
  addedBy: { type: String, default: '' }
});

// Schema used for completions
var completionSchema = new Schema({
  name: String,
  assistant: String,
  task: String
});

//-----

// Schema used for users in the queues
var userSchema = new Schema({
  name: String,
  location: String,
  startTime: { type: Number, default: Date.now },
  messages: [String],
  gettingHelp: { type: Boolean, default: false },
  action: { type: String, default: '' },
  comment: { type: String, default: '' },
  type: String,
  completion: { type: Boolean, default: false }
});

// creates a JSON-object from the schema
userSchema.methods.toJSON = function () {
  return {
    name: this.name,
    location: this.location,
    time: this.startTime,
    messages: this.messages,
    gettingHelp: this.gettingHelp,
    action: this.action,
    comment: this.comment,
    type: this.type,
    completion: this.completion
  };
};

//-----


//---------------------------------------------------------------------------------------
/*TEST*/
// the average time in 'queue' of students who joined the queue 
//  from 'start' and left before/was still in queue at 'end'
/*TODO-DIRR*/
function getAverageQueueTime(queue, start, end) {
//  var queue = findQueue(queueName);
  var counter = 0;

  queue.forEach(function (usr, i, queue) {
    if (usr.startTime >= start && usr.startTime < end) {
      var d = new Date(usr.startTime);
      console.log("User " + usr.name + " started at " + d);

      counter++;
    }
  });

  console.log("Counted: " + counter);
  return counter;
}

// number of people who joined the queue from 'start' and left before 'end'
/*TODO-DIRR*/
function numbersOfPeopleLeftQueue(queue, start, end) {
// 1. Get all statistics-object from a specific queue
// 2. Filter out all those who was in the queue before set "start"-time
// 3. Filter out all those who entered the queue after set "end"-time
// 4. Retrieve those who has a 'queueLength+startTime <= end' 

/*
    var statisticSchema = new Schema({
      name: String,
      queue: String,
      time: { type: Number, default: Date.now },
      action: String,
      leftQueue: { type: Boolean, default: false },
      queueLength: { type: Number, default: 0},
*/

//  var queue = findQueue(queueName);
  var counter = 0;

  queue.forEach(function (usr, i, queue) {
    if (usr.startTime >= start && usr.startTime < end) {
      var d = new Date(usr.startTime);
      console.log("User " + usr.name + " started at " + d);

      counter++;
    }
  });

  console.log("Counted: " + counter);
  return counter;
}

//---------------------------------------------------------------------------------------

// Schema used for queues
var queueSchema = new Schema({
  name: String,
  locked: { type: Boolean, default: false },
  hiding: { type: Boolean, default: false },
  motd: { type: String, default: "You can do it!" },
  info: { type: String, default: "Lorem Ipsum !!" },
  queue: {type:[userSchema], default: []},
  bookings: {type:[bookingSchema], default: []},
  teacher: {type:[adminSchema], default: []},
  assistant: {type:[adminSchema], default: []},
  completions: {type:[completionSchema], default: []}
});

// Updates the MOTD
queueSchema.methods.addMOTD = function (message) {
  this.motd = message;
  this.save();
};

// Adds a new completion
queueSchema.methods.addCompletion = function (completion) {
  this.completions.push(completion);
  this.save();
};

// Updates the Info
queueSchema.methods.setInfo = function (message) {
  this.info = message;
  this.save();
};

// takes a user as a parameter and adds to the queue
queueSchema.methods.addUser = function (user) {
  this.queue.push(user);
  this.save();
};

queueSchema.methods.addBooking = function (bookingData) {
  this.bookings.push(bookingData);
  this.save();
};

queueSchema.methods.forAssistant = function (fn) {
  this.assistant.forEach(fn);
};

queueSchema.methods.forTeacher = function (fn) {
  this.teacher.forEach(fn);
};

// takes a username as a parameter and removes the user form the queue
queueSchema.methods.removeUser = function (username) {
  this.queue = this.queue.filter(function (user) {
    return user.name !== username;
  });
  this.save();
};

// takes a username as a parameter and removes the booking from the queue
// not tested yet
queueSchema.methods.removeBooking = function (username) {
  for (var i = 0; i < this.bookings.length; i++) {
    var remove = false;
    for (var j = 0; j < this.bookings[i].users.length; j++) {
      if (this.bookings[i].users[j] === username) {
        remove = true;
      }
      if (remove) {
        this.bookings.splice(i, 1);
      }
    }
  }
  this.save();
};

// takes a user as a parameter and adds to the queue
queueSchema.methods.addTeacher = function (teacher) {
  this.teacher.push(teacher);
  this.save();
};

// takes a username as a parameter and removes the user form the queue
queueSchema.methods.removeTeacher = function (username) {
  this.teacher = this.teacher.filter(function (teacher) {
    return teacher.name !== username;
  });
  this.save();
};

// takes a user as a parameter and adds to the queue
queueSchema.methods.addAssistant = function (assistant) {
  this.assistant.push(assistant);
  this.save();
};

// takes a username as a parameter and removes the user form the queue
queueSchema.methods.removeAssistant = function (username) {
  this.assistant = this.assistant.filter(function (assistant) {
    return assistant.name !== username;
  });
  this.save();
};

// locks the queue
queueSchema.methods.lock = function () {
  this.locked = true;
  this.save();
};

// unlocks the queue
queueSchema.methods.unlock = function () {
  this.locked = false;
  this.save();
};

// hide the schema
queueSchema.methods.hide = function () {
  this.hiding = true;
  this.save();
};

// show the schema
queueSchema.methods.show = function () {
  this.hiding = false;
  this.save();
};

// empty the queue
queueSchema.methods.purgeQueue = function () {
  // this.queue.forEach(function (usr, i, queue) {
  // });

  this.queue = [];
  this.save();
};

// empty the queue
queueSchema.methods.purgeBookings = function () {
  this.bookings = [];
  this.save();
};

// takes a function "fn" and applies it on every user
queueSchema.methods.forUser = function (fn) {
  this.queue.forEach(fn);
  this.save();
};

// update a user (parameter "name" decides which user)
// parameter "user" is the replacing user
queueSchema.methods.updateUser = function (name, user) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// set a comment from a assistant to a user (comment regarding help given by the assistant)
queueSchema.methods.addAssistantComment = function (name, sender, queue, message) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.messages.push(message);
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// set the completion tag of a user to true
queueSchema.methods.setCompletion = function (name, sender, queue) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.completion = true;
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// set a user as getting help
queueSchema.methods.helpingQueuer = function (name, queue) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.gettingHelp = true;
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// set a user as no longer getting help
queueSchema.methods.stopHelpingQueuer = function (name, queue) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.gettingHelp = false;
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

//-----

// Schema used for bookings
var bookingSchema = new Schema({
  users: [String],
  time: { type: Number, default: 0},
  length: { type: Number, default: 0},
  comment: String,
});

//-----

// Schema used for statistics 
var statisticSchema = new Schema({
  name: String,
  queue: String,
  startTime: { type: Number, default: Date.now },
  action: String,
  leftQueue: { type: Boolean, default: false },
  queueLength: { type: Number, default: 0},
});

statisticSchema.index({startTime: 1});

statisticSchema.methods.userLeaves = function () {
  this.leftQueue = true;
  this.save();
};

statisticSchema.statics.getAverageQueueTime =  function (queueName, start, end, callbackDo) {
  var statistic = this;
  console.log("This");

  async.parallel([

  function(callback){
    console.log("Callback");
     statistic.find({startTime: {$gte: start, $lte: end}, queue: queueName, leftQueue: true}, function (err, results) {
        if(err) return console.error(err);
        callback(null, results);
      });
  }],

  function(err, results){
    console.log("Do the do da");
    callbackDo(results);
  });
};


//=========================================
// The schemas that will be used in "index.js"

var User = mongoose.model("User", userSchema);
var Admin = mongoose.model("Admin", adminSchema);
var Queue = mongoose.model("Queue", queueSchema);
var Statistic = mongoose.model("UserStatistic", statisticSchema);
var Booking = mongoose.model("Booking", bookingSchema);
var GlobalMOTD = mongoose.model("GlobalMOTD", globalMOTDSchema);
var Completion = mongoose.model("Completion", completionSchema);

//=========================================
// Export data from this file to "index.js"

module.exports = {
  user: User,
  admin: Admin,
  queue: Queue,
  statistic: Statistic,
  globalMOTD: GlobalMOTD,
  completion: Completion
};