'use strict';

var zlib = require('zlib');
var ever = require('ever');
var bit_twiddle = require('bit-twiddle');
var popCount = bit_twiddle.popCount;

var onDecompressed = function(id, decompressed, payload) {
  console.log('onDecompressed',id);

  var inflated = new Buffer(new Uint8Array(decompressed));
  console.log('  decomp', id, inflated.length);

  // unpack chunk data
  // based on https://github.com/superjoe30/mineflayer/blob/cc3eae10f622da24c9051268e9fc8ec3fe01ed7e/lib/plugins/blocks.js#L195
  // and http://wiki.vg/SMP_Map_Format#Data
  var offset = 0;
  var meta = 0;
  var size = 0;
  for (var i = 0; i < payload.meta.length; i += 1) {
    meta = payload.meta[i];
    size = (8192 + (payload.skyLightSent ? 2048 : 0)) *
      popCount(meta.bitMap) +
      2048 * popCount(meta.addBitMap) + 256;
    self.postMessage({
      x: meta.x,
      z: meta.z,
      bitMap: meta.bitMap,
      addBitMap: meta.addBitMap,
      skyLightSent: payload.skyLightSent,
      groundUp: true,
      data: inflated.slice(offset, offset + size), // TODO: transferrable
    });
    offset += size;
  }

  if (offset !== inflated.length) {
    console.log('incomplete chunk decode: '+offset+' != '+inflated.length);
  }
};

var onMessage = function(ev) {
  var payload = ev.data.payload;
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

    onDecompressed(id, decompressedBuffer, payload);
    /*
    self.postMessage({
        id:id,
        decompressed:decompressedBuffer},
      [decompressedBuffer]);
      */
  });
};

module.exports = function() {
  ever(self).on('message', onMessage);
};

