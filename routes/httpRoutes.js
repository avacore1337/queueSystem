var express = require('express');
var dns = require('dns');
var router = express.Router();
var queueSystem = require('../model/queueSystem.js');

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
    var location = req.session.user.location;

    //      socket.join("user_" + username); // for exclusive-emits/private messages

    res.end(JSON.stringify({
      name: username,
      admin: admin,
      teacher: teacherList,
      assistant: assistantList,
      location: location
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
  req.session.user.location = "";

  var ip = req.connection.remoteAddress;
  getLocation(ip, function (hostname) {
    console.log("hostname = " + hostname);
    var pattern = /(.kth.se)/g;
    var result = hostname.match(pattern);
    if(result){
      var location = hostname.split(".")[0].replace("-", " ").toLowerCase();
      console.log("local location-variable = " + location);
      
      // Test if they are at a recognized school computer
      // Recognized computers are:
      // E-house floor 4 : Blue, Red, Orange, Yellow, Green, Brown
      // E-house floor 5 : Grey, Karmosin, White, Magenta, Violett, Turkos
      // D-house floor 5 : Spel, Sport, Musik, Konst, Mat
      pattern = /(blue|red|orange|yellow|green|brown|grey|karmosin|white|magenta|violett|turkos|spel|sport|musik|konst|mat)/g;
      result = location.match(pattern);
      if(result){
        console.log("local location-variable = " + location);
        if(result == "mat"){ // Do not add a third equal sign. (Result does not appear to be a string)
          location = location.replace("mat", "mat ");
        }
        req.session.user.location = location;
      }
    }
    console.log("Is this happening before ?");
    res.writeHead(200);
    res.end();
  });
});

function getLocation(ip, callback) {
  try{
    if(ip.indexOf("::ffff:") > -1){
      ip = ip.substring(7);
    }

    dns.reverse(ip, function(err, hostnames){
      if(err || !hostnames || !hostnames[0]){
        callback("");
      }else{
        callback(hostnames[0]);
      }
    });
  }catch(err){
    callback("");
  }
}

module.exports=router;