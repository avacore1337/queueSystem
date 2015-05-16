/* jslint node: true */
"use strict";



var database = require("./model.js"); // databas stuff

var User = database.user;
var Admin = database.admin;
var Queue = database.queue;
var Statistic = database.statistic;


var queueList = [];
var adminList = [];
var statisticsList = [];


// return the queue with the name "name"
function findQueue(name) {
  for (var i = 0; i < queueList.length; i++) {
    if (queueList[i].name === name) {
      return queueList[i];
    }
  }
}

function addQueue (queueName) {
  var newQueue = new Queue({
    name: queueName
  });
  queueList.push(newQueue);
  newQueue.save();

  console.log(queueName + ' is getting created as ' + JSON.stringify(newQueue));
  return newQueue;
}

function setup() {
  // list of queues to be used
  var tmpList = [
    "dbas",
    "inda",
    "logik",
    "numme",
    "mvk",
    "progp",
    "mdi",
  ];

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
        place: 'Green',
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
      statisticsList.push(newStatistic);
      newStatistic.save();

      //---------------------------------------------------------------------------------------
      /*TEST*/
      randomTime += Math.random() * 5 * 10000;
      //---------------------------------------------------------------------------------------
    }

    console.log(queue + " " + newQueue.queue.length); // temporary for error-solving
  }

  var newAdmin = new Admin({
    name: "pernyb",
    username: "pernyb"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  newAdmin = new Admin({
    name: "antbac",
    username: "antbac"
  });
  adminList.push(newAdmin);
  newAdmin.save();

  newAdmin = new Admin({
    name: "rwb",
    username: "rwb"
  });
  adminList.push(newAdmin);
  newAdmin.save();
}

// Read in queues and admins from the database
function readIn() {
  // All the queues
  Queue.find(function(err, queues) {
    queues.forEach(function(queue) {
      queueList.push(queue);

      console.log('Queue: ' + queue.name + ' loaded!'); // temporary for error-solving
    });
  });
}


setup(); // temporary method
//readIn();


module.exports = {
  queueList: queueList,
  adminList: adminList,
  statisticsList: statisticsList,
  findQueue: findQueue,
  addQueue: addQueue
};