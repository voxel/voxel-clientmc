WebSocket = require 'ws'
ever = require 'ever'
zlib = require 'zlib-browserify'

module.exports = (game, opts) ->
  return new ClientMC(game, opts)


class ClientMC
  constructor: (@game, @opts) ->
    @opts.url ?= 'ws://localhost:1234'
    @enable()

  enable: () ->
    @ws = new WebSocket @opts.url
    ever(@ws).on 'open', () ->
      console.log 'WebSocket connected'

    ever(@ws).on 'error', (err) ->
      console.log 'WebSocket error', err

    ever(@ws).on 'message', (event, flags) ->
      packet = JSON.parse event.data
      [name, payload] = packet

      if name == 'map_chunk_bulk'
        console.log payload
        compressed = payload.data.compressedChunkData
        console.log 'map_chunk_bulk',compressed.length

        zlib.inflate compressed, (err, result) ->  # TODO: run in webworker
          console.log '  decomp', result.length
          console.log result

          # convert from Node's "Buffer" type to browser's typed arrays TODO: is this slow?
          chunksData = new Uint8Array(result)

          # http://wiki.vg/SMP_Map_Format#Data
          # each section packed into zero or more 16x16x16 mini-chunks
          at = 0
          miniChunks = []
          maxLength = result.length

          skyLightSent = payload.skyLightSent   # Skylight (only in map_chunk_bulk assumed true in map_chunk)
          groundUpContinuous = true             # Ground-up continuous (only in map_chunk - assumed true in map_chunk_bulk)
          while at < maxLength
            typeArray = chunksData.subarray(at, at += 16*16*16*1)   # Block type array - whole byte per block
            metaArray = chunksData.subarray(at, at += 16*16*16/2)   # Block metadata array - half byte per block
            lightArray = chunksData.subarray(at, at += 16*16*16/2)  # Block light array - half byte per block
            skyArray = chunksData.subarray(at, at += 16*16*16/2) if skyLightSent   # Sky light array - half byte per block - only if 'skylight' is true
            addArray = chunksData.subarray(at, at += 16*16*16/2)    # Add array - half byte per block - uses secondary bitmask
            biomeArray = chunksData.subarray(at, at += 256) if groundUpContinuous  # Biome array - whole byte per XZ coordinate, 256 bytes total, only sent if 'ground up continuous' is true

            miniChunks.push {types:typeArray}

          window.result = result
          window.x = this

          debugger

  disable: () ->
    #@ws.close()

