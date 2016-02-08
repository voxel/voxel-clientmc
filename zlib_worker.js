'use strict';

const zlib = require('zlib');
const ever = require('ever');

module.exports = function() {
  ever(self).on('message', function(ev) {
    const compressedArrayBuffer = ev.data.compressed;
    const compressedArrayView = new Uint8Array(compressedArrayBuffer, ev.data.byteOffset, ev.data.byteLength);
    const compressedBuffer = new Buffer(compressedArrayView);

    const id = ev.data.id;
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

      const decompressedBuffer = decompressed.buffer;
      self.postMessage({
          id:id,
          decompressed:decompressedBuffer},
        [decompressedBuffer]);
    });
  });
};

