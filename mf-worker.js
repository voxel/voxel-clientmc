'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');

module.exports = function(self) {
  console.log('mf-worker initializing',self);
  console.log('Object=',Object.prototype);

  self.parentStream = ParentStream();

  /*
  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.parentStream,
  });

  console.log('mf-worker bot',self.bot);
  */

  self.onmessage = function(event) {
    console.log('mf-worker onmessage',event);
    //self.postMessage({whats: 'up'});
  };
};

