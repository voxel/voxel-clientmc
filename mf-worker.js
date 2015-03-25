'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');
var through = require('through');
var toBuffer = require('typedarray-to-buffer');
var isTypedArray = require('is-typedarray');

// convert Uint8Array from postmessage to nodejs/browserify augmented Buffer
var toBufferStream = through(function write(data) {
  if (isTypedArray(data) && !Buffer.isBuffer(data)) data = toBuffer(data);
  else if (e.data instanceof ArrayBuffer) data = new Buffer(new Uint8Array(data));
  this.queue(data);
});

module.exports = function(self) {
  console.log('mf-worker initializing',self);
  debugger;

  self.parentStream = ParentStream();

  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.parentStream.pipe(toBufferStream),
  });

  console.log('mf-worker bot',self.bot);

  self.bot.on('game', function() {
    console.log('Spawn position: '+JSON.stringify(self.bot.spawnPoint));
  });

  self.bot.on('kicked', function(reason) {
    console.log('mf-worker bot kicked because:',reason);
  });

  /*
  self.onmessage = function(event) {
    console.log('mf-worker onmessage',event);
    self.postMessage({whats: 'up'});
  };
  */
};

