var expressio = require('express.io');

var app = expressio();
app.http().io();

var list = [
{id:1, name:'Helge',  place:"Pege" , comment:"Green"},
{id:2, name:'King',   place:"Pim" , comment:"Brown"},
{id:3, name:'Salad',   place:"Smith" , comment:"Red"}
];

app.use(expressio.static(__dirname + '/public'));


app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('listen', function(req) {
  console.log('a user added to ' + req.data);
  req.io.join(req.data);
})

app.io.route('join', function(req) {
  console.log('a user joined to ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('join', req.data.user);
  list.push(req.data.user);
})

app.io.route('leave', function(req) {
  console.log('a user left ' + req.data.queue);
  app.io.room(req.data.queue).broadcast('leave', req.data.user);

  for(var i = list.length - 1; i >= 0; i--) {
      if(list[i].name === req.data.user.name) {
        list.splice(i, 1);
      }
  }
})

// returns the queue-list
app.get('/API/getQueue', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(list));
})


app.listen(8080);







var queue = [
{
  name:'Anders',
  place:'Green 07',
  comment:'hejsan'
},
{
  name:'Erik',
  place:'Green 06',
  comment:'svejsan'
},
{
  name:'Majsan',
  place:'Brun 09',
  comment:'lingonfejsan'
}];

