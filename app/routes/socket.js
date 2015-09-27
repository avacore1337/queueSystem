/* jslint node: true */
"use strict";

var queueSystem = require('../model/queueSystem.js');
var validate = queueSystem.validate;

var User = require("../model/user.js");
var Statistic = require("../model/statistic.js");

module.exports = function (socket, io) {

  console.log("connected");
  // Setup the ready route, join room and emit to room.
  socket.on('listen', function (req) {
    console.log('a user added to ' + req);
    socket.join(req);
    try {
      console.log("Current user = " + JSON.stringify(socket.handshake.session.user.name));
      if (socket.handshake.session.user.name) { // TODO : Temporary fix
        socket.join('user_' + socket.handshake.session.user.name);
      }
    } catch (err) {
      console.log("User is not logged in.");
    }
  });

  socket.on('stopListening', function (req) {
    console.log('a user left ' + req);
    socket.leave(req);
  });

  // user joins queue
  socket.on('join', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var user = req.user;
    user.name = socket.handshake.session.user.name;

    var queue = queueSystem.findQueue(queueName);

    if (queue.inQueue(user.name)) {
      return;
    }

    console.log('A user joined to ' + queueName);

    var newUser = new User({
      name: user.name,
      location: user.location,
      comment: user.comment,
      help: user.help
    });

    // Set the variable 'completion' to true if they have a completion and want to present
    if (!newUser.help) {
      if (queue.hasCompletion(newUser.name)) {
        newUser.completion = true;
      }
    }

    // Append the messages added about this user
    newUser.messages = queue.getMessagesFor(newUser.name);

    var stat = new Statistic({
      name: user.name,
      queue: queue.name,
      help: user.help,
      leftQueue: false,
      queueLength: queue.queue.length,
    });
    stat.save();
    
    queue.addUser(newUser);

    console.log("User : " + JSON.stringify(newUser) + " wants to join the queue.");
    io.to(queueName).emit('join', newUser);
    io.to("lobby").emit('lobbyjoin', {
      queueName: queueName,
      username: newUser.name
    });

  });

  // user gets updated
  socket.on('update', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var user = req.user;
    user.name = socket.handshake.session.user.name;
    user.badLocation = false;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"

    console.log('a was updated in ' + queueName);

    var course = queueSystem.findQueue(queueName);
    course.updateUser(user);
    io.to(queueName).emit('update', course.getUser(user.name));
  });

  // a user marks themself as getting help
  socket.on('receivingHelp', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var name = socket.handshake.session.user.name;

    var course = queueSystem.findQueue(queueName);
    course.helpingQueuer(name, queueName);

    io.to(queueName).emit('help', {
      name: name
    });

    console.log(name + ' is getting help in ' + queueName);
  });

  // user leaves queue
  socket.on('leave', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var name = socket.handshake.session.user.name;
    var booking = req.booking;

    console.log(name); // check which uses is given --- need the one doing the action and the one who is "actioned"
    console.log("Validerande: " + JSON.stringify(socket.handshake.session.user));

    var queue = queueSystem.findQueue(queueName);
    if (!queue.inQueue(name)) {
      return;
    }

    var user = queue.getUser(name);
    var stat = new Statistic({
      name: name,
      queue: queue.name,
      help: user.help,
      leftQueue: true,
      queueLength: queue.queue.length,
    });
    stat.save();

    queueSystem.userLeavesQueue(queue, name, booking);
    if (!user.help) {
      if (queue.hasCompletion(name)) {
        queue.removeCompletion(name); // TODO : This function does not exist
      }
    }

    console.log('a user left ' + queueName);

    io.to(queueName).emit('leave', {
      name: name
    });
    io.to("lobby").emit('lobbyleave', {
      queueName: queueName,
      username: name
    });
  });

  socket.on('getStatistics', function (req) {
    var start = req.start;
    var end = req.end;
    var queueName = req.queueName;
    console.log("start: " + start);
    console.log("end: " + end);
    Statistic.getStatistics(queueName, start, end, function (err, statData) {
      socket.emit("statistics", statData);
      console.log("finished");
    });
  });

  socket.on('getJSONStatistics', function (req) {
    var start = req.start;
    var end = req.end;
    var queueName = req.queueName;
    console.log("start: " + start);
    console.log("end: " + end);
    Statistic.getJSONStatistics(queueName, start, end, function (err, statData) {
      socket.emit("JSONStatistics", statData);
      console.log("finished");
    });
  });

  // TODO : This has been changed to only have them join a room based on their ID, no more session interaction
  socket.on('setUser', function (req) {
    console.log("user_" + req.name);
    socket.join("user_" + req.name); // joina sitt eget rum, för privata meddelande etc
    socket.handshake.session.user = {};
    socket.handshake.session.user.location = "";
    socket.handshake.session.user.name = "guest-" + req.name;
    console.log('Socket-setUser: ' + JSON.stringify(req));
    console.log('session is: ' + JSON.stringify(socket.handshake.session.user));
  });

};
