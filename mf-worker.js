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
    self.postMessage({packet: chunk}); // TODO: transferrable, [chunk], but has to be correct data type (ArrayBuffer)
    // TODO: handle message on main
    next();
  };


  self.duplexStream = duplexer(self.writeStream, self.readStream);

  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.duplexStream,
  });

  // if we exist (the webworker), socket is connected
  self.bot.client.emit('connect');

  console.log('mf-worker bot',self.bot);

  self.bot.on('game', function() {
    console.log('Spawn position: '+JSON.stringify(self.bot.spawnPoint));
    self.bot.chat('hello from mfworker');
  });

  self.bot.on('kicked', function(reason) {
    console.log('mf-worker bot kicked because:',reason);
  });

  self.bot.on('message', function(message) {
    //self.console.logNode(tellraw2dom(message.json)); // TODO: send back to parent
    console.log('mf-worker chat message', message);
    self.postMessage({chat: message});
  });
};

