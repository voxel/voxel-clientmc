'use strict';

const mineflayer = require('wsmc/mineflayer-stream');
const websocket_stream = require('websocket-stream');
const ever = require('ever');
const tellraw2dom = require('tellraw2dom');
const webworkify = require('webworkify');
const workerstream = require('workerstream');
const vec3Object = require('vec3'); // note: object type used by mineflayer, NOT gl-vec3 which is just a typed array :(
const typedArrayToBuffer = require('typedarray-to-buffer');
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


class ClientMC
{
  constructor(game, opts) {
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

    require('./position.js')(this);
    require('./kick.js')(this);
    require('./chunks.js')(this);
    require('./block_break_animation.js')(this);
    require('./sound.js')(this);
    require('./chat.js')(this);
    require('./inventory.js')(this);
    require('./resource_pack.js')(this);

    this.enable();
  }

  // handlers called from mfworker
  packet(event) {
    this.websocketStream.write(typedArrayToBuffer(event.data));
  }

  error(event) {
    this.console.log('Disconnected with error: ' + event.error);
    this.game.plugins.disable('voxel-clientmc');
  }

  close(event) {
    this.console.log('Websocket closed');
    this.game.plugins.disable('voxel-clientmc');
  }

  enable() {
    // only begin connecting to server after voxel-engine is initialized,
    // since it shows chunks (game.showChunk) which requires engine initialization,
    // but plugins are "enabled" before the engine fully is
    this.game.on('engine-init', this.connectServer.bind(this));
  }

  // TODO: refactor further into modules
  connectServer() {
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

    // TODO: refactor into chat
    if (this.console) this.console.widget.on('input', this.onConsoleInput = (text) => {
      this.mfworkerStream.write({cmd: 'chat', text: text});
      //this.bot.chat(text); // TODO: call in mfworker
    });

    //this.game.voxels.on('missingChunk', this.missingChunk.bind(this));

    //this.voxelChunks = {}; // TODO: use this?

    // TODO: refactor into position
    let position = [0,0,0];
    this.game.on('tick', (dt) => { // TODO: remove event on disable
      position[0] = this.game.controls.target().avatar.position.x;
      position[1] = this.game.controls.target().avatar.position.y;
      position[2] = this.game.controls.target().avatar.position.z;
      this.mfworkerStream.write({cmd: 'move', position: position});
    });

    // TODO: refactor
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

    // TODO: refactor into inventory
    if (this.hotbar) {
      this.hotbar.on('selectionChanging', (event) => {
        this.mfworkerStream.write({cmd: 'setHeldItem', slot:event.newIndex});
      });
    }

    // TODO: refactor into chunks
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
  }

  disable() {
    this.log('voxel-clientmc disabling');
    this.game.voxels.removeListener('missingChunk', this.missingChunk);
    this.game.plugins.get('voxel-console').widget.removeListener('input', this.onConsoleInput);
    this.ws.end();
    if (this.clearPositionUpdateTimer) this.clearPositionUpdateTimer();
  }

  /* TODO: integrate with mineflayer
  handlePacket(name, payload) {
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
    }
  }
  */

  /*
  missingChunk(pos) {
    const chunk = this.voxelChunks[pos.join('|')];
    if (chunk === undefined) return;

    this.game.showChunk(chunk);
  };
  */
}
