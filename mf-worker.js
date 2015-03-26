'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');
var duplexer = require('duplexer');
var toBufferStream = require('tobuffer-stream');
var Writable = require('stream').Writable;
var through = require('through');

module.exports = function(self) {
  console.log('mf-worker initializing',self);

  self.readStream = ParentStream().pipe(toBufferStream).pipe(through(function write(event) {
    if (Buffer.isBuffer(event)) {
      // buffer data passes through to readStream -> duplexStream for bot
      this.queue(event);
    } else {
      // divert non-packet data, tells us what to do from the main thread
      console.log('mfworker NON-BUFFER DATA:',event);
      var cmd = event.cmd;
      var f = self[event.cmd];
      if (!f) {
        console.log('mfworker received unhandled cmd: ',event,data);
        return;
      }
      f.call(self, event);
    }
  }));

  self.writeStream = Writable();
  self.writeStream._write = function(chunk, encoding, next) {
    //console.log('write',chunk);
    var arrayBuffer = chunk.buffer;
    self.postMessage({cmd: 'packet', data: arrayBuffer}, [arrayBuffer]); // transferrable; arrayBuffer now deleted
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
    console.log('mf-worker spawn position: '+JSON.stringify(self.bot.spawnPoint));
    self.postMessage({cmd: 'spawn', spawnPoint: self.bot.spawnPoint});
  });

  self.bot.on('kicked', function(reason) {
    self.postMessage({cmd: 'kicked', reason: reason});
  });

  self.bot.on('message', function(message) {
    //self.console.logNode(tellraw2dom(message.json)); // TODO: send back to parent
    console.log('mf-worker chat message', message);
    self.postMessage({cmd: 'chat', message: message});
  });


  // handlers called for main thread
  self.chat = function(event) {
    self.bot.chat(event.text);
  };
};

