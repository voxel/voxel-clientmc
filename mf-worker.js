'use strict';

var ParentStream = require('workerstream/parent');

module.exports = function(self) {
  self.onmessage = function(event) {
    console.log('mf-worker onmessage',event);
    self.postMessage({whats: 'up'});
  };
};

