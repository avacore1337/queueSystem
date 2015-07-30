/* jslint node: true */
"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');

// Schema used for statistics 
var statisticSchema = new Schema({
  name: String,
  queue: String,
  time: { type: Number, default: Date.now },
  action: String,
  leftQueue: { type: Boolean, default: false },
  queueLength: { type: Number, default: 0},
});

statisticSchema.index({time: 1});

statisticSchema.statics.getStatistics =  function (queue, start, end, callbackDo){
  async.parallel([

  function(callback){
    Statistic.count({
      queue: queue, 
      leftQueue: true, 
      action:"H", 
      time: {"$gte": start, "$lt": end}},
      function (err, amount) {
        if (err) return console.error(err);
        console.log("peopleHelped:", amount)
        callback(null, amount);
    })
  },

  function(callback){
    Statistic.count({
      queue: queue, 
      leftQueue: true, 
      action:"P", 
      time: {"$gte": start, "$lt": end}},
      function (err, amount) {
        if (err) return console.error(err);
        console.log("peoplePresented:", amount)
        callback(null, amount);
    })
  },

  function(callback){
    Statistic.count({queue: queue, 
      leftQueue: false, 
      time: {"$gte": start, "$lt": end}},
    function (err, amount) {
      callback(null, amount);
    });
  },
  function(callback){
    Statistic.count({queue: queue, 
      leftQueue: true, 
      time: {"$gte": start, "$lt": end}},
    function (err, amount) {
      callback(null, amount);
    });
  },
  function(callback){
    Statistic.find({ queue: queue }).
    where('time').gte(start).lt(end).
    select({queueLength: 1}).
    limit(1).
    sort({time:1}).
    exec(function(err,entries){
      if (entries.length > 0) {
        callback(null,entries[0].queueLength);
      }
      else{
        callback(err,0);
      }
    });
  }],

  function(err, results){
    console.log("res data",results)
    callbackDo(null, {peopleHelped: results[0], peoplePresented: results[1], leftInQueue: (results[2] - results[3] + results[4])});
  });
}

statisticSchema.statics.getJSONStatistics =  function (queue, start, end, callback){
  Statistic.find({ queue: queue }).
  where('time').gte(start).lt(end).
  select({name: 1, queue: 1, queueLength: 1, action: 1, leftQueue: 1, time: 1}).
  exec(callback);
}

var Statistic = mongoose.model("UserStatistic", statisticSchema);
module.exports = Statistic;