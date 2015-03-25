'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');

var toBufferStream = require('tobuffer-stream');

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

