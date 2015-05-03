/* jslint node: true */
"use strict";

//===============================================================

var async = require('async');
var lodash = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//===============================================================

// Schema used for admins, teachers and teacher assistans
var adminSchema = new Schema({
  name: String,
  username: String,
  addedBy: { type: String, default: '' }
});

//-----

// Schema used for users in the queues
var userSchema = new Schema({
  name: String,
  place: String,
  startTime: { type: Number, default: Date.now },
  messages: [String],
  action: { type: String, default: '' },
  comment: { type: String, default: '' }
});

// creates a JSON-object from the schema
userSchema.methods.toJSON = function () {
  return {
    name: this.name,
    place: this.place,
    time: this.startTime,
    action: this.action,
    comment: this.comment
  };
};

//-----


//---------------------------------------------------------------------------------------
/*TEST*/
// the average time in 'queue' of students who joined the queue 
//  from 'start' and left before/was still in queue at 'end'
function getAverageQueueTime(queue, start, end) {
//  var queue = findCourse(queueName);
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
function numbersOfPeopleLeftQueue(course, start, end) {
// 1. Get all statistics-object from a specific course
// 2. Filter out all those who was in the queue before set "start"-time
// 3. Filter out all those who entered the queue after set "end"-time
// 4. Retrieve those who has a 'queueLength+startTime <= end' 

/*
    var statisticSchema = new Schema({
      name: String,
      course: String,
      time: { type: Number, default: Date.now },
      action: String,
      leftQueue: { type: Boolean, default: false },
      queueLength: { type: Number, default: 0},
*/

//  var queue = findCourse(queueName);
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

// Schema used for courses
var courseSchema = new Schema({
  name: String,
  locked: { type: Boolean, default: false },
  hibernating: { type: Boolean, default: false },
  motd: { type: String, default: "You can do it!" },
  queue: {type:[userSchema], default: []},
  bookings: [String],
  teacher: {type:[adminSchema], default: []},
  assistant: {type:[adminSchema], default: []}
});

// takes a user as a parameter and adds to the queue
courseSchema.methods.addUser = function (user) {
  this.queue.push(user);
  this.save();
};

// takes a username as a parameter and removes the user form the queue
courseSchema.methods.removeUser = function (username) {
  this.queue = this.queue.filter(function (user) {
    return user.name !== username;
  });
  this.save();
};

// takes a user as a parameter and adds to the queue
courseSchema.methods.addTeacher = function (teacher) {
  this.teacher.push(teacher);
  this.save();
};

// takes a username as a parameter and removes the user form the queue
courseSchema.methods.removeTeacher = function (username) {
  this.teacher = this.teacher.filter(function (teacher) {
    return teacher.name !== username;
  });
  this.save();
};

// takes a user as a parameter and adds to the queue
courseSchema.methods.addAssistant = function (assistant) {
  this.assistant.push(assistant);
  this.save();
};

// takes a username as a parameter and removes the user form the queue
courseSchema.methods.removeAssistant = function (username) {
  this.assistant = this.assistant.filter(function (assistant) {
    return assistant.name !== username;
  });
  this.save();
};

// locks the queue
courseSchema.methods.lock = function () {
  this.locked = true;
  this.save();
};

// unlocks the queue
courseSchema.methods.unlock = function () {
  this.locked = false;
  this.save();
};

// hide the schema
courseSchema.methods.hibernate = function (user) {
  this.hibernating = true;
  this.save();
};

// unhide the schema
courseSchema.methods.unhibernate = function (user) {
  this.hibernating = false;
  this.save();
};

// empty the queue
courseSchema.methods.purgeQueue = function (course) {
  this.queue.forEach(function (usr, i, queue) {
  });

  this.queue = [];
  this.save();
};

// takes a function "fn" and applies it on every user
courseSchema.methods.forUser = function (fn) {
  this.queue.forEach(fn);
  this.save();
};

// update a user (parameter "name" decides which user)
// parameter "user" is the replacing user
courseSchema.methods.updateUser = function (name, user) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// set a comment from a assistant to a user (comment regarding help given by the assistant)
courseSchema.methods.addAssistantComment = function (name, sender, queue, message) {
  this.queue.forEach(function (usr, i, queue) {
    if (usr.name === name) {
      var user = usr;
      user.messages.push(message);
      lodash.extend(queue[i], user);
    }
  });
  this.save();
};

// NOT IMPLEMENTED YET
// set the "message of the day" for the course
courseSchema.methods.setMOTD = function () {
  // TODO
};

//-----

// Schema used for bookings
var booking = new Schema({
  users: [String],
  time: { type: Number, default: 0},
  length: { type: Number, default: 0},
  information: String,
});

//-----

// Schema used for statistics 
var statisticSchema = new Schema({
  name: String,
  course: String,
  startTime: { type: Number, default: Date.now },
  action: String,
  leftQueue: { type: Boolean, default: false },
  queueLength: { type: Number, default: 0},
});

statisticSchema.index({startTime: 1});

//=========================================
// The schemas that will be used in "index.js"

var User = mongoose.model("User", userSchema);
var Admin = mongoose.model("Admin", adminSchema);
var Course = mongoose.model("Course", courseSchema);
var Statistic = mongoose.model("UserStatistic", statisticSchema);

//=========================================
// Export data from this file to "index.js"

module.exports = {
  user: User,
  admin: Admin,
  course: Course,
  statistic: Statistic
};