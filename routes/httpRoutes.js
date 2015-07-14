var express = require('express');
var dns = require('dns');
var router = express.Router();
var queueSystem = require('../model/queueSystem.js');

var statisticsList = queueSystem.statisticsList;
var validate = queueSystem.validate;
// returnerar alla kurser som finns (lista av strängar)
router.get('/queueList', function(req, res) {
  var retList = [];

  queueSystem.forQueue(function(queue) {
    console.log("trying to get length of " + queue.name + ": " + queue.queue.length);
    retList.push({
      name: queue.name,
      length: queue.queue.length,
      locked: queue.locked,
      hiding: queue.hiding
    });
  });

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(retList));
  console.log('list of queues requested');
});

// returns the queue-list
router.get('/queue/:queue', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var queue = queueSystem.findQueue(req.params.queue);
  console.log('queue ' + req.params.queue + ' requested');

  //console.log(queue);
  res.status(200);
  res.end(JSON.stringify(queue));
});

// returns the admin-list
// needs to be restricted
router.get('/adminList', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(queueSystem.getAdminList()));
});

router.get('/serverMessage', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var ret = {};
  ret.serverMessage = queueSystem.getGlobalMOTD();
  res.end(JSON.stringify(ret));
});

// TODO: add a list of admin
router.get('/userData', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  console.log("user data: ");
  if (req.session.user === undefined) {
    console.log("not logged in yet");
    res.end();
  } else {
    console.log("userData - logged in: " + JSON.stringify(req.session.user));

    var username = req.session.user.name;
    var teacherList = teacherForQueues(username);
    var assistantList = assistantForQueues(username);
    var admin = validate(username, "super");

    //      socket.join("user_" + username); // for exclusive-emits/private messages

    res.end(JSON.stringify({
      name: username,
      admin: admin,
      teacher: teacherList,
      assistant: assistantList
    }));
  }
});

function teacherForQueues(username) {
  var teacherList = [];
  queueSystem.forQueue(function(queue) {
    queue.forTeacher(function(teacher){
      if (teacher.name === username) {
        teacherList.push(queue.name);
      }
    });
  });
  return teacherList;
}

function assistantForQueues(username) {
  var assistantList = [];
  queueSystem.forQueue(function(queue) {
    queue.forAssistant(function(assistant){
      if (assistant.name === username) {
        assistantList.push(queue.name);
      }
    });
  });
  return assistantList;
}

router.post('/setUser', function(req, res) {
  req.session.user = req.body;

  // TODO : Check for csc.kth.se too ?

  var ip = "130.237.223.13";
  console.log("IP = " + ip);
  dns.reverse(ip, function(err, hostnames){
    var hostname = hostnames[0];
    var location = "";
    if(!err){
      console.log("Hostname = " + hostname);
      location = hostname.split(".")[0].replace("-", " ").trim().toLowerCase();
      console.log("Location = " + location);
      
      // Test if they are at a recognized school computer
      // Recognized computers are:
      // E-house floor 4 : Blue, Red, Orange, Yellow, Green, Brown
      // E-house floor 5 : Grey, Karmosin, White, Magenta, Violett, Turkos
      // D-house floor 5 : Spel, Sport, Musik, Konst, Mat (Mat appears to be wrong)
      var pattern = /(blue|red|orange|yellow|green|brown|grey|karmosin|white|magenta|violett|turkos|spel|sport|musik|konst)/g;
      var result = location.match(pattern);
      console.log("result = " + result);
      if(result){
        req.session.user.location = location;
      }
    }
    console.log("Err = " + JSON.stringify(err));

    // Robert-TODO: set socket
    console.log("User settings set");

    res.writeHead(200);
    res.end();
  });
});

module.exports=router;