/* jslint node: true */
"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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

var Statistic = mongoose.model("UserStatistic", statisticSchema);
module.exports = Statistic;