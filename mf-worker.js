'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');
var duplexer = require('duplexer');
var toBufferStream = require('tobuffer-stream');
var Writable = require('stream').Writable;

module.exports = function(self) {
  console.log('mf-worker initializing',self);

  self.readStream = ParentStream().pipe(toBufferStream);
  self.writeStream = Writable();
  self.writeStream._write = function(chunk, encoding, next) {
    console.log('write',chunk);
    self.postMessage({data: chunk}); // TODO: transferrable
    // TODO: handle message on main
    next();
  };


  self.duplexStream = duplexer(self.writeStream, self.readStream);

  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.duplexStream,
  });

  // if we exist (the webworker), socket is connected
  //self.bot.client.emit('connect'); // actually, don't let it send the username; read back TODO: fix
  self.bot.client.state = 'login'; // go directly to login, skip handshake

  console.log('mf-worker bot',self.bot);

  self.bot.on('game', function() {
    console.log('Spawn position: '+JSON.stringify(self.bot.spawnPoint));
  });

  self.bot.on('kicked', function(reason) {
    console.log('mf-worker bot kicked because:',reason);
  });
};

