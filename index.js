var expressio = require('express.io');

var app = expressio();
app.http().io();

// HÅRDKODAD! => ska läsas ifrån databasen vid ett senare skede
var courseList = [
  "dbas", 
  "inda", 
  "logik", 
  "numme", 
  "mvk",
  "progp",
  "mdi"
];

var list = new Map();

// Map för varje rum
// innehåller alla users som står i resp kö
for (var i = 0 ; i < courseList.length ; i++) {
  list[courseList[i]] = [
    {name:'Helge',  place:"Pege" , comment:"Green"}
  ];
  console.log(list[courseList[i]] + " " + courseList[i]);
}

app.use(expressio.static(__dirname + '/public'));

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
  console.log('a user joined to ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('join', req.data.user);
  list[req.data.queue].push(req.data.user);
})

// user gets updated
app.io.route('update', function(req) {
  console.log('a was updated in ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('update', req.data.user);

  for(var i = list[req.data.queue].length - 1; i >= 0; i--) {
      if(list[req.data.queue][i].name === req.data.user.name) {
        list[req.data.queue].splice(i, 1, req.data.user);
      }
  }
})

// user leaves queue
app.io.route('leave', function(req) {
  console.log('a user left ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('leave', req.data.user);

  for(var i = list[req.data.queue].length - 1; i >= 0; i--) {
      if(list[req.data.queue][i].name === req.data.user.name) {
        list[req.data.queue].splice(i, 1);
      }
  }
})

// user gets put at the bottom of the queue
  // försökte implementera en funktion att placera någon längst ner i kön
  // reason: se ifall det gick att implementera nya metoder, det gick inte
app.io.route('bottom', function(req) {
  console.log('a user was put at the bottom ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('bottom', req.data.user);

  for(var i = list[req.data.queue].length - 1; i >= 0; i--) {
      if(list[req.data.queue][i].name === req.data.user.name) {
        var user = list[req.data.queue].splice(i, 1);
        list[req.data.queue].push(user)
        break
      }
  }
})

// returns the queue-list
// => returnera rätt kö (inte samma kö)
app.get('/API/queue/:queue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    console.log(list[req.params.queue] + " " + req.params.queue);
    res.end(JSON.stringify(list[req.params.queue]));
    console.log('queue requested');
})

// /API/list
// => returnerar alla kurser som finns (lista av strängar)
app.get('/API/courseList', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(courseList));
    console.log('list of courses requested');
})


app.listen(8080);
