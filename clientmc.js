'use strict';

const websocket_stream = require('websocket-stream');
const webworkify = require('webworkify');
const workerstream = require('workerstream');
const typedArrayToBuffer = require('typedarray-to-buffer');
const mcData = require('./mcdata');
const EventEmitter = require('events').EventEmitter;

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


class ClientMC extends EventEmitter
{
  constructor(game, opts) {
    super();

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

    // webworker -> main thread handler callbacks (augmented by plugins)
    this.handlers = {
      packet: (event) => {
        this.websocketStream.write(typedArrayToBuffer(event.data));
      },

      error: (event) => {
        this.console.log('Disconnected with error: ' + event.error);
        this.game.plugins.disable('voxel-clientmc');
      },

      close: (event) => {
        this.console.log('Websocket closed');
        this.game.plugins.disable('voxel-clientmc');
      }
    };

    require('./position.js')(this);
    require('./kick.js')(this);
    require('./chunks.js')(this);
    require('./dig.js')(this);
    require('./use.js')(this);
    require('./block_break_animation.js')(this);
    require('./sound.js')(this);
    require('./chat.js')(this);
    require('./inventory.js')(this);
    require('./resource_pack.js')(this);

    this.enable();
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
      username = 'user1';
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
        username: username,
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
        const f = this.handlers[cmd];
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

    this.emit('connectServer');
  }

  disable() {
    this.log('voxel-clientmc disabling');
    this.game.voxels.removeListener('missingChunk', this.missingChunk);
    this.game.plugins.get('voxel-console').widget.removeListener('input', this.onConsoleInput);
    this.ws.end();
    if (this.clearPositionUpdateTimer) this.clearPositionUpdateTimer();
  }
}
