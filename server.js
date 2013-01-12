var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , mime = require('mime')
  , files = [ 
      'lib/jquery.event.drag-2.0.min.js', 
      'css/styles.css', 'index.html', 'favicon.ico' 
    ], cache = {}
  , alias = { '/': '/index.html' }
  , i,j,k
  , words = [ 'face','head','pipe','computer','server','screen','link','knowledge',
              'shower', 'crowd', 'Google+', 'Facebook','JavaScript','community',
              'envy','passion','love',
              'fresh', 'full', 'bursting','delicious',
              'he','she','it','me','I','you','your','then','if',
              'is','are','am','have','be','will','want',
              'give','come','see','read','comprehend','shoot','turn','create',
              'the', 'the', 'a', 'an', 'all', 'no',
              'into', 'out', 'from', 'to', 'in', 'on','with','for','about',
              'gigantic', 'hard', 'soft', 'intellectual', 'digital', 'burgeois',
              'interactive', 'sun','meadow',
              'ing','es','s','y',
              'not','never','always','sometime',
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

  socket.emit( 'words', mag );

  users[socket.id] = { ready: false, list: [], name: null, chat: '', vote: {}, status: 0, socket: socket };
  
  socket.on('login', function (data) {
    users[socket.id].name = data.name;
    users[socket.id].status = 1;
    socket.broadcast.emit( 'newuser', { name: users[socket.id].name } );
    socket.emit( 'magnets', { list: selected } );
  });

  socket.on('disconnect', function () {
    io.sockets.emit('userleft', { name: users[socket.id].name } );
    users[socket.id] = undefined;
  });

  socket.on('vote', function (data) {
    // is the vote open (callback set)
    if( votes[data.item] === undefined ) {
      console.log('Cheating! Voting on closed vote!');
      return false;
    }
    if( votes[data.item].status !== users[socket.id].status ) {
      console.log('User is not in the correct status!');
      return false;
    }

    // apply vote and vheck consensus
    users[socket.id].vote[data.item] = data.vote;
    var consensus = checkConsensus(data.item),
        callback = votes[data.item].fn;
    if( consensus !== undefined ) {
      closeVote(data.item);
      callback(consensus);
    }
  });

  // edit events get applied to the server copy of the map and rebroadcast to all clients
  socket.on('update', function (data) {
    //socket.broadcast.emit( 'update', data );
    if( users[socket.id].status === 2 ) {
      users[socket.id].list[data.n] = data.word;
      console.log(data);
    }
  } );


});

