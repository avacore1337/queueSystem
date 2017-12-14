/* jslint node: true */
"use strict";

/**
 * A module that contains the main system object!
 * @module queueSystem
 */

var schedule = require('node-schedule');
var request = require('request');
var http = require('http');

var Queue = require("./queue.js");
var User = require("./user.js");
var Admin = require("./admin.js");
var Statistic = require("./statistic.js");
var GlobalMOTD = require("./globalMOTD.js");

var queueList = [];
var adminList = [];
var globalMOTD;

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

  // console.log(name + ' is getting created as ' + JSON.stringify(newQueue));
  return newQueue;
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
 * Wrapper for the array For each for the queueList array.
 * @param {function} fn - The function to be called for every element in the list.
 */
exports.forQueue = function (fn) {
  queueList.forEach(fn);
};

/**
 * Adds a superadmin to the system.
 * @param {String} name - The name of the user.
 * @param {String} realname - The real name (cn) of the user.
 * @param {String} username - The username of the user.
 * @param {String} ugKthid - The unique unchanging id of the user.
 */
exports.addAdmin = function (realname, username, ugKthid, addedBy) {
  for (var i = 0; i < adminList.length; i++) {
    if(adminList[i].ugKthid === ugKthid){
    return false;
    }
  }
  var admin = new Admin({
    realname: realname,
    username: username,
    ugKthid: ugKthid,
    addedBy: addedBy
  });
  adminList.push(admin);
  admin.save();
  return true;
};

/**
 * Removes a super admin.
 * @param {String} username - The username of the user.
 */
exports.removeAdmin = function (ugKthid) {
  for (var i = adminList.length - 1; i >= 0; i--) {
    var admin = adminList[i];
    if (admin.ugKthid === ugKthid) {
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
 * Validates if a user has the access rights to do the action on the
 * access level required for the given course
 * @param {String} userName - The name of the user.
 * @param {String} type - The needed access level - "super", "teacher" or "assistant".
 * @param {String} queueName - The name of the queue.
 */
exports.validate = function(ugKthid, type, queueName) {
  if (type === "super")
    return validateSuper(ugKthid);
  if (type === "teacher")
    return validateTeacher(ugKthid, queueName);
  if (type === "assistant")
    return validateAssistant(ugKthid, queueName) || validateTeacher(ugKthid,queueName);
  return false;
};

/**
 * Validates if a user has the access rights to do super admin level actions.
 * @param {String} userName - The name of the user.
 */
function validateSuper(ugKthid) {
  for (let admin of adminList)
    if (admin === ugKthid)
      return true;
  return false;
}

/**
 * Validates if a user has the access rights to do teacher level actions
 * on the given queue.
 * @param {String} userName - The name of the user.
 * @param {String} queueName - The name of the queue.
 */
function validateTeacher(ugKthid, queueName) {
  var valid = false;
  exports.findQueue(queueName).forTeacher(function(teacher) {
    if (teacher.ugKthid === ugKthid) {
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
function validateAssistant(ugKthid, queueName) {
  var valid = false;
  exports.findQueue(queueName).forAssistant(function(assistant) {
    if (assistant.ugKthid === ugKthid) {
      valid = true;
    }
  });
  return valid;
}

exports.setGlobalMOTD = function (message) {
  globalMOTD.message = message;
  globalMOTD.save();
};

exports.getGlobalMOTD = function () {
  return globalMOTD.message;
};

/**
 * A function that spoofs data to make sure there is something to test the
 * system with. Should be commented out in production.
 */
function setup() {
  // list of queues to be used
  var tmpList = [
    "mvk",
    "progp",
    "mdi",
    "Dasak"
  ];

  globalMOTD = new GlobalMOTD({
    message: "Hello World!"
  });
  globalMOTD.save();

  var newAdmin = new Admin({
    realname: "Anton Bäckström",
    username: "antbac",
    ugKthid: "u18dlezv",
    addedBy: "root"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  newAdmin = new Admin({
    realname: "robert welin-berger",
    username: "robertwb",
    ugKthid: "u101x961",
    addedBy: "root"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  // creates database-objects from the list (of queues)
  for (var i = 0; i < tmpList.length; i++) {
    var queue = tmpList[i];
    var newQueue = new Queue({
      name: queue
    });
    queueList.push(newQueue);
    newQueue.save();

    //---------------------------------------------------------------------------------------
    // Create some random users and add them to the queues
    var randomTime = Date.now() - Math.random() * 3 * 1000000;
    var queues = Math.floor((Math.random() * 50) + 1);
    for (var j = 0; j < queues; j++) {
      var rndName = Math.random().toString(36).substring(7);
      var newUser = new User({
        username: "username-" + rndName,
        ugKthid: "ug-" + rndName,
        realname: "real-" + rndName,
        location: 'Green',
        comment: 'lab1',
        help: Math.floor((Math.random() * 2)) === 0 ? true : false,
        startTime: randomTime
      });
      newQueue.addUser(newUser);
      newQueue.save();

      var newStatistic = new Statistic({
        username: newUser.username,
        queue: newQueue.username,
        help: newUser.help,
        leftQueue: true,
        queueLength: newQueue.queue.length,
        helpAmount: newQueue.queue.length,
        presentAmount: 0,
      });
      newStatistic.save();

      randomTime += Math.random() * 5 * 10000;
    }
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
    });
  });

  // All the queues
  Admin.find(function(err, admins) {
    admins.forEach(function(admin) {
      adminList.push(admin);
    });
  });

  // All the queues
  GlobalMOTD.find(function(err, globals) {
    globals.forEach(function(global) {
      globalMOTD = global;
    });
  });
}

setup(); // Use for setting up the test system
//readIn(); //use this
