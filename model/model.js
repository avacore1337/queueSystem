/* jslint node: true */
"use strict";

//===============================================================

var async = require('async');
var lodash = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = require('./user.js');
var userSchema = User.schema;
var Booking = require('./booking.js');
var bookingSchema = Booking.schema;
var Statistic = require('./statistic.js');
var statisticSchema = Statistic.schema;
var Admin = require('./admin.js');
var adminSchema = Admin.schema;
var GlobalMOTD = require('./globalMOTD.js');
var globalMOTDSchema = GlobalMOTD.schema;
var Completion = require('./completion.js');
var completionSchema = Completion.schema;
var Message = require('./message.js');
var messageSchema = Message.schema;

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
  completions: {type:[completionSchema], default: []},
  messages: {type:[messageSchema], default: []}
});

// Updates the MOTD
queueSchema.methods.addMOTD = function (message) {
  this.motd = message;
  this.save();
};

// Returns true if the given user has a completion, otherwise false
queueSchema.methods.hasCompletion = function (username) {
  var ret = false;
  this.completions.forEach(function (completion, i, completions) {
    console.log("Current completion : " + JSON.stringify(completion));
    if (completion.name === username) {
      ret = true;
    }
  });
  return ret;
};

// Returns true if the given user has a completion, otherwise false
queueSchema.methods.getMessagesFor = function (username) {
  var retList = [];
  this.messages.forEach(function (message, i, messages) {
    if (message.name === username) {
      console.log("Found a message for user '" + username + "', it is : " + JSON.stringify(message));
      retList.push(message.message);
    }
  });
  return retList;
};

// Adds a new completion
queueSchema.methods.addCompletion = function (completion) {
  this.completions.push({name: completion.name, assistant: completion.assistant});
  this.messages.push({name: completion.name, message: completion.task});
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

// Remove comments about a user
queueSchema.methods.removeAssistantComments = function (name, sender, queue) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.messages = [];
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

var Queue = mongoose.model("Queue", queueSchema);

module.exports = {
  user: User,
  admin: Admin,
  queue: Queue,
  statistic: Statistic,
  globalMOTD: GlobalMOTD,
  completion: Completion
};