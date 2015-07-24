/* jslint node: true */
"use strict";

var queueSystem = require('../model/queueSystem.js');
var validate = queueSystem.validate;

var Admin = require("../model/admin.js"); // databas stuff

module.exports = function (socket, io) {

  // TODO duplicated
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

  socket.on('addServerMessage', function(req) {
    var message = req.message;
    var sender = req.sender;
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
  });

  socket.on('addQueue', function(req) {
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
    queueSystem.addAction(username, "created", queueName);

    io.to('admin').emit('addQueue', newQueue);
  });

  socket.on('removeQueue', function(req) {
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
    queueSystem.addAction(username, "deleted", queueName);

    console.log(queueName + ' is getting removed from queues');

    io.to('admin').emit('removeQueue', queueName);
  });

  socket.on('addAdmin', function(req) {
    console.log("Trying to add Admin!");

    var username = socket.handshake.session.user.name;
    // admin-validation
    if (!validate(username, "super", "queue")) {
      console.log("validation for addAdmin failed");
      //res.end();
      return;
    }
    username = req.username;
    queueSystem.addAdmin(username, username);
    queueSystem.addAction(username, "promoted to admin");

    console.log(username + ' is a new admin!');
    io.to('admin').emit('addAdmin', {
      name: username,
      username: username,
      addedBy: ''
    });
  });

  socket.on('addTeacher', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addTeacher failed");
      //res.end();
      return;
    }

    username = req.username;
    var teacherName = username;
    var queue = queueSystem.findQueue(queueName);

    var newTeacher = new Admin({
      name: teacherName,
      username: username
    });

    queue.addTeacher(newTeacher);
    queueSystem.addAction(newTeacher.name, "promoted to teacher", queueName);

    console.log(teacherName + ' is a new teacher!');

    io.to('admin').emit('addTeacher', {
      name: teacherName,
      username: username,
      queueName: queueName
    });
  });

  socket.on('addAssistant', function(req) {
    var username = socket.handshake.session.user.name;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    username = req.username;
    var assistantName = username;
    var queue = queueSystem.findQueue(queueName);

    var newAssistant = new Admin({
      name: assistantName,
      username: username
    });

    queue.addAssistant(newAssistant);
    queueSystem.addAction(newAssistant.name, "promoted to assistant", queueName);

    console.log(assistantName + ' is a new assistant!');

    io.to('admin').emit('addAssistant', {
      name: assistantName,
      username: username,
      queueName: queueName
    });
  });

  //
  socket.on('removeAdmin', function(req) {
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
    queueSystem.addAction(admin, "removed as admin");

    console.log(admin + ' is a removed from admin!');

    io.to('admin').emit('removeAdmin', admin);
  });

  //
  socket.on('removeTeacher', function(req) {
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
    queueSystem.addAction(teacher, "removed as teacher", queueName);

    console.log(teacher + ' is a removed as a teacher in ' + queueName + '!');

    io.to('admin').emit('removeTeacher', {
      username: teacher,
      queueName: queueName
    });
  });

  //
  socket.on('removeAssistant', function(req) {
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
    queueSystem.addAction(assistant, "removed as assistant", queueName);

    console.log(assistant + ' is removed as a assistant in ' + queueName + '!');

    io.to('admin').emit('removeAssistant', {
      username: assistant,
      queueName: queueName
    });
  });

  socket.on('hide', function(req) {
    var queueName = req.queueName;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("Current user " + username + " is not a teacher for that queue or an admin.");
      //console.log("validation for hide failed");
      //res.end();
      return;
    }

    doOnQueue(queueName, 'hide');
    queueSystem.addAction(username, "hid", queueName);
  });

  socket.on('show', function(req) {
    var queueName = req.queue;
    var username = socket.handshake.session.user.name;

    // admin/teacher-validation
    if (!(validate(username, "super", "queue") || validate(username, "teacher", queueName))) {
      console.log("validation for show failed");
      //res.end();
      return;
    }

    doOnQueue(req.queue, 'show');
    queueSystem.addAction(username, "showed", queueName);
  });

};
