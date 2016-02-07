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
var ItemPile = require('itempile');
var mcBlocks = require('./mcblocks');

module.exports = function(game, opts) {
  return new ClientMC(game, opts);
};

module.exports.pluginInfo = {
  loadAfter: [
    'voxel-land',
    'voxel-player',
    'voxel-registry',
    'voxel-console',
    'voxel-commands',
    'voxel-reach',
    'voxel-decals',
    'voxel-sfx',
    'voxel-carry',
    'voxel-use',
    'voxel-inventory-hotbar',
  ]
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
  this.reachPlugin = game.plugins.get('voxel-reach');
  if (!this.reachPlugin) throw new Error('voxel-clientmc requires voxel-reach plugin');
  this.decalsPlugin = game.plugins.get('voxel-decals');
  if (!this.decalsPlugin) throw new Error('voxel-clientmc requires voxel-decals plugin');
  this.sfxPlugin = game.plugins.get('voxel-sfx'); // optional
  this.carryPlugin = game.plugins.get('voxel-carry'); // optional
  this.usePlugin = game.plugins.get('voxel-use');
  if (!this.usePlugin) throw new Error('voxel-clientmc requires voxel-use plugin');
  this.hotbar = game.plugins.get('voxel-inventory-hotbar'); // optional

  opts.url = opts.url || 'ws://'+document.location.hostname+':24444/server';

  // Translate network block indices to our block names
  // http://minecraft.gamepedia.com/Data_values#Block_IDs http://minecraft-ids.grahamedgecombe.com/
  // TODO: get translation table from network protocol? I think Forge supports custom blocks with the map sent over the network?
  opts.mcBlocks = opts.mcBlocks || mcBlocks.mcBlockID2Voxel;
    
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
  this.game.controls.target().avatar.position.y = event.spawnPoint.y;
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
  this.game.plugins.disable('voxel-flatland');

  for (var key in event.chunks) {
    var chunk = event.chunks[key];

    //console.log('showChunk',key);

    // sending ndarray over postMessage loses prototype (cloning algorithm); reconstitute it TODO: optimize
    var realChunk = ndarray(chunk.data,
        [chunk.shape[0], chunk.shape[1], chunk.shape[2]],
        [chunk.stride[0], chunk.stride[1], chunk.stride[2]],
        chunk.offset);
    realChunk.position = chunk.position;

    console.log('Saving chunk',key);
    this.game.voxels.chunks[key] = realChunk;
    this.game.addChunkToNextUpdate(realChunk);
    //this.game.showChunk(realChunk);
  };
};

ClientMC.prototype.blockBreakProgressObserved = function(event) {
  var texture = 'destroy_stage_' + event.destroyStage;

  this.blockBreakProgress(event.position, texture);
};

ClientMC.prototype.blockBreakProgressEnd = function(event) {
  this.blockBreakProgress(event.position, null);
};


ClientMC.prototype.blockBreakProgress = function(position, texture) {
  // MC's break animations don't include the block face, so include them all
  var normals = [
    [1,0,0],
    [-1,0,0],
    [0,1,0],
    [0,-1,0],
    [0,0,1],
    [0,0,-1]];

  for (var i = 0; i < normals.length; ++i) {
    var normal = normals[i];
    if (texture) {
      this.decalsPlugin.change({position: position, normal: normal, texture: texture});
    } else {
      this.decalsPlugin.remove({position: position, normal: normal});
    }
  }

  this.decalsPlugin.update();
};

ClientMC.prototype.move = function(event) {
  this.game.controls.target().avatar.position.x = event.position[0];
  this.game.controls.target().avatar.position.y = event.position[1];
  this.game.controls.target().avatar.position.z = event.position[2];
};

ClientMC.prototype.sound = function(event) {
  //console.log('sound',event);
  if (this.sfxPlugin) {
    var path = event.soundName.replace('.', '/');
    // TODO: https://github.com/deathcap/artpacks/issues/14 Randomized sound effect lookup
    // for now, try either unnumbered or first effect variant
    this.sfxPlugin.play(path);
    this.sfxPlugin.play(path + '1');
  }
};

ClientMC.prototype._newItemPile = function(mcName, count, tags) {
  if (count === undefined) count = 1;
  if (tags) throw new Error('_newItemPile tags not yet supported'); // TODO

  let ourName;

  if (mcBlocks.mcBlockName2Voxel[mcName]) {
    ourName = mcBlocks.mcBlockName2Voxel[mcName];
  } else {
    ourName = mcName; // TODO: translate items too
  } // TODO: substitute unrecognized

  return new ItemPile(ourName, count);
}

ClientMC.prototype.setSlot = function(event) {
  console.log('setSlot',event);
  if (!this.carryPlugin) return;

  var mcSlot = 0;
  if (event.newItem) mcSlot = event.newItem.slot; // either may be null
  else if (event.oldItem) mcSlot = event.oldItem.slot;

  // http://wiki.vg/Protocol#Set_Slot
  var ourSlot;
  if (mcSlot >= 9) {
    // stored player inventory slots or hotbar
    var slotIndex = mcSlot - 9;
    var mcWidth = 9;
    var mcHeight = 4;
    var slotCol = slotIndex % mcWidth;
    var slotRow = Math.floor(slotIndex / mcWidth);

    if (slotRow === 3) {
      // our hotbar slots are at top, theirs at bottom TODO: change?
      slotRow = 0;
    } else {
      slotRow += (this.carryPlugin.inventory.height - mcHeight);
    }

    ourSlot = this.carryPlugin.inventory.width * slotRow + slotCol;
  } else if (mcSlot < 9) {
    switch(mcSlot) {
      case 0: return; // crafting output, can't set TODO: well, maybe?
      case 1: return; // crafting ingredients
      case 2: return;
      case 3: return;
      case 4: return;
      // armor slots TODO
      case 5: ourSlot = 10; break;
      case 6: ourSlot = 20; break;
      case 7: ourSlot = 30; break;
      case 8: ourSlot = 30; break;
    }
  } else {
    throw new Error('unrecognized mc inventory slot:'+event);
  }

  var pile = null;
  if (event.newItem) {
    var mcName = event.newItem.name;
    var count = event.newItem.count;

    pile = this._newItemPile(mcName, count);
  }

  this.carryPlugin.inventory.set(ourSlot, pile);
};

ClientMC.prototype.heldItemSlot = function(event) {
  if (!this.hotbar) return;

  this.hotbar.setSelectedIndex(event.slot);
};

ClientMC.prototype.resourcePack = function(event) {
  this.console.log('Server offered resource pack. Download then drag and drop in browser to install:');
  var link = document.createElement('a');
  link.href = event.url;
  link.title = event.hash;
  link.textContent = event.url;
  this.console.logNode(link);
};

ClientMC.prototype.enable = function() {
  // only begin connecting to server after voxel-engine is initialized,
  // since it shows chunks (game.showChunk) which requires engine initialization,
  // but plugins are "enabled" before the engine fully is
  this.game.on('engine-init', this.connectServer.bind(this));
};

ClientMC.prototype.connectServer = function() {
  this.log('voxel-clientmc connecting...');

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

    // pass some useful data to the worker
    self.mfworkerStream.write({cmd: 'setVariables',
      translateBlockIDs: self.translateBlockIDs,
      reverseBlockIDs: self.reverseBlockIDs,
      defaultBlockID: self.defaultBlockID,
      chunkSize: self.game.chunkSize,
      chunkPad: self.game.chunkPad,
      chunkPadHalf: self.game.voxels.chunkPadHalf,
      chunkMask: self.game.voxels.chunkMask,
      chunkBits: self.game.voxels.chunkBits,
      arrayTypeSize: self.game.arrayType.BYTES_PER_ELEMENT
    });

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

  //this.game.voxels.on('missingChunk', this.missingChunk.bind(this));

  //this.voxelChunks = {}; // TODO: use this?

  var position = [0,0,0];
  this.game.on('tick', function(dt) { // TODO: remove event on disable
    position[0] = self.game.controls.target().avatar.position.x;
    position[1] = self.game.controls.target().avatar.position.y;
    position[2] = self.game.controls.target().avatar.position.z;
    self.mfworkerStream.write({cmd: 'move', position: position});
  });

  // block events
  this.reachPlugin.on('start mining', function(target) { // TODO: remove events on disable
    console.log('start mining',target);
    if (!target) return; // no target (air)
    self.mfworkerStream.write({cmd: 'digStart', position:target.voxel, normal:target.normal});
  });
  this.reachPlugin.on('stop mining', function(target) {
    if (!target) target = self.reachPlugin.specifyTarget(); // TODO: why is this sometimes null? voxel-reach bug?
    console.log('stop mining',target);
    self.mfworkerStream.write({cmd: 'digStop', position:target.voxel, normal:target.normal});
  });

  this.usePlugin.on('usedBlock', function(target, held, newHeld) {
    console.log('usedBlock',target,held,newHeld);

    if (!target) return;

    //var value = self.registry.getBlockIndex(held.item);

    self.mfworkerStream.write({cmd: 'placeBlock', position:target.voxel, value:target.value});
  });

  if (this.hotbar) {
    this.hotbar.on('selectionChanging', function(event) {
      self.mfworkerStream.write({cmd: 'setHeldItem', slot:event.newIndex});
    });
  }

  var maxId = 4096; // 2^12 TODO: 2^16? for extended block IDs (plus metadata)

  // array MC block ID -> our block ID
  // packs 4-bit metadata in LSBs (MC block ID = 12-bits, meta = 4-bits, total 16-bits -> ours 16 bit)
  this.translateBlockIDs = new this.game.arrayType(maxId);
  this.reverseBlockIDs = {};
  this.defaultBlockID = this.registry.getBlockIndex(this.opts.mcBlocks.default);

  for (var mcID in this.opts.mcBlocks) {
    var mcBlockID;
    var mcMetaID;
    if (mcID.indexOf(':') !== -1) {
      var a = mcID.split(':');
      mcBlockID = parseInt(a[0], 10);
      mcMetaID = parseInt(a[1], 10);
    } else {
      mcBlockID = parseInt(mcID, 10);
      mcMetaID = 0;
    }
    var ourBlockName = this.opts.mcBlocks[mcID];
    var ourBlockID = this.registry.getBlockIndex(ourBlockName);
    if (ourBlockID === undefined)
      throw new Error('voxel-clientmc unrecognized block name: '+ourBlockName+' for MC '+mcID);
    var mcPackedID = (mcBlockID << 4) | mcMetaID;
    this.translateBlockIDs[mcPackedID] = ourBlockID;
    this.reverseBlockIDs[ourBlockID] = mcPackedID;
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

/*
ClientMC.prototype.missingChunk = function(pos) {
  var chunk = this.voxelChunks[pos.join('|')];
  if (chunk === undefined) return;

  this.game.showChunk(chunk);
};
*/
