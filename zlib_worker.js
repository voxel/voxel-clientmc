'use strict';

var zlib = require('zlib');
var ever = require('ever');

module.exports = function() {
  ever(self).on('message', function(ev) {
    var compressedArrayBuffer = ev.data.compressed;
    var compressedArrayView = new Uint8Array(compressedArrayBuffer, ev.data.byteOffset, ev.data.byteLength);
    var compressedBuffer = new Buffer(compressedArrayView);

    var id = ev.data.id;
    console.log('worker decomp start '+id+' len'+compressedBuffer.length);

    zlib.inflate(compressedBuffer, function(err, decompressed) {
      console.log('worker err'+ err);
      if(err) {
        self.postMessage({
            id:id,
            compressed:compressedArrayBuffer,
            err:err.toString()}, // toString() to make cloneable
          [compressedArrayBuffer]);
        return;
      }

      var decompressedBuffer = decompressed.buffer;
      self.postMessage({
          id:id,
          decompressed:decompressedBuffer},
        [decompressedBuffer]);
    });
  });
};

