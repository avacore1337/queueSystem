var expressio = require('express.io');

var app = expressio();
app.http().io();

app.use(expressio.static(__dirname + '/public'));


app.io.on('connection', function(socket){
  console.log('a user connected');
});

// Setup the ready route, join room and broadcast to room.
app.io.route('ready', function(req) {
	req.io.join(req.data);
	app.io.room(req.data).broadcast('announce', {
    name:'Anders',
    place:'Green 07',
    comment:'hejsan'
  });
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

