
zlib = require 'zlib'
ever = require 'ever'

module.exports = () ->
  ever(@).on 'message', (ev) ->
    compressedArrayBuffer = ev.data.compressed
    compressedArrayView = new Uint8Array(compressedArrayBuffer, ev.data.byteOffset, ev.data.byteLength)
    compressedBuffer = new Buffer(compressedArrayView)

    id = ev.data.id
    console.log 'worker decomp start '+id+' len'+compressedBuffer.length
    debugger

    zlib.inflate compressedBuffer, (err, decompressed) => # TODO: handle error
      console.log 'worker err'+ err
      if err
        @postMessage {id:id, compressed:compressedArrayBuffer, err:err.toString()}, [compressedArrayBuffer] # toString() to make cloneable
        return

      decompressedBuffer = decompressed.buffer
      @postMessage {id:id, decompressed:decompressedBuffer}, [decompressedBuffer]


