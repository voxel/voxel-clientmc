'use strict';

var ndarray = require('ndarray');
var mineflayer = require('wsmc/mineflayer-stream');
var websocket_stream = require('websocket-stream');
var ever = require('ever');
var tellraw2dom = require('tellraw2dom');
var webworkify = require('webworkify');
var workerstream = require('workerstream');
var vec3Object = require('vec3'); // note: object type used by mineflayer, NOT gl-vec3 which is just a typed array :(
var typedArrayToBuffer = require('typedarray-to-buffer');

module.exports = function(game, opts) {
  return new ClientMC(game, opts);
};

module.exports.pluginInfo = {
  loadAfter: ['voxel-land', 'voxel-player', 'voxel-registry', 'voxel-console', 'voxel-commands']
};


function ClientMC(game, opts) {
  this.game = game;
  this.opts = opts;

  this.registry = game.plugins.get('voxel-registry');
  if (!this.registry) throw new Error('voxel-clientmc requires voxel-registry plugin');

  if (this.game.voxels.voxelIndex) { // ndarray voxel removes this in https://github.com/maxogden/voxel/pull/18 TODO: better detection?
    throw new Error('voxel-clientmc requires voxel-engine with ndarray support');
  }

  this.console = game.plugins.get('voxel-console'); // optional
  this.commands = game.plugins.get('voxel-commands'); // optional

  opts.url = opts.url || 'ws://'+document.location.hostname+':24444/server';

  // Translate network block indices to our block names
  // http://minecraft.gamepedia.com/Data_values#Block_IDs http://minecraft-ids.grahamedgecombe.com/
  // TODO: get translation table from network protocol? I think Forge supports custom blocks with the map sent over the network?
  // TODO: move to app/blocks.js?
  opts.mcBlocks = opts.mcBlocks || {
      0: 'air',
      1: 'stone',
      2: 'grass',
      3: 'dirt',
      4: 'cobblestone',
      5: 'plankOak',
      //6: 'sapling',
      7: 'bedrock',
      8: 'waterFlow',
      9: 'water',
      10: 'lavaFlow',
      11: 'lavaFlow',
      12: 'sand',
      13: 'gravel',
      14: 'oreGold',
      15: 'oreIron',
      16: 'oreCoal',
      17: 'logOak',
      18: 'leavesOak',
      19: 'sponge',
      20: 'glass',
      21: 'oreLapis',
      22: 'blockLapis',
      23: 'dispenser', // TODO: direction
      24: 'sandstone',
      25: 'noteblock',
      //26: 'bed',
      //27: 'railPowered',
      //28: 'railDetector',
      //29: 'pistonSticky',
      //30: 'web',
      //31: 'shrubDead',
      //33: 'piston',
      //34: 'pistonHead',
      35: 'wool',
      //36: ?
      //37: 'dandelion',
      //38: 'poppy',
      //39: 'mushroomBrown',
      //40: 'mushroomRed',
      41: 'blockGold', // voxel-decorative
      42: 'blockIron', // voxel-decorative
      //43: 'slabDouble',
      //44: 'slabStone',
      45: 'brick',
      46: 'tnt',
      47: 'bookshelf',
      48: 'stoneMossy',
      49: 'obsidian',
      //50: 'torch',
      //51: 'fire',
      //52: 'monsterSpawner',
      //53: 'stairsOakWood',
      54: 'chest', // voxel-chest
      //55: 'redstoneWire',
      56: 'oreDiamond',
      57: 'blockDiamond', // voxel-decorative
      58: 'workbench', // voxel-workbench
      //59: 'crops',
      60: 'farmland',
      61: 'furnace',
      62: 'furnace', // TODO: lit
      //63: 'signPost',
      //64: 'doorWood',
      //65: 'ladder',
      //66: 'rails',
      //67: 'stairsCobble',
      //68: 'signWall',
      //69: 'lever',
      //70: 'plateStone',
      //71: 'doorIron',
      //72: 'plateWood',
      73: 'oreRedstone',
      74: 'oreRedstone', // TODO: glowing
      //75: 'redstoneTorchOff',
      //76: 'redstoneTorchOn',
      //77: 'buttonStone',
      78: 'snow', // TODO: non-block snow
      79: 'ice',
      80: 'snow',
      81: 'cactus',
      82: 'clay',
      //83: 'sugarcane',
      84: 'jukebox',
      //85: 'fence',
      86: 'pumpkinCarvedNorth', // voxel-pumpkin
      87: 'netherrack',
      88: 'soulsand',
      89: 'glowstone',
      90: 'portal',
      91: 'pumpkinCarvedNorthLit', // voxel-pumpkin
      //92: 'cake',
      //93: 'repeaterOff',
      //94: 'repeaterOn',
      //95: 'glassStained',
      //96: 'hatch',
      97: 'stone', // silverfish
      98: 'stoneBrick', // voxel-decorative
      //'98:1': 'stoneBrickMossy', // TODO
      //'98:2': 'stoneBrickCracked',
      //'98:3': 'stoneBrickCarved',
      99: 'mushroomBigRed',
      100: 'mushroomBigBrown',
      //101: 'barsIron',
      //102: 'glassPane',
      103: 'blockMelon',
      //104: 'pumpkinStem',
      //105: 'melonStem',
      //106: 'vines',
      //107: 'fenceGate',
      //108: 'stairsBrick',
      //109: 'stairsStoneBrick',
      110: 'mycelium',
      //110: 'lilypad',
      112: 'brickNether',
      //113: 'fenceNether',
      //114: 'stairsNether',
      //115: 'netherwart',
      //116: 'enchantmentTable',
      //117: 'brewingStand',
      //118: 'cauldron',
      //119: 'endPortal',
      120: 'endPortalFrame',
      121: 'endstone',
      //122: 'dragonEgg',
      123: 'lampOff',
      124: 'lampOn',
      //125: 'slabDoubleOak',
      //126: 'slabOak',
      //127: 'cocoa',
      //128: 'stairsSandstone',
      129: 'oreEmerald',
      //130: 'chestEnder',
      //131: 'tripwireHook',
      //132: 'tripwire',
      133: 'blockEmerald',
      //134: 'stairsSpruce',
      //135: 'stairsBrich',
      //136: 'stairsJungle',
      137: 'command',
      //138: 'beacon',
      //139: 'wallCobblestone',
      //140: 'flowerPot',
      //141: 'carrots',
      //142: 'potatoes',
      //143: 'buttonWood',
      //144: 'headMob',
      //145: 'anvil',
      //146: 'chestTrapped',
      //147: 'plateLight',
      //148: 'plateHeavy',
      //149: 'comparatorOff',
      //150: 'comparatorOn',
      //151: 'daylightSensor',
      152: 'blockRedstone',
      153: 'oreNetherQuartz',
      //154: 'hopper',
      155: 'blockQuartz',
      //156: 'stairsQuartz',
      //157: 'railActivator',
      158: 'dropper',
      159: 'clayStainedWhite',
      //160: 'glassPaneStained',
      161: 'leavesAcacia',
      162: 'logAcacia',
      //163: 'stairsAcacia',
      //164: 'stairsDarkOak',
      //165: 'blockSlime',
      //166: 'barrier',
      //167: 'hatchIron',
      170: 'hayBale',
      //171: 'carpet',
      172: 'clayHardened',
      173: 'blockCoal',
      //174: 'icePacked',
      //175: 'sunflower',

      default: 'missing'
  };
    
  this.enable();
}

ClientMC.prototype.enable = function() {
  this.log('voxel-clientmc initializing...');

  this.game.plugins.disable('voxel-land');   // also provides chunks, use ours instead
  //this.game.plugins.get('voxel-player').homePosition = [-248, 77, -198] // can't do this TODO
  //this.game.plugins.get('voxel-player').moveTo -251, 81, -309

  // login credential
  var username;
  var hash = document.location.hash;
  if (hash.length < 2) {
    // try anonymous auth
    username = 'mcwebchatuserX';
  } else {
    username = hash.substring(1); // remove #
  }

  this.websocketStream = websocket_stream(this.opts.url);
  var self = this;
  this.websocketStream.on('connect', function() {
    console.log('websocketStream connected, launching worker');

    self.mfworker = webworkify(require('./mf-worker.js'));
    self.mfworkerStream = workerstream(self.mfworker);

    // handle outgoing mfworker data and commands
    self.mfworkerStream.on('data', function(event) {
      console.log('mfworkerStream event',event);
      var cmd = event.cmd;
      if (cmd === 'packet') {
        self.websocketStream.write(typedArrayToBuffer(event.data));
      } else if (cmd === 'chat') {
        self.console.logNode(tellraw2dom(event.message.json));
      } else {
        console.log('TODO: unhandled mfworker',cmd,event);
        // TODO: more
      }
    });

    // pipe incoming wsmc data to mfworker
    self.websocketStream.pipe(self.mfworkerStream);
  });

  // create bot TODO: fully move to mf-worker
  /*
  this.bot = mineflayer.createBot({
    username: username,
    stream: this.websocketStream,
  });
  */

  this.game.voxels.on('missingChunk', this.missingChunk.bind(this));

  this.voxelChunks = {};

  /* TODO

  // WebSocket to server proxy (wsmc)
  var self = this;
  this.bot.on('error', function(err) {
    self.log('WebSocket error', err);
    console.log('WebSocket error',err);
    self.game.plugins.disable('voxel-clientmc');
  });
  this.bot.on('close', function() {
    self.log('WebSocket closed');
    self.game.plugins.disable('voxel-clientmc');
  });

  var self = this;
  this.bot.on('message', function(message) {
    self.console.logNode(tellraw2dom(message.json));
  });

  if (this.console) this.console.widget.on('input', this.onConsoleInput = function(text) {
    self.bot.chat(text);
  });

  // block events

  this.bot.on('chunkColumnLoad', function(point) {
    self.addColumn(point);
  });

  var pos = [0,0,0];
  this.bot.on('blockUpdate', function(oldBlock, newBlock) {
    console.log('blockUpdate', oldBlock, newBlock);
    var position = newBlock.position;
    pos[0] = position.x;
    pos[1] = position.y;
    pos[2] = position.z;
    var val = self.translateBlockIDs[newBlock.type];
    self.game.setBlock(pos, val);
  });
  // TODO: also handle mass block update (event? would like to optimize multi_block_change, but..)


  this.bot.on('kicked', function(reason) {
    window.alert('Disconnected from server: '+reason); // TODO: console, also for chat
  });

  this.bot.on('game', function() {
    self.console.log('Spawn position: '+JSON.stringify(self.bot.spawnPoint));
    self.game.controls.target().avatar.position.x = self.bot.spawnPoint.x;
    self.game.controls.target().avatar.position.y = self.bot.spawnPoint.y+50; // give some space to fall while chunks load TODO: move after all chunks load instead
    self.game.controls.target().avatar.position.z = self.bot.spawnPoint.z;

    self.commands.isConnectedToServer = true;
  });
  */

  var maxId = 255; // TODO: 4096?

  // array MC block ID -> our block ID
  // TODO: also support .metadata (MC block ID = 12-bits, meta = 4-bits, total 16-bits -> ours 16 bit)
  this.translateBlockIDs = new this.game.arrayType(maxId);
  for (var mcID = 0; mcID < this.translateBlockIDs.length; mcID += 1) {
    this.translateBlockIDs[mcID] = this.registry.getBlockIndex(this.opts.mcBlocks.default);
  }

  for (mcID in this.opts.mcBlocks) {
    var ourBlockName = this.opts.mcBlocks[mcID];
    var ourBlockID = this.registry.getBlockIndex(ourBlockName);
    if (ourBlockID === undefined)
      throw new Error('voxel-clientmc unrecognized block name: '+ourBlockName+' for MC '+mcID);
    this.translateBlockIDs[mcID] = ourBlockID;
  }

  // for chunk conversion - see voxel/chunker.js
  this.chunkBits = Math.log(this.game.chunkSize) / Math.log(2); // must be power of two
  this.chunkBits |= 0;
  this.chunkMask = (1 << this.chunkBits) - 1;
};

ClientMC.prototype.disable = function() {
  this.log('voxel-clientmc disabling');
  this.game.voxels.removeListener('missingChunk', this.missingChunk);
  this.game.plugins.get('voxel-console').widget.removeListener('input', this.onConsoleInput);
  this.ws.end();
  if (this.clearPositionUpdateTimer) this.clearPositionUpdateTimer();
};

ClientMC.prototype.decodePacket = function(data) { // based on https://github.com/deathcap/wsmc/tree/master/examples/mcwebchat
  if (!(data instanceof Uint8Array)) {
    return undefined;
  }

  // convert typed array to NodeJS buffer for minecraft-protocol's API
  // TODO: is this conversion fast? backed by ArrayBuffer in Browserify 3, see https://npmjs.org/package/native-buffer-browserify
  //  but is this the right way to "convert" from an ArrayBuffer to a Buffer, without copying?
  data._isBuffer = true;
  var buffer = new Buffer(data);


  var state = 'play';
  var isServer = false;
  var packetsToParse = {packet: true};
  var result = minecraft_protocol.protocol.parsePacket(buffer, state, isServer, packetsToParse);
  if (!result || result.error) {
    this.log('protocol parse error: ' + JSON.stringify(result.error));
    return undefined;
  }

  var payload = result.results;
  var id = result.results.id;
  var name = minecraft_protocol.protocol.packetNames[minecraft_protocol.protocol.states.PLAY].toClient[id];

  return {name:name, id:id, payload:payload};
};


// call the browser console.log() function with arguments as an array
ClientMC.prototype.nativeConsoleLog = function(args) {
  Function.prototype.bind.call(console.log, console).apply(console, args); // see http://stackoverflow.com/questions/5538972
};

// log to browser and to user console if available
ClientMC.prototype.log = function(msg) {
  var rest = []; //arguments.slice(1); // TODO
  this.nativeConsoleLog(['[voxel-clientmc] ' + msg].concat(rest));  // as separate parameters to allow object expansion
  if (this.console) this.console.log(msg + ' ' + rest.join(' '));
};

/* TODO: integrate with mineflayer
ClientMC.prototype.handlePacket = function(name, payload) {
  var self = this;

  if (name === 'position') {
    // TODO, yaw, pitch. to convert see http://wiki.vg/Protocol#Player_Position_And_Look
    this.log('player pos and look', payload);
    var ourY = payload.y - 1.62; // empirical  TODO: not playerHeight?
    var pos = this.game.plugins.get('game-shell-fps-camera').camera.position;
    pos[0] = payload.x;
    pos[1] = ourY;
    pos[2] = payload.z;

    // the "apology"
    this.sendPacket('position', payload);
};
*/

// convert MC chunk format to ours, caching to be ready for missingChunk()
var CHUNKS_ADDED = 0;
ClientMC.prototype.addColumn = function(point) {
  if (CHUNKS_ADDED >= 2) return; // only a few for testing
  this.console.log('Chunk load ('+point.x+','+point.y+','+point.z+')');
  var chunkX = point.x;
  var chunkZ = point.z;

  var started = window.performance.now();
  // call blockAt around chunk size TODO: optimized iterator
  var v = vec3Object(chunkX, 0, chunkZ);
  var a = [chunkX, 0, chunkZ];
  var chunkSizeX = 16;
  var chunkSizeY = 256;
  var chunkSizeZ = 16;
  for (var i = chunkSizeY - 1; i; i -= 1) {
    for (var j = 0; j < chunkSizeX; j += 1) {
      for (var k = 0; k < chunkSizeZ; k += 1) {

        v.x = a[0] = chunkX + j;
        v.y = a[1] = i;
        v.z = a[2] = chunkZ + k;

        var blockObject = this.bot.blockAt(v);
        if (!blockObject) continue; // TODO: fix out of bounds?

        var mcBlockID = blockObject.type;
        var ourBlockID = this.translateBlockIDs[mcBlockID]; // TODO: metadata?

        var chunkIndex = this.game.voxels.chunkAtCoordinates(a[0], a[1], a[2]);
        var chunkKey = chunkIndex.join('|');
        var chunk = this.game.voxels.chunks[chunkKey];
        if (!chunk) {
          // create new chunk TODO: refactor, similar chunk data store object creation in voxel-land
          var width = this.game.chunkSize;
          var pad = this.game.chunkPad;
          var buffer = new ArrayBuffer((width+pad) * (width+pad) * (width+pad) * this.game.arrayType.BYTES_PER_ELEMENT);
          var voxels = new self.game.arrayType(buffer);
          chunk = ndarray(new self.game.arrayType(buffer), [width+pad, width+pad, width+pad]);
          chunk.position = [chunkIndex[0], chunkIndex[1], chunkIndex[2]];

          //var h = pad >>> 1;
          //var chunkUnpadded = chunk.lo(h,h,h).hi(width,width,width); // for easier access
          this.game.voxels.chunks[chunkKey] = chunk;
          console.log('Created new chunk '+chunkKey);
        }

        //this.game.setBlock(a, ourBlockID); // instead, faster direct chunk access below (avoids events)
        //this.game.addChunkToNextUpdate({position: chunkIndex});
        this.game.chunksNeedsUpdate[chunkKey] = this.game.voxels.chunks[chunkKey]; // dirty for showChunk TODO: accumulate all first, then one showChunk at end
        //this.game.voxels.voxelAtPosition(a, ourBlockID);
        var mask = this.game.voxels.chunkMask;
        var h = this.game.voxels.chunkPadHalf;
        var mx = a[0] & mask;
        var my = a[1] & mask;
        var mz = a[2] & mask;
        chunk.set(mx+h, my+h, mz+h, ourBlockID);
      }
    }
  }
  var took = window.performance.now() - started;
  console.log('chunk added in '+took);
  CHUNKS_ADDED += 1;

/*
  var offset = 0;
  var size = 4096;
  var s = this.game.chunkSize + this.game.chunkPad;
  var length = column.blockType.length;
  for (var chunkY = 0; chunkY < length; chunkY += 1) {
    var miniChunk = column.blockType[chunkY];
    if (miniChunk === null) continue; // skip 100% solid air

    // translate network block IDs
    for (var i = 0; i < miniChunk.length; i += 1) {
        var mcBlockID = miniChunk[i];
        var ourBlockID = this.translateBlockIDs[mcBlockID];
        //vChunk.data[i] = ourBlockID;
        miniChunk[i] = ourBlockID;
    }

    var vChunk = ndarray(new this.game.arrayType(s*s*s), [s,s,s]);

    // transpose since MC uses XZY but voxel-engine XYZ
    // TODO: changes stride..requires clients to use ndarray API get(), not access .data directly..
    //  just switch to 100% ndarray-based voxel-engine?
    for (var x = 0; x < vChunk.shape[0]; x += 1) {
      for (var z = 0; z < vChunk.shape[1]; z += 1) {
        for (var y = 0; y < vChunk.shape[2]; y += 1) {
          vChunk.set(z+2, y+2, x+2, miniChunk[x | z<<4 | y<<8]);
        }
      }
    }

    // save TODO: avoid recreating array, mutate in-place?
    var key = [chunkX, chunkY, chunkZ].join('|');
    vChunk.position = [chunkX, chunkY, chunkZ];
    this.voxelChunks[key] = vChunk;
  }

  // TODO: metadata,light,sky,add,biome
  */
};

ClientMC.prototype.missingChunk = function(pos) {
  var chunk = this.voxelChunks[pos.join('|')];
  if (chunk === undefined) return;

  this.game.showChunk(chunk);
};


