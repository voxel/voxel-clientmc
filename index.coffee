websocket_stream = require 'websocket-stream'
minecraft_protocol = require 'minecraft-protocol'
ever = require 'ever'
zlib = require 'zlib-browserify'

module.exports = (game, opts) ->
  return new ClientMC(game, opts)

decodePacket = (data) -> # based on https://github.com/deathcap/wsmc/tree/master/examples/mcwebchat
  if !(data instanceof Uint8Array)
    return undefined

  # convert typed array to NodeJS buffer for minecraft-protocol's API
  # TODO: is this conversion fast? backed by ArrayBuffer in Browserify 3, see https://npmjs.org/package/native-buffer-browserify
  #  but is this the right way to "convert" from an ArrayBuffer to a Buffer, without copying?
  data._isBuffer = true
  buffer = new Buffer(data)

  result = minecraft_protocol.protocol.parsePacket(buffer)
  if !result || result.error
    console.log('protocol parse error: ' + JSON.stringify(result.error))
    return undefined

  payload = result.results.data
  id = result.results.id
  name = minecraft_protocol.protocol.packetNames[minecraft_protocol.protocol.states.PLAY].toClient[id]

  return {name:name, id:id, payload:payload};


onesInShort = (n) ->
  n = n & 0xffff
  count = 0
  for i in [0..16]
    count += +((1 << i) & n)
  count

class ClientMC
  constructor: (@game, @opts) ->
    @opts.url ?= 'ws://localhost:1234'
    @enable()

  enable: () ->
    @game.plugins?.disable('voxel-land')    # conflicts

    @ws = websocket_stream(@opts.url, {type: Uint8Array})

    @game.voxels.on 'missingChunk', @missingChunk.bind(this)

    @columns = {}  # [chunkX,chunkZ][chunkY][block XYZ]

    @ws.on 'error', (err) ->
      console.log 'WebSocket error', err

    @ws.on 'data', (data) =>
      packet = decodePacket(data)
      if not packet?
        return

      @handlePacket packet.name, packet.payload

  disable: () ->
    @game.voxels.removeListener 'missingChunk', @missingChunk
    @ws.end()

  handlePacket: (name, payload) ->
    if name == 'map_chunk_bulk'
      console.log payload
      compressed = payload.compressedChunkData
      console.log 'map_chunk_bulk',compressed.length
      console.log 'payload.meta', payload
      return if !payload.meta?

      zlib.inflate compressed, (err, inflated) =>  # TODO: run in webworker?
        return err if err
        console.log '  decomp', inflated.length

        # unpack chunk data
        # based on https://github.com/superjoe30/mineflayer/blob/cc3eae10f622da24c9051268e9fc8ec3fe01ed7e/lib/plugins/blocks.js#L195
        # and http://wiki.vg/SMP_Map_Format#Data
        offset = meta = size = 0
        for meta, i in payload.meta
          size = (8192 + (if payload.skyLightSent then 2048 else 0)) *
            onesInShort(meta.bitMap) +
            2048 * onesInShort(meta.addBitMap) + 256;
          @addColumn(
            x: meta.x
            z: meta.z
            bitMap: meta.bitMap
            addBitMap: meta.addBitMap
            skyLightSent: payload.skyLightSent
            groundUp: true
            data: inflated.slice(offset, offset + size)
          )
          offset += size


  addColumn: (args) ->
    console.log 'add column', args

    column = []

    offset = 0
    size = 4096
    for y in [0..16]
      if args.bitMap & (1 << y)
        column[y] = args.data.slice(offset, offset + size)
        offset += size
      else
        column[y] = null   # entirely air

    # TODO: metadata,light,sky,add,biome


    @columns[args.x + '|' + args.z] = column # TODO: store better

    window.c = @columns

  missingChunk: (pos) ->
    console.log 'missingChunk',pos

    chunkXZ = Object.keys(@columns)[0]     # TODO: load actual chunk
    chunkY = 0
    if not @columns[chunkXZ]?
      console.log 'no chunkXZ ',chunkXZ
      return
    voxels = @columns[chunkXZ][chunkY]
    for i in [0...voxels.length]
      voxels[i] = voxels[i] & 15    # limit available block IDs TODO: map through v-registry

    chunk = {
      position: pos
      #dims: [32, 32, 32]   # TODO
      dims: [16, 16, 16]
      voxels: voxels}

    @game.showChunk(chunk)
    console.log 'voxels',voxels
