websocket_stream = require 'websocket-stream'
minecraft_protocol = require 'minecraft-protocol'
ever = require 'ever'
zlib = require 'zlib-browserify'

module.exports = (game, opts) ->
  return new ClientMC(game, opts)

module.exports.pluginInfo =
  loadAfter: ['voxel-land', 'voxel-player', 'voxel-registry']


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
  for i in [0...16]
    count += +!!((1 << i) & n)
  count

class ClientMC
  constructor: (@game, @opts) ->
    @registry = @game.plugins?.get('voxel-registry') ? throw 'voxel-clientmc requires voxel-registry plugin'

    @opts.url ?= 'ws://localhost:1234'

    # map http://minecraft.gamepedia.com/Data_values#Block_IDs to our block names
    @opts.mcBlocks ?= 
      0: 'air'
      1: 'stone'
      2: 'grass'
      3: 'dirt'
      4: 'cobblestone'
      5: 'planksOak'

      7: 'obsidian'   # bedrock

      16: 'oreCoal'

      17: 'logOak'
      18: 'leavesOak'

      161: 'leavesOak'
      162: 'logOak'

      default: 'brick'

    @unrecognizedBlocks = {}

    @enable()

  enable: () ->
    @game.plugins?.disable('voxel-land')    # also provides chunks, use ours instead
    #@game.plugins?.get('voxel-player').homePosition = [-248, 77, -198] # can't do this TODO
    @game.plugins?.get('voxel-player').moveTo -251, 81, -309
    @game.plugins?.enable('voxel-fly')

    @ws = websocket_stream(@opts.url, {type: Uint8Array})

    @game.voxels.on 'missingChunk', @missingChunk.bind(this)

    @voxelChunks = {}

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
      #console.log payload
      compressed = payload.compressedChunkData
      #console.log 'map_chunk_bulk',compressed.length
      #console.log 'payload.meta', payload
      return if !payload.meta?

      return if @columnsAdded > 0  # TODO: remove. for faster testing decompression

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
            2048 * onesInShort(meta.addBitMap) + 256
          @addColumn(
            x: meta.x
            z: meta.z
            bitMap: meta.bitMap
            addBitMap: meta.addBitMap
            skyLightSent: payload.skyLightSent
            groundUp: true
            data: inflated.slice(offset, offset + size)
          ) if meta.x == -16 and meta.z == -20  # TODO: remove. for faster testing only one column
          offset += size

        if offset != inflated.length
          console.log "incomplete chunk decode: #{offset} != #{inflated.length}"


  addColumn: (args) ->
    started = window.performance.now()

    chunkX = args.x
    chunkZ = args.z
    console.log 'add column', chunkX, chunkZ

    column = []

    offset = 0
    size = 4096
    for chunkY in [0...16]
      if args.bitMap & (1 << chunkY)
        miniChunk = args.data.slice(offset, offset + size)
        offset += size

        # convert MC's chunks to voxel-engine's
        # TODO: speed this up somehow
        for dy in [0...16]
          z = chunkZ*16 + dz
          for dz in [0...16]
            y = chunkY*16 + dy
            for dx in [0...16]
              x = chunkX*16 + dx

              # MC uses XZY ordering, 16x16x16 mini-chunks
              blockType = miniChunk[dx + dz*16 + dy*16*16]
              if !blockType?
                console.log('no block!', args)
                debugger

              # voxel-engine uses XYZ, (by default) 32x32x32
              vchunkXYZ = @game.voxels.chunkAtCoordinates(x, y, z)  # calculates chunk coordinates

              vchunkKey = vchunkXYZ.join('|')
              @voxelChunks[vchunkKey] ?= new @game.arrayType(@game.chunkSize * @game.chunkSize * @game.chunkSize)

              blockName = @opts.mcBlocks[blockType]

              if not blockName?
                # save count of unrecognized IDs, then use placeholder
                @unrecognizedBlocks[blockType] ?= 0
                @unrecognizedBlocks[blockType] += 1
                blockName = @opts.mcBlocks.default

              ourBlockType = @registry.getBlockID(blockName)

              # our block offsets within the chunk, scaled
              vindex = @game.voxels.voxelIndexFromCoordinates(x, y, z)
              @voxelChunks[vchunkKey][vindex] = ourBlockType

      else
        # entirely air

    # TODO: metadata,light,sky,add,biome
    
    finished = window.performance.now()
    console.log "took #{finished - started} ms"
    @columnsAdded ?= 0
    @columnsAdded += 1

  missingChunk: (pos) ->
    voxels = @voxelChunks[pos.join('|')]
    return if not voxels?

    chunk = {
      position: pos
      dims: [@game.chunkSize, @game.chunkSize, @game.chunkSize]
      voxels: voxels
    }

    @game.showChunk(chunk)

