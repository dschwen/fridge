var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , mime = require('mime')
  , files = [ 
      'lib/jquery.event.drag-2.2.min.js', 
      'css/styles.css', 'index.html', 'favicon.ico' 
    ], cache = {}
  , alias = { '/': '/index.html' }
  , i,j,k
  , words = [ 'face','head','pipe','computer','server','screen','link','knowledge',
              'shower', 'crowd', 'Google+', 'Facebook','JavaScript','community',
              'envy','passion','love',
              'fresh', 'full', 'bursting','delicious',
              'he','she','it','me','I','you','your','then','if',
              'is','are','am','have','be','will','want','let','can',
              'give','come','see','read','comprehend','shoot','turn','create','show',
              'the', 'the', 'a', 'an', 'all', 'no',
              'into', 'out', 'from', 'to', 'in', 'on','with','for','about','of',
              'gigantic', 'hard', 'soft', 'intellectual', 'digital', 'burgeois',
              'interactive', 'sun','meadow',
              'ing','es','s','y',
              'and','or','not','never','always','sometime','some','any',
              'chocolate','brown','blue','red','right','wrong','weak','strong'
          ]
  , users = {}
  , mag = []
;
  //, mongodb = require('mongodb'), db, mcol = null, map = {d:[]}

// build file cache
function addToCache(file) {
  fs.readFile( __dirname + '/public/' + file,
  function( err, data ) {
    if( err ) {
      throw err;
    }
    cache['/'+file] = { data: data, type: mime.lookup(__dirname + '/' + file) };
  });
}
for( i = 0; i < files.length; ++i ) {
  addToCache(files[i]);
}


// start listening on port
app.listen( process.env.PORT || 8080 );

// serve cached files, return error if not explicitly listed in files table
function handler( req, res ) {
  console.log(req.url);

  // apply aliasing
  if( alias[req.url] ) {
    req.url = alias[req.url];
  } 

  // trap invalid requests
  if( !cache[req.url] ) {
    res.writeHead(500);
    return res.end('Error loading ' + req.url);
  }

  res.writeHead( 200, { 'Content-Type': cache[req.url].type } );
  res.end(cache[req.url].data);
}

// init game
function initFridge() {
  //users[id].socket.emit('stopround', { list: users[id].list } );
  var i;
  for( i = 0; i < words.length; ++i ) {
    mag.push({
      word: words[i], 
      hold: null,
      x: Math.floor(Math.random()*700), 
      y: Math.floor(Math.random()*550),
      phi: Math.floor(Math.random()*600.0-300.0)/100.0
    })
  }
}
initFridge();

io.sockets.on('connection', function (socket) {

  users[socket.id] = { socket: socket };
  socket.emit( 'words', mag );
  
  socket.on('dragstart', function (data) {
    // someone is already holding it
    if(  mag[data.n].hold !== null ) {
    }

    // otherwise broadcast pickup and log
    socket.broadcast.emit( 'held', { n: data.n } );
    mag[data.n].hold = socket.id;
  });

  socket.on('dragstop', function (data) {
    // someone is holder dropping it?
    if(  mag[data.n].hold !== socket.id ) {
      return; // ignore spoofed event
    }

    // otherwise broadcast and set new location
    mag[data.n].x = data.x;
    mag[data.n].y = data.y;
    mag[data.n].hold = null;
    io.sockets.emit( 'move', { n: data.n, x: data.x, y: data.y } );
  });

  socket.on('disconnect', function () {
    io.sockets.emit('userleft', { name: users[socket.id].name } );
    users[socket.id] = undefined;
  });


});

