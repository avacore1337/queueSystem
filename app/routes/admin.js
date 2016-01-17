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
    var ugKthid = socket.handshake.session.user.ugKthid;
    console.log("sender = " + ugKthid);

    // teacher/assistant-validation
    if (!validate(ugKthid, "super", "")) {
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
    var ugKthid = socket.handshake.session.user.ugKthid;
    // admin-validation
    if (!validate(ugKthid, "super", "queue")) {
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

    var ugKthid = socket.handshake.session.user.ugKthid;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
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
    var user = socket.handshake.session.user;
    var ugKthid = user.ugKthid;
    // admin-validation
    if (!validate(ugKthid, "super", "queue")) {
      console.log("validation for addAdmin failed");
      //res.end();
      return;
    }
    var username = req.username;
    //@TODO needs to fetch all the data from the ldap server.
    queueSystem.addAdmin(username, username, username, user.username); //TODO should contain real name not username twice

    console.log(username + ' is a new admin!');
    io.to('admin').emit('addAdmin', {
      realname: username,
      username: username,
      ugKthid: username,
      addedBy: user.username
    });
  });

  socket.on('addTeacher', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var user = socket.handshake.session.user;
    var ugKthid = user.ugKthid;
    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("validation for addTeacher failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    var newTeacher = new Admin({
      realname: req.username,
      username: req.username,
      ugKthid: req.username,
      addedBy: user.username
    });
    queue.addTeacher(newTeacher);

    console.log(req.username + ' is a new teacher!');

    io.to('admin').emit('addTeacher', {
      realname: req.username,
      username: req.username,
      ugKthid: req.username,
      addedBy: user.username,
      queueName: queueName
    });
  });

  socket.on('addAssistant', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;

    var user = socket.handshake.session.user;
    var ugKthid = user.ugKthid;
    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("validation for addAssistant failed");
      //res.end();
      return;
    }

    var queue = queueSystem.findQueue(queueName);
    var newAssistant = new Admin({
      realname: req.username,
      username: req.username,
      ugKthid: req.username,
      addedBy: user.username
    });
    queue.addAssistant(newAssistant);

    console.log(req.username + ' is a new assistant!');

    io.to('admin').emit('addAssistant', {
      realname: req.username,
      username: req.username,
      ugKthid: req.username,
      addedBy: user.username,
      queueName: queueName
    });
  });

  //
  socket.on('removeAdmin', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    console.log("Trying to remove Admin!");

    var ugKthid = socket.handshake.session.user.ugKthid;

    // admin-validation
    if (!validate(ugKthid, "super", "queue")) {
      console.log("validation for removeAdmin failed");
      //res.end();
      return;
    }

    var adminUgkthid = req.ugKthid;
    queueSystem.removeAdmin(adminUgkthid);
    console.log(adminUgkthid + ' is a removed from admin!');
    io.to('admin').emit('removeAdmin', adminUgkthid);
  });

  //
  socket.on('removeTeacher', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var ugKthid = socket.handshake.session.user.ugKthid;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("validation for removeTeacher failed");
      //res.end();
      return;
    }

    var teacherugKthid = req.ugKthid;
    var queue = queueSystem.findQueue(queueName);
    queue.removeTeacher(teacherugKthid);
    console.log(teacherugKthid + ' is a removed as a teacher in ' + queueName + '!');
    io.to('admin').emit('removeTeacher', {
      ugKthid: teacherugKthid,
      queueName: queueName
    });
  });

  //
  socket.on('removeAssistant', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var ugKthid = socket.handshake.session.user.ugKthid;
    var queueName = req.queueName;

    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("validation for removeAssistant failed");
      //res.end();
      return;
    }

    var assistantUgKthid = req.ugKthid;
    var queue = queueSystem.findQueue(queueName);
    queue.removeAssistant(assistantUgKthid);
    console.log(assistantUgKthid + ' is removed as a assistant in ' + queueName + '!');
    io.to('admin').emit('removeAssistant', {
      ugKthid: assistantUgKthid,
      queueName: queueName
    });
  });

  socket.on('hide', function (req) {
    if(socket.handshake.session.user === undefined){
      return;
    }
    var queueName = req.queueName;
    var ugKthid = socket.handshake.session.user.ugKthid;

    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("Current user " + ugKthid + " is not a teacher for that queue or an admin.");
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
    var ugKthid = socket.handshake.session.user.ugKthid;

    // admin/teacher-validation
    if (!(validate(ugKthid, "super", "queue") || validate(ugKthid, "teacher", queueName))) {
      console.log("validation for show failed");
      //res.end();
      return;
    }

    doOnQueue(req.queue, 'show');
  });

};
