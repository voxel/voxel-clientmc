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

// handlers called from mfworker
ClientMC.prototype.packet = function(event) {
  this.websocketStream.write(typedArrayToBuffer(event.data));
};

ClientMC.prototype.chat = function(event) {
  this.console.logNode(tellraw2dom(event.message.json));
};

ClientMC.prototype.spawn = function(event) {
  this.console.log('Spawn position: '+JSON.stringify(event.spawnPoint));
  this.game.controls.target().avatar.position.x = event.spawnPoint.x;
  this.game.controls.target().avatar.position.y = event.spawnPoint.y+50; // give some space to fall while chunks load TODO: move after all chunks load instead
  this.game.controls.target().avatar.position.z = event.spawnPoint.z;

  this.commands.isConnectedToServer = true;
};

ClientMC.prototype.kicked = function(event) {
  window.alert('Disconnected from server: '+event.reason); // TODO: console, also for chat
};

ClientMC.prototype.error = function(event) {
  this.console.log('Disconnected with error: ' + event.error);
  this.game.plugins.disable('voxel-clientmc');
};

ClientMC.prototype.close = function(event) {
  this.console.log('Websocket closed');
  this.game.plugins.disable('voxel-clientmc');
};

ClientMC.prototype.setBlock = function(event) {
  this.game.setBlock(event.position, event.value);
};

ClientMC.prototype.chunks = function(event) {
  for (var key in event.chunks) {
    var chunk = event.chunks[key];

    console.log('showChunk',key);

    // sending ndarray over postMessage loses prototype (cloning algorithm); reconstitute it TODO: optimize
    var realChunk = ndarray(chunk.data,
        [chunk._shape0, chunk._shape1, chunk._shape2],
        [chunk._stride0, chunk._stride1, chunk._stride2],
        chunk.offset);
    realChunk.position = chunk.position;

    this.game.showChunk(realChunk);
  };
};

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

    self.mfworkerStream.write({cmd: 'setTranslateBlockIDs', translateBlockIDs: self.translateBlockIDs});

    // handle outgoing mfworker data and commands
    self.mfworkerStream.on('data', function(event) {
      //console.log('mfworkerStream event',event);
      var cmd = event.cmd;
      var f = self[cmd];
      if (!f) {
        console.log('Unhandled mfworker cmd',cmd,event);
        return;
      }

      // call method on ourself with arguments
      f.call(self, event);
    });

    // pipe incoming wsmc data to mfworker
    self.websocketStream.pipe(self.mfworkerStream);
  });

  var self = this;
  if (this.console) this.console.widget.on('input', this.onConsoleInput = function(text) {
    self.mfworkerStream.write({cmd: 'chat', text: text});
    //self.bot.chat(text); // TODO: call in mfworker
  });

  this.game.voxels.on('missingChunk', this.missingChunk.bind(this));

  this.voxelChunks = {}; // TODO: use this?

  /* TODO

  // block events

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

ClientMC.prototype.missingChunk = function(pos) {
  var chunk = this.voxelChunks[pos.join('|')];
  if (chunk === undefined) return;

  this.game.showChunk(chunk);
};


