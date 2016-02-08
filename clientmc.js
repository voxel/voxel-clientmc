'use strict';

const ndarray = require('ndarray');
const mineflayer = require('wsmc/mineflayer-stream');
const websocket_stream = require('websocket-stream');
const ever = require('ever');
const tellraw2dom = require('tellraw2dom');
const webworkify = require('webworkify');
const workerstream = require('workerstream');
const vec3Object = require('vec3'); // note: object type used by mineflayer, NOT gl-vec3 which is just a typed array :(
const typedArrayToBuffer = require('typedarray-to-buffer');
const ItemPile = require('itempile');
const mcData = require('./mcdata');

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
  opts.mcBlocks = opts.mcBlocks || mcData.mcBlockID2Voxel;
    
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

  for (let key in event.chunks) {
    const chunk = event.chunks[key];

    //console.log('showChunk',key);

    // sending ndarray over postMessage loses prototype (cloning algorithm); reconstitute it TODO: optimize
    const realChunk = ndarray(chunk.data,
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
  const texture = 'destroy_stage_' + event.destroyStage;

  this.blockBreakProgress(event.position, texture);
};

ClientMC.prototype.blockBreakProgressEnd = function(event) {
  this.blockBreakProgress(event.position, null);
};


ClientMC.prototype.blockBreakProgress = function(position, texture) {
  // MC's break animations don't include the block face, so include them all
  const normals = [
    [1,0,0],
    [-1,0,0],
    [0,1,0],
    [0,-1,0],
    [0,0,1],
    [0,0,-1]];

  for (let i = 0; i < normals.length; ++i) {
    const normal = normals[i];
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
    const path = event.soundName.replace('.', '/');
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

  ourName = mcData.mcBlockName2Voxel[mcName];
  if (!ourName) ourName = mcData.mcItemName2Voxel[mcName];
  if (!ourName) {
    console.warn(`Unrecognized/unsupported MC item: ${mcName}`);
    ourName = 'missing';
  }

  return new ItemPile(ourName, count);
}

ClientMC.prototype.setSlot = function(event) {
  console.log('setSlot',event);
  if (!this.carryPlugin) return;

  let mcSlot = 0;
  if (event.newItem) mcSlot = event.newItem.slot; // either may be null
  else if (event.oldItem) mcSlot = event.oldItem.slot;

  // http://wiki.vg/Protocol#Set_Slot
  let ourSlot;
  if (mcSlot >= 9) {
    // stored player inventory slots or hotbar
    const slotIndex = mcSlot - 9;
    const mcWidth = 9;
    const mcHeight = 4;
    const slotCol = slotIndex % mcWidth;
    let slotRow = Math.floor(slotIndex / mcWidth);

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

  let pile = null;
  if (event.newItem) {
    const mcName = event.newItem.name;
    const count = event.newItem.count;

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
  const link = document.createElement('a');
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
  let username;
  const hash = document.location.hash;
  if (hash.length < 2) {
    // try anonymous auth
    username = 'mcwebchatuserX';
  } else {
    username = hash.substring(1); // remove #
  }

  this.websocketStream = websocket_stream(this.opts.url);
  this.websocketStream.on('connect', () => {
    console.log('websocketStream connected, launching worker');

    this.mfworker = webworkify(require('./mf-worker.js'));
    this.mfworkerStream = workerstream(this.mfworker);

    // pass some useful data to the worker
    this.mfworkerStream.write({cmd: 'setVariables',
      translateBlockIDs: this.translateBlockIDs,
      reverseBlockIDs: this.reverseBlockIDs,
      defaultBlockID: this.defaultBlockID,
      chunkSize: this.game.chunkSize,
      chunkPad: this.game.chunkPad,
      chunkPadHalf: this.game.voxels.chunkPadHalf,
      chunkMask: this.game.voxels.chunkMask,
      chunkBits: this.game.voxels.chunkBits,
      arrayTypeSize: this.game.arrayType.BYTES_PER_ELEMENT
    });

    // handle outgoing mfworker data and commands
    this.mfworkerStream.on('data', (event) => {
      //console.log('mfworkerStream event',event);
      const cmd = event.cmd;
      const f = this[cmd];
      if (!f) {
        console.log('Unhandled mfworker cmd',cmd,event);
        return;
      }

      // call method on ourthis with arguments
      f.call(this, event);
    });

    // pipe incoming wsmc data to mfworker
    this.websocketStream.pipe(this.mfworkerStream);
  });

  if (this.console) this.console.widget.on('input', this.onConsoleInput = (text) => {
    this.mfworkerStream.write({cmd: 'chat', text: text});
    //this.bot.chat(text); // TODO: call in mfworker
  });

  //this.game.voxels.on('missingChunk', this.missingChunk.bind(this));

  //this.voxelChunks = {}; // TODO: use this?

  let position = [0,0,0];
  this.game.on('tick', (dt) => { // TODO: remove event on disable
    position[0] = this.game.controls.target().avatar.position.x;
    position[1] = this.game.controls.target().avatar.position.y;
    position[2] = this.game.controls.target().avatar.position.z;
    this.mfworkerStream.write({cmd: 'move', position: position});
  });

  // block events
  this.reachPlugin.on('start mining', (target) => { // TODO: remove events on disable
    console.log('start mining',target);
    if (!target) return; // no target (air)
    this.mfworkerStream.write({cmd: 'digStart', position:target.voxel, normal:target.normal});
  });
  this.reachPlugin.on('stop mining', (target) => {
    if (!target) target = this.reachPlugin.specifyTarget(); // TODO: why is this sometimes null? voxel-reach bug?
    console.log('stop mining',target);
    this.mfworkerStream.write({cmd: 'digStop', position:target.voxel, normal:target.normal});
  });

  this.usePlugin.on('usedBlock', (target, held, newHeld) => {
    console.log('usedBlock',target,held,newHeld);

    if (!target) return;

    //const value = this.registry.getBlockIndex(held.item);

    this.mfworkerStream.write({cmd: 'placeBlock', position:target.voxel, value:target.value});
  });

  if (this.hotbar) {
    this.hotbar.on('selectionChanging', (event) => {
      this.mfworkerStream.write({cmd: 'setHeldItem', slot:event.newIndex});
    });
  }

  const maxId = 4096; // 2^12 TODO: 2^16? for extended block IDs (plus metadata)

  // array MC block ID -> our block ID
  // packs 4-bit metadata in LSBs (MC block ID = 12-bits, meta = 4-bits, total 16-bits -> ours 16 bit)
  this.translateBlockIDs = new this.game.arrayType(maxId);
  this.reverseBlockIDs = {};
  this.defaultBlockID = this.registry.getBlockIndex(this.opts.mcBlocks.default);

  for (let mcID in this.opts.mcBlocks) {
    let mcBlockID;
    let mcMetaID;
    if (mcID.indexOf(':') !== -1) {
      let a = mcID.split(':');
      mcBlockID = parseInt(a[0], 10);
      mcMetaID = parseInt(a[1], 10);
    } else {
      mcBlockID = parseInt(mcID, 10);
      mcMetaID = 0;
    }
    const ourBlockName = this.opts.mcBlocks[mcID];
    const ourBlockID = this.registry.getBlockIndex(ourBlockName);
    if (ourBlockID === undefined)
      throw new Error('voxel-clientmc unrecognized block name: '+ourBlockName+' for MC '+mcID);
    const mcPackedID = (mcBlockID << 4) | mcMetaID;
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
  const rest = []; //arguments.slice(1); // TODO
  this.nativeConsoleLog(['[voxel-clientmc] ' + msg].concat(rest));  // as separate parameters to allow object expansion
  if (this.console) this.console.log(msg + ' ' + rest.join(' '));
};

/* TODO: integrate with mineflayer
ClientMC.prototype.handlePacket = function(name, payload) {
  if (name === 'position') {
    // TODO, yaw, pitch. to convert see http://wiki.vg/Protocol#Player_Position_And_Look
    this.log('player pos and look', payload);
    let ourY = payload.y - 1.62; // empirical  TODO: not playerHeight?
    let pos = this.game.plugins.get('game-shell-fps-camera').camera.position;
    pos[0] = payload.x;
    pos[1] = ourY;
    pos[2] = payload.z;

    // the "apology"
    this.sendPacket('position', payload);
};
*/

/*
ClientMC.prototype.missingChunk = function(pos) {
  const chunk = this.voxelChunks[pos.join('|')];
  if (chunk === undefined) return;

  this.game.showChunk(chunk);
};
*/
