/* jslint node: true */
"use strict";

var queueSystem = require('../model/queueSystem.js');
var validate = queueSystem.validate;

var User = require("../model/user.js");
var Statistic = require("../model/statistic.js");

module.exports = function (socket, io) {

  console.log("connected");
  // Setup the ready route, join room and emit to room.
  socket.on('listen', function(req) {
    console.log('a user added to ' + req);
    socket.join(req);
    try {
      console.log("Current user = " + JSON.stringify(socket.handshake.session.user.name));
      if(socket.handshake.session.user.name){ // TODO : Temporary fix
        socket.join('user_' + socket.handshake.session.user.name);
        queueSystem.addAction(socket.handshake.session.user.name, "attended", req);
      }
    }
    catch(err) {
      console.log("User is not logged in.");
    }
  });

  socket.on('stopListening', function(req) {
    console.log('a user left ' + req);
    socket.leave(req);
  });

  // user joins queue
  socket.on('join', function(req) {
    var queueName = req.queueName;
    var user = req.user;
    user.name = socket.handshake.session.user.name;

    var queue = queueSystem.findQueue(queueName);
    queueSystem.addAction(user.name, "join", queueName);

    if(queue.inQueue(user.name)){
      return;
    }

    console.log('A user joined to ' + queueName);

    var newUser = new User({
      name: user.name,
      location: user.location,
      comment: user.comment,
      type: user.type
    });

    // Set the variable 'completion' to true if they have a completion and want to present
    if(newUser.type === 'P'){
      if(queue.hasCompletion(newUser.name)){
        newUser.completion = true;
      }
    }

    // Append the messages added about this user
    newUser.messages = queue.getMessagesFor(newUser.name);

    queue.addUser(newUser);

    // var newStatistic = new Statistic({
    //   name: newUser.name,
    //   queue: queueName,
    //   startTime: newUser.startTime,
    //   action: ''
    // });
    // newStatistic.save();

    console.log("User : " + JSON.stringify(newUser) + " wants to join the queue.");
    io.to(queueName).emit('join', newUser);
    io.to("lobby").emit('lobbyjoin', {
      queueName: queueName,
      username: newUser.name
    });

  });

  // user gets updated
  socket.on('update', function(req) {
    var queueName = req.queueName;
    var user = req.user;
    user.name = socket.handshake.session.user.name;

    console.log(JSON.stringify(user)); // check which uses is given --- need the one doing the action and the one who is "actioned"

    console.log('a was updated in ' + queueName);
    io.to(queueName).emit('update', user);

    var course = queueSystem.findQueue(queueName);
    course.updateUser(user.name, user);
  });

  // a user marks themself as getting help
  socket.on('receivingHelp', function(req) {
    var queueName = req.queueName;
    var name = socket.handshake.session.user.name;

    var course = queueSystem.findQueue(queueName);
    course.helpingQueuer(name, queueName);
    queueSystem.addAction(name, "getting help", queueName);

    io.to(queueName).emit('help', {
      name: name
    });

    console.log(name + ' is getting help in ' + queueName);
  });


  // user leaves queue
  socket.on('leave', function(req) {
    var queueName = req.queueName;
    var name = socket.handshake.session.user.name;
    var booking = req.booking;

    console.log(name); // check which uses is given --- need the one doing the action and the one who is "actioned"
    console.log("Validerande: " + JSON.stringify(socket.handshake.session.user));

    var queue = queueSystem.findQueue(queueName);
    queueSystem.addAction(name, "left queue", queueName);

    queueSystem.userLeavesQueue(queue, name, booking);
    if(req.type === 'P'){
      if(queue.hasCompletion(name)){
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

  //===============================================================

  socket.on('getStatistics', function(req) {
    var name = socket.handshake.session.user.name;
    if (!(validate(name, "teacher", req.queueName) || validate(name, "admin", req.queueName))) {
      return;
    }

    queueSystem.getActions(req.start, req.end, req.queueName, function (list) {
      var index = 0; // To get rid of warnings
      var i = 0; // To get rid of warnings
      // TODO : Return the following
      // 1) Time for leaving, time for joining, date and course for each queueing instance.
      
      // 2) Whether Students who booked a time in advance attended their time slot.

      // 3) Which Students booked a time slot together. 

      // 4) Average queuing time for a student in a course during a requested interval.
      // TODO-BUG : There is no way to find a user who joined before the given time-period and left after it.
      var totalTime = 0;
      var currentQueue = [];
      var people = 0;
      for(index in list){
        if(list[index].action === "join"){
          currentQueue.push({user: list[index].user, time: list[index].time});
          people++;
        }else if(list[index].action === "left" || list[index].action === "kicked"){
          i = currentQueue.indexOf(list[index].user);
          if(i < 0){
            totalTime += (list[index].time - req.start);
            people++;
          }else{
            totalTime += (list[index].time - currentQueue[i]);
            currentQueue.splice(i, 1);
          }
        }
      }
      for(index in currentQueue){
        totalTime += (req.end - currentQueue[index].time);
      }
      var averageTime = totalTime / people;

      // 5) Which TA:s attended each session.
      var attendingAssistants = [];
      for(index in list){
        if(list[index].action === "attended"){
          console.log("Is this attending person assistant or teacher? " + list[index].user);
          if (validate(list[index].user, "teacher", req.queueName) || validate(list[index].user, "assistant", req.queueName)) {
            if(attendingAssistants.indexOf(list[index].user) < 0) {
              attendingAssistants.push(list[index].user);
            }
          }
        }
      }
      // 6) Number of people joined, left and still in queue for a course during a requested interval.

      // 7) Raw JSON so that the teacher may check for anything
      var rawJSON = JSON.stringify(list);

      io.to("user_" + socket.handshake.session.user.name).emit('getStatistics', {
        averageTime: averageTime,
        attendingAssistants: attendingAssistants,
        rawJSON: rawJSON
      });
    });
  });

  //===============================================================


  // TODO : This has been changed to only have them join a room based on their ID, no more session interaction
  socket.on('setUser', function(req) {
    console.log("user_" + req.name);
    socket.join("user_" + req.name); // joina sitt eget rum, för privata meddelande etc
    socket.handshake.session.user = req;
    console.log('Socket-setUser: ' + JSON.stringify(req));
    console.log('session is: ' + JSON.stringify(socket.handshake.session.user));
  });

};
