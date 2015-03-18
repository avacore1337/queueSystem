var expressio = require('express.io');

var app = expressio();
app.http().io();


app.use(expressio.cookieParser());
app.use(expressio.static(__dirname + '/public'));

app.use(expressio.session({secret: 'express.io is the best framework ever!'}));
app.use(expressio.bodyParser());


function User(name,place,comment){
  this.name = name;
  this.place = place;
  this.comment = comment;
  this.gettingHelp = false;
}

function Course(name){
  this.name = name;
  this.locked = false;
  this.hidden = false;
  this.admins = [];
  this.length = 0;
}

// HÅRDKODAD! => ska läsas ifrån databasen vid ett senare skede
var tmpList = [
  "dbas", 
  "inda", 
  "logik", 
  "numme", 
  "mvk",
  "progp",
  "mdi"
];
courseList = []
var list = new Map();

// Map för varje rum
// innehåller alla users som står i resp kö
for (var i = 0 ; i < tmpList.length ; i++) {
  var course = tmpList[i];
  courseList.push(new Course(course));
  var queues = Math.floor((Math.random() * 50) + 1);
  list[course] = [];
  for (var j = 0; j < queues; j++) {  
    list[course].push(new User(Math.random().toString(36).substring(7),'Green', 'lab1'));
  };
  // list[course] = [
  //   new User(Math.random().toString(36).substring(7),'Green', 'lab1'),
  //   new User('Enis','Fernis', 'Venis'),
  //   new User('Alpha','Gaga', 'Beta')
  // ];
  console.log(course  + " " +  list[course].length);
}


app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
})

// user joins queue
app.io.route('join', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user joined to ' + queue);
  app.io.room(queue).broadcast('join', user);
  list[queue].push(new User(user.name,user.place,user.comment));
})

// user tries to join a queue with a "bad location"
//  - do nothing in backend?
app.io.route('badLocation', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;

  app.io.room(queue).broadcast('badLocation'); 
  console.log("Bad location at " + queue + " for " + name);
})

// user gets updated
app.io.route('update', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  console.log('a was updated in ' + queue);
  app.io.room(queue).broadcast('update', user);

  for(var i = list[queue].length - 1; i >= 0; i--) {
      if(list[queue][i].name === user.name) {
        list[queue].splice(i, 1, user);
      }
  }
})

// admin helps a user (marked in the queue)
//  - do nothing in backend?
app.io.route('help', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;

  user.gettingHelp = true; // test

  app.io.room(queue).broadcast('help', name);
  console.log(name + ' is getting help in ' + queue);
})

// admin messages a user
app.io.route('messageUser', function(req) {
  var queue = req.data.queue;
  var name = req.data.name;
  var message = req.data.message;

  app.io.room(queue).broadcast('message', message); // Not having user as an identifier?
  console.log('user ' + name + ' was messaged at ' + queue + ' with: ' + message);
})

// admin broadcasts to all users
app.io.route('broadcast', function(req) {
  var queue = req.data.queue;
  var message = req.data.message;

  app.io.room(queue).broadcast('message', message);
  console.log('broadcast in ' + queue + ', msg: ' + message);
})

// user leaves queue
app.io.route('leave', function(req) {
  var queue = req.data.queue;
  var user = req.data.user;
  console.log('a user left ' + queue);
  app.io.room(queue).broadcast('leave', user);

  for(var i = list[queue].length - 1; i >= 0; i--) {
      if(list[queue][i].name === user.name) {
        list[queue].splice(i, 1);
      }
  }
})

// admin purges a queue
app.io.route('purge', function(req) {
  var queue = req.data.queue;

  list[queue] = [];
  app.io.room(queue).broadcast('purge');
  console.log(req.data.queue + ' -list purged');
})

// admin locks a queue
app.io.route('lock', function(req) {
  var queue = req.data.queue;

  console.log('trying to lock ' + queue);
})

// returns the queue-list
// => returnera rätt kö (inte samma kö)
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    // console.log(list[req.params.queue] + " " + req.params.queue);
    res.end(JSON.stringify(list[req.params.queue]));
    console.log('queue requested');
})

// /API/list
// => returnerar alla kurser som finns (lista av strängar)
app.get('/API/courseList', function(req, res) {
    for (i = 0 ; i < courseList.length ; i++) {
      var course = courseList[i].name;
      courseList[i].length = list[course].length;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(courseList));
    console.log('list of courses requested');
})

app.get('/API/userData', function(req, res) {
    console.log("user data: ");
    console.log(req.session.user);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session.user));
})

app.post('/API/setUser', function(req,res) {
  // console.log(req.body);
  req.session.user = req.body;
  console.log("User settings set");
  res.writeHead(200);
  res.end();
})

app.listen(8080);
