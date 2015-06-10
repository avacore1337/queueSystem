/* jslint node: true */
"use strict";

/**
 * A module that contains the main system object!
 * @module queueSystem
 */

var schedule = require('node-schedule');
var request = require('request');
var database = require("./model.js"); // databas stuff
var http = require('http');

var User = database.user;
var Admin = database.admin;
var Queue = database.queue;
var Statistic = database.statistic;


var queueList = [];
var adminList = [];
exports.statisticsList = [];

/**
 * Wrapper for the array For each for the queueList array.
 * @param {function} fn - The function to be called for every element in the list.
 */
exports.forQueue = function (fn) {
  queueList.forEach(fn);
};

/**
 * Adds a superadmin to the system.
 * @param {String} name - The name of the user.
 * @param {String} username - The username of the user.
 */
exports.addAdmin = function (name, username) {
  var admin = new Admin({
    name: name,
    username: username
  });
  adminList.push(admin);
  admin.save();
};

/**
 * Removes a super admin.
 * @param {String} username - The username of the user.
 */
exports.removeAdmin = function (username) {
  for (var i = adminList.length - 1; i >= 0; i--) {
    var admin = adminList[i];
    if (admin.username === username) {
      adminList.splice(i, 1);
      admin.remove();
      break;
    }
  }
};

/** Returns the adminList */
exports.getAdminList = function () {
  return adminList;
};

/**
 * Return the queue object with the matching name.
 * @param {String} name - The name of the queue.
 */
exports.findQueue = function(name) {
  for (var i = 0; i < queueList.length; i++) {
    if (queueList[i].name === name) {
      return queueList[i];
    }
  }
};

/**
 * Removes the queue object with the matching name.
 * @param {String} name - The name of the queue.
 */
exports.removeQueue = function(name){
  for (var i = queueList.length - 1; i >= 0; i--) {
    var queue = queueList[i];
    if (queue.name === name) {
      queueList.splice(i, 1);
      queue.remove();
      break;
    }
  }
};

/**
 * Creates a queue with the given name.
 * @param {String} name - The name of the queue.
 */
exports.addQueue = function (name) {
  var newQueue = new Queue({
    name: name
  });
  queueList.push(newQueue);
  newQueue.save();

  console.log(name + ' is getting created as ' + JSON.stringify(newQueue));
  return newQueue;
};

/**
 * Validates if a user has the access rights to do the action on the 
 * access level required for the given course
 * @param {String} userName - The name of the user.
 * @param {String} type - The needed access level - "super", "teacher" or "assistant".
 * @param {String} queueName - The name of the queue.
 */
exports.validate = function(userName, type, queueName) {
  if (type === "super") {
    return validateSuper(userName);
  } else if (type === "teacher") {
    return validateTeacher(userName, queueName);
  } else if (type === "assistant") {
    return validateAssistant(userName, queueName) || validateTeacher(userName,queueName);
  }

  console.log("that privilege-type is not defined"); // temporary for error-solving
  return false;
};

/**
 * Validates if a user has the access rights to do super admin level actions.
 * @param {String} userName - The name of the user.
 */
function validateSuper(name) {
  var valid = false;
  for (var i = 0; i < adminList.length; i++) {
    if (adminList[i].name === name) {
      console.log(name + ' is a valid super-admin'); // temporary for error-solving
      valid = true;
    }
  }
  return valid;
}

/**
 * Validates if a user has the access rights to do teacher level actions
 * on the given queue.
 * @param {String} userName - The name of the user.
 * @param {String} queueName - The name of the queue.
 */
function validateTeacher(username, queueName) {
  var valid = false;
  exports.findQueue(queueName).forTeacher(function(teacher) {
    if (teacher.name === username) {
      console.log(username + ' is a valid teacher'); // temporary for error-solving
      valid = true;
     }
  });
  return valid;
}

/**
 * Validates if a user has the access rights to do teacher assistant level
 * actions on the given queue.
 * @param {String} userName - The name of the user.
 * @param {String} queueName - The name of the queue.
 */
function validateAssistant(username, queueName) {
  var valid = false;
  exports.findQueue(queueName).forAssistant(function(assistant) {
    if (assistant.name === username) {
      console.log(username + ' is a valid assistant'); // temporary for error-solving
      valid = true;
    }
  });
  return valid;
}

/**
 * Sets up scheduled jobs for fetching data for the booked students
 */
function setupFetching (queue, body) {
   for (var i = 0; i < body.length; i++) {
      schedule.scheduleJob(new Date(body[i].start),function () {
        fetchBookings(queue.name,function (err, response, body) {
          for (var j = 0; j < body.length; j++) {
            var users = body[j].otherUsers;
            users.push(body[j].userID);
            queue.addBooking({
              users:users,
              time:(new Date(body[j].start)).getTime(),
              length:15,
              comment:body[j].comment
            });
          };
        });
      });
    };
 }

/**
 * updates all the bookings with the data from the bookingsystem.
 */
exports.updateAllBookings = function () {
  exports.forQueue(function (queue) {
    fetchSessions(queue.name, function (err, response, body) {
      console.log("fetching data for: " + queue.name);
      if (!err && response.statusCode === 200) {
        setupFetching(queue, body);
      }
      else{
        console.log(err);
      }
    });
  });
}

/**
 * fetches all the sessions from the bookingsystem for a queue/course
 */
function fetchSessions (queueName, callback) { //TODO make the path return a list of UNIQUE times when there should be more data.
  var url = 'http://127.0.0.1:8088/API/todayssessions/' + queueName; //TODO move out url to config file
  request({ url: url, json: true }, callback)
}

/**
 * fetches all the bookings from the bookingsystem for a queue/course
 */
function fetchBookings (queueName, callback) {
  var url = 'http://127.0.0.1:8088/API/todaysbookings/' + queueName; //TODO move out url to config file
  request({ url: url, json: true }, callback)
}

/**
 * A function that spoofs data to make sure there is something to test the 
 * system with. Should be commented out in production.
 */
function setup() {
  // list of queues to be used
  var tmpList = [
    "dbas",
    "inda",
    "logik",
    "numme",
    "mvk",
    "progp",
    "mdi"
  ];

  // All the queues
  Admin.find(function(err, admins) {
    admins.forEach(function(admin) {
      adminList.push(admin);
      // to make sure everything loads
      console.log('Admin: ' + admin.name + ' loaded!');
    });
  });

  // creates database-objects from the list (of queues)
  for (var i = 0; i < tmpList.length; i++) {
    var queue = tmpList[i];
    var newQueue = new Queue({
      name: queue
    });
    queueList.push(newQueue);
    newQueue.save();

    //---------------------------------------------------------------------------------------
    /*TEST*/
    var randomTime = Date.now() - Math.random() * 3 * 1000000;
    //---------------------------------------------------------------------------------------
    // for every queue, create users
    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var newUser = new User({
        name: Math.random().toString(36).substring(7),
        location: 'Green',
        comment: 'lab1',
        startTime: randomTime
      });
      newQueue.addUser(newUser);
      newQueue.save();
      var newStatistic = new Statistic({
        name: newUser.name,
        queue: newQueue.name,
        startTime: newUser.startTime,
        action: ''
      });
      exports.statisticsList.push(newStatistic);
      newStatistic.save();

      //---------------------------------------------------------------------------------------
      /*TEST*/
      randomTime += Math.random() * 5 * 10000;
      //---------------------------------------------------------------------------------------
    }

    console.log(queue + " " + newQueue.queue.length); // temporary for error-solving
  }
}

/**
 * Loads all the data from the database at startup. 
 * Make sure this runs at system start.
 */
function readIn() {
  // All the queues
  Queue.find(function(err, queues) {
    queues.forEach(function(queue) {
      queueList.push(queue);
      // to make sure everything loads
      console.log('Queue: ' + queue.name + ' loaded!');
    });
  });

  // All the queues
  Admin.find(function(err, admins) {
    admins.forEach(function(admin) {
      adminList.push(admin);
      // to make sure everything loads
      console.log('Admin: ' + admin.name + ' loaded!');
    });
  });
}


setup(); // Use for seting up the test system
//readIn(); //use this
