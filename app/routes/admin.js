/* jslint node: true */
"use strict";

var queueSystem = require('../model/queueSystem.js');
var validate = queueSystem.validate;

var Admin = require("../model/admin.js"); // databas stuff

module.exports = function (socket, io) {

  // TODO remove duplicated
  function doOnQueue(queueName, action) {
    var queue = queueSystem.findQueue(queueName);
    queue[action]();

    console.log('trying to ' + action + ' ' + queueName);

    io.to(queueName).emit(action);
    io.to("lobby").emit("lobby" + action, queueName);

    if (action === 'hide') {
      io.to("admin").emit('hide', queueName);
    } else if (action === 'show') {
      io.to("admin").emit('show', queueName);
    }
  }

  socket.on('addServerMessage', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var message = req.message;
    var sender = socket.handshake.session.user.name;
    console.log("sender = " + sender);

    // teacher/assistant-validation
    if (!validate(sender, "super", "")) {
      console.log("validation for addServerMessage failed");
      //res.end();
      return;
    }

    queueSystem.setGlobalMOTD(message);
    console.log('\'' + message + '\' added as a new global MOTD!');
    io.to('admin').emit('newServerMessage', message);
    if(message){
      io.emit('serverMessage', message);
    }
  });

  socket.on('addQueue', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    console.log("Trying to add Queue!");
    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for addQueue failed");
      //res.end();
      return;
    }

    var queueName = req.queueName;
    var newQueue = queueSystem.addQueue(queueName);
    io.to('admin').emit('addQueue', newQueue);
  });

  socket.on('removeQueue', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    console.log("Trying to remove Queue!");

    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for removeQueue failed");
      //res.end();
      return;
    }

    queueSystem.removeQueue(queueName);

    console.log(queueName + ' is getting removed from queues');

    io.to('admin').emit('removeQueue', queueName);
  });

  socket.on('addAdmin', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    console.log("Trying to add Admin!");

    var name = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(name, "super", "queue")) {
      console.log("validation for addAdmin failed");
      //res.end();
      return;
    }
    var username = req.username;
    queueSystem.addAdmin(username, username); //TODO should contain real name not username twice

    console.log(username + ' is a new admin!');
    io.to('admin').emit('addAdmin', {
      name: username,
      username: username,
      addedBy: ''
    });
  });

  socket.on('addTeacher', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;

    var name = socket.handshake.session.user.name;
    // admin/teacher-validation
    if (!(validate(name, "super", "queue") || validate(name, "teacher", queueName))) {
      console.log("validation for addTeacher failed");
      //res.end();
      return;
    }

    var username = req.username;
    var teacherName = username;
    var queue = queueSystem.findQueue(queueName);

    var newTeacher = new Admin({
      name: teacherName,
      username: username
    });
    queue.addTeacher(newTeacher);
    console.log(teacherName + ' is a new teacher!');

    io.to('admin').emit('addTeacher', {
      name: teacherName,
      username: username,
      queueName: queueName
    });
  });

  socket.on('addAssistant', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;

    var name = socket.handshake.session.user.name;
    // admin/teacher-validation
    if (!(validate(name, "super", "queue") || validate(name, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var username = req.username;
    var assistantName = username;
    var queue = queueSystem.findQueue(queueName);
    var newAssistant = new Admin({
      name: assistantName,
      username: username
    });
    queue.addAssistant(newAssistant);

    console.log(assistantName + ' is a new assistant!');

    io.to('admin').emit('addAssistant', {
      name: assistantName,
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('removeAdmin', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    console.log("Trying to remove Admin!");

    var username = socket.handshake.session.user.name;

    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for removeAdmin failed");
      //res.end();
      return;
    }

    var admin = req.username;
    queueSystem.removeAdmin(admin);
    console.log(admin + ' is a removed from admin!');
    io.to('admin').emit('removeAdmin', admin);
  });

  //
  socket.on('removeTeacher', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var teacher = req.username;
    var queue = queueSystem.findQueue(queueName);
    queue.removeTeacher(teacher);
    console.log(teacher + ' is a removed as a teacher in ' + queueName + '!');
    io.to('admin').emit('removeTeacher', {
      username: teacher,
      queueName: queueName
    });
  });

  //
  socket.on('removeAssistant', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var assistant = req.username;
    var queue = queueSystem.findQueue(queueName);
    queue.removeAssistant(assistant);
    console.log(assistant + ' is removed as a assistant in ' + queueName + '!');
    io.to('admin').emit('removeAssistant', {
      username: assistant,
      queueName: queueName
    });
  });

  socket.on('hide', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("Current user " + username + " is not a teacher for that queue or an admin.");
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    for (var i = queue.queue.length - 1; i >= 0; i--) { // TODO : While length > 0
      queueSystem.userLeavesQueue(queue, queue.queue[i].name);
    }
    queue.purgeQueue();
    queue.queue = [];
    queue.setMOTD("");
    queue.setInfo("");

    doOnQueue(queueName, 'hide');
  });

  socket.on('show', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for show failed");
      //res.end();
      return;
    }

    doOnQueue(req.queue, 'show');
  });

};
