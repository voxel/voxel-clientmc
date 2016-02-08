'use strict';

const ParentStream = require('workerstream/parent');
const mineflayer = require('wsmc/mineflayer-stream');
const duplexer = require('duplexer');
const toBufferStream = require('tobuffer-stream');
const Writable = require('stream').Writable;
const through = require('through');
const ndarray = require('ndarray');
const vec3Object = require('vec3'); // note: object type used by mineflayer, NOT gl-vec3 which is just a typed array :(

module.exports = function(self) {
  console.log('mf-worker initializing',self);

  self.readStream = ParentStream().pipe(toBufferStream).pipe(through(function write(event) {
    if (Buffer.isBuffer(event)) {
      // buffer data passes through to readStream -> duplexStream for bot
      this.queue(event);
    } else {
      // divert non-packet data, tells us what to do from the main thread
      //console.log('mfworker NON-BUFFER DATA:',event);
      const cmd = event.cmd;
      const f = self[event.cmd];
      if (!f) {
        console.log('mfworker received unhandled cmd: ',event,data);
        return;
      }
      f.call(self, event);
    }
  }));

  self.writeStream = Writable();
  self.writeStream._write = function(chunk, encoding, next) {
    //console.log('write',chunk);
    const arrayBuffer = chunk.buffer;
    self.postMessage({cmd: 'packet', data: arrayBuffer}, [arrayBuffer]); // transferrable; arrayBuffer now deleted
    next();
  };

  self.duplexStream = duplexer(self.writeStream, self.readStream);

  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.duplexStream,
    noPacketFramer: true
  });

  console.log('mf-worker bot',self.bot);

  self.bot.on('game', function() {
    console.log('mf-worker spawn position: '+JSON.stringify(self.bot.spawnPoint));
    self.postMessage({cmd: 'spawn', spawnPoint: self.bot.spawnPoint});
  });

  self.bot.on('kicked', function(reason) {
    self.postMessage({cmd: 'kicked', reason: reason});
  });

  self.bot.on('message', function(message) {
    //self.console.logNode(tellraw2dom(message.json)); // TODO: send back to parent
    console.log('mf-worker chat message', message);
    self.postMessage({cmd: 'chat', message: message});
  });

  self.bot.on('error', function(err) {
    console.log('WebSocket error', err);
    self.postMessage({cmd: 'error', error: err});
  });

  self.bot.on('close', function() {
    console.log('WebSocket closed');
    self.postMessage({cmd: 'close'});
  });

  self.bot.on('chunkColumnLoad', function(point) {
    self.addColumn(point);
  });

  let pos = [0,0,0];
  self.bot.on('blockUpdate', function(oldBlock, newBlock) {
    console.log('blockUpdate', oldBlock, newBlock);
    const position = newBlock.position;
    pos[0] = position.x;
    pos[1] = position.y;
    pos[2] = position.z;
    const val = self.translateBlockID((newBlock.type << 4) | newBlock.metadata);
    self.postMessage({cmd: 'setBlock', position: pos, value: val});
    //self.game.setBlock(pos, val);
  });
  // TODO: also handle mass block update (event? would like to optimize multi_block_change, but..)

  // Translate packed MC block ID (lower 4 bits metadata, upper 12 block) to 16-bit voxel ID
  self.translateBlockID = function(mcPackedID) {
    let ourBlockID;
    if (mcPackedID === 0) {
      // air is always air TODO: custom air blocks?
      ourBlockID = 0;
    } else {
      ourBlockID = self.translateBlockIDs[mcPackedID]; // indexed by (12-bit block ID << 4) | (4-bit metadata)
      if (!ourBlockID) ourBlockID = self.translateBlockIDs[mcPackedID & ~0xf]; // try 0 metadata
      if (!ourBlockID) ourBlockID = self.defaultBlockID; // default replacement block
    }

    return ourBlockID;
  };

  let chunkCache = {}; // TODO: read from existing? if need to merge

  // convert MC chunk format to ours, sends back to main to show
  let CHUNKS_ADDED = 0;
  self.addColumn = function(point) {
    if (CHUNKS_ADDED >= 10) return; // only a few for testing
    console.log('Chunk load ('+point.x+','+point.y+','+point.z+')');
    const chunkX = point.x;
    const chunkZ = point.z;

    const started = self.performance.now();

    for (let chunkY = 0; chunkY < 16*16; chunkY += 16) {

      const column = self.bot._chunkColumn(chunkX, chunkZ);
      if (!column) continue;

      const buffer = column.blockType[chunkY >> 4]; // for MC 1.8, block type is 16-bit array. TODO: support earlier, 8-bit blockType, add, meta (separated)
      //console.log('array',chunkY,array);
      if (!buffer) continue; // TODO: set to all air (probably already is, but no guarantee)

      for (let i = 0; i < buffer.length; i += 2) {
        const mcPackedID = buffer.readUInt16LE(i); // TODO: Uint16Array data view typed array instead?

        //const mcBlockID = blockType >> 4;
        //const mcMetaID = blockType & 0xf;

        //const blockIndex = x + self.chunkSize * z + self.chunkSize * self.chunkSize * y;
        const blockIndex = i >> 1; // since 2 bytes
        const dx = blockIndex & 0xf;
        const dz = (blockIndex >> 4) & 0xf;
        const dy = blockIndex >> 8;

        const x = chunkX + dx;
        const y = chunkY + dy;
        const z = chunkZ + dz;


        const ourBlockID = self.translateBlockID(mcPackedID);

        //const chunkIndex = this.game.voxels.chunkAtCoordinates(a[0], a[1], a[2]);
        const chunkIndex = [x >> self.chunkBits, y >> self.chunkBits, z >> self.chunkBits];

        const chunkKey = chunkIndex.join('|');

        //let chunk = this.game.voxels.chunks[chunkKey];
        let chunk = chunkCache[chunkKey];

        if (!chunk) {
          // create new chunk TODO: refactor, similar chunk data store object creation in voxel-land
          const width = self.chunkSize;
          const pad = self.chunkPad;
          const buffer = new ArrayBuffer((width+pad) * (width+pad) * (width+pad) * self.arrayTypeSize);
          const arrayType = {1:Uint8Array, 2:Uint16Array, 4:Uint32Array}[self.arrayTypeSize];
          const voxels = new arrayType(buffer);
          chunk = ndarray(new arrayType(buffer), [width+pad, width+pad, width+pad]);
          chunk.position = [chunkIndex[0], chunkIndex[1], chunkIndex[2]];

          //this.game.voxels.chunks[chunkKey] = chunk;
          chunkCache[chunkKey] = chunk;

          console.log('Created new chunk '+chunkKey);
        }

        //this.game.setBlock(a, ourBlockID); // instead, faster direct chunk access below (avoids events)
        //this.game.addChunkToNextUpdate({position: chunkIndex});

        //this.game.chunksNeedsUpdate[chunkKey] = this.game.voxels.chunks[chunkKey]; // dirty for showChunk TODO: accumulate all first, then one showChunk at end

        //this.game.voxels.voxelAtPosition(a, ourBlockID);
        const mask = self.chunkMask;
        const h = self.chunkPadHalf;
        const mx = x & mask;
        const my = y & mask;
        const mz = z & mask;
        chunk.set(mx+h, my+h, mz+h, ourBlockID);

      }
    }

    /*
    // call blockAt around chunk size TODO: optimized iterator
    let v = vec3Object(chunkX, 0, chunkZ);
    let a = [chunkX, 0, chunkZ];
    let chunkSizeX = 16;
    let chunkSizeY = 256;
    let chunkSizeZ = 16;
    for (let i = chunkSizeY - 1; i; i -= 1) {
      for (let j = 0; j < chunkSizeX; j += 1) {
        for (let k = 0; k < chunkSizeZ; k += 1) {

          v.x = a[0] = chunkX + j;
          v.y = a[1] = i;
          v.z = a[2] = chunkZ + k;

          let blockObject = self.bot.blockAt(v);
          if (!blockObject) continue; // TODO: fix out of bounds?

          let mcBlockID = blockObject.type;
          let ourBlockID = self.translateBlockIDs[mcBlockID]; // TODO: metadata?

          //let chunkIndex = this.game.voxels.chunkAtCoordinates(a[0], a[1], a[2]);
          let chunkIndex = [a[0] >> self.chunkBits, a[1] >> self.chunkBits, a[2] >> self.chunkBits];

          let chunkKey = chunkIndex.join('|');

          //let chunk = this.game.voxels.chunks[chunkKey];
          let chunk = chunkCache[chunkKey];

          if (!chunk) {
            // create new chunk TODO: refactor, similar chunk data store object creation in voxel-land
            let width = self.chunkSize;
            let pad = self.chunkPad;
            let buffer = new ArrayBuffer((width+pad) * (width+pad) * (width+pad) * self.arrayTypeSize);
            let arrayType = {1:Uint8Array, 2:Uint16Array, 4:Uint32Array}[self.arrayTypeSize];
            let voxels = new arrayType(buffer);
            chunk = ndarray(new arrayType(buffer), [width+pad, width+pad, width+pad]);
            chunk.position = [chunkIndex[0], chunkIndex[1], chunkIndex[2]];

            //let h = pad >>> 1;
            //let chunkUnpadded = chunk.lo(h,h,h).hi(width,width,width); // for easier access

            //this.game.voxels.chunks[chunkKey] = chunk;
            chunkCache[chunkKey] = chunk;

            console.log('Created new chunk '+chunkKey);
          }

          //this.game.setBlock(a, ourBlockID); // instead, faster direct chunk access below (avoids events)
          //this.game.addChunkToNextUpdate({position: chunkIndex});

          //this.game.chunksNeedsUpdate[chunkKey] = this.game.voxels.chunks[chunkKey]; // dirty for showChunk TODO: accumulate all first, then one showChunk at end

          //this.game.voxels.voxelAtPosition(a, ourBlockID);
          let mask = self.chunkMask;
          let h = self.chunkPadHalf;
          let mx = a[0] & mask;
          let my = a[1] & mask;
          let mz = a[2] & mask;
          chunk.set(mx+h, my+h, mz+h, ourBlockID);
        }
      }
    }
    */

    const took = self.performance.now() - started;
    console.log('chunk added in '+took);
    CHUNKS_ADDED += 1;
    self.postMessage({cmd: 'chunks', chunks: chunkCache}); // TODO: transferrable
  };

  self.bot.on('blockBreakProgressObserved', function(block, destroyStage) {
    self.postMessage({cmd: 'blockBreakProgressObserved', position:[block.position.x, block.position.y, block.position.z], destroyStage: destroyStage});
  });
  self.bot.on('blockBreakProgressEnd', function(block) {
    self.postMessage({cmd: 'blockBreakProgressEnd', position:[block.position.x, block.position.y, block.position.z]});
  });


  self.bot.on('move', function() { // TODO: also support entityMoved, other entities, players, mobs
    // player move
    self.postMessage({cmd: 'move', position:[self.bot.entity.position.x, self.bot.entity.position.y, self.bot.entity.position.z]});
  });

  self.bot.on('soundEffectHeard', function(soundName, position, volume, pitch) {
    //console.log('soundEffectHeard',arguments);
    // TODO: event.x,y,z(location?), volume, pitch - 3D sound https://github.com/deathcap/voxel-sfx/issues/3 Positional audio? (voxel-audio)
    self.postMessage({cmd: 'sound', soundName:soundName});
  });

  self.bot._client.on('held_item_slot', function(packet) { // TODO: this really should be emitted in mineflayer
    //packet.slot
    const slot = self.bot.quickBarSlot;
    console.log('held_item_slot',slot);
    self.postMessage({cmd: 'heldItemSlot', slot:slot});
  });

  self.bot.on('setSlot:0', function(oldItem, newItem) { // slot 0 is player inventory
    console.log('setSlot',oldItem,newItem);
    if (!oldItem && !newItem) return; // TODO: why does mineflayer send this?
    self.postMessage({cmd: 'setSlot', oldItem:oldItem, newItem:newItem});
  });
  // TODO: window items packet? for setting multiple slots

  self.bot._client.on('resource_pack_send', function(packet) { // TODO: mineflayer api
      self.postMessage({cmd: 'resourcePack', url:packet.url, hash:packet.hash});
  });

  // if we exist (the webworker), socket is connected
  self.bot._client.emit('connect');


  // handlers called for main thread
  self.chat = function(event) {
    self.bot.chat(event.text);
  };

  self.setVariables = function(event) {
    for (let key in event) {
      self[key] = event[key];
    }
  };

  // http://wiki.vg/Protocol#Player_Digging
  const normal2mcface = function(normal) {
    switch(normal.join(',')) {
      case '0,-1,0': return 0;  // -y
      case '0,1,0': return 1;   // +y
      case '0,0,-1': return 2;  // -z
      case '0,0,1': return 3;   // +z
      case '-1,0,0': return 4;  // -x
      case '1,0,0': return 5;   // +x
      default: return 255;
    }
  }

  let swingInterval = null;

  self.digStart = function(event) {
    const block = self.bot.blockAt(vec3Object(event.position[0], event.position[1], event.position[2]));
    if (!block) return;
    self.bot.dig(block, function(err) {
      console.log('dig:',err);
    });
    /*
    // TODO: higher-level dig api in mineflayer (currently, blocks.js dig() does both start and stop, and hardcodes face top)
    // this uses the low-level packet protocol interface
    self.bot._client.write('block_dig', {
      status: 0, // start digging
      location: {x:event.position[0], y:event.position[1], z:event.position[2]},
      face: normal2mcface(event.normal),
    });

    swingInterval = self.setInterval(function() {
      self.bot._client.write('arm_animation', {
        entityId: self.bot.entity.id,
        animation: 1, // 0? swing arm http://wiki.vg/Protocol#Animation
      }, 350); // TODO: stop hardcoding 350 ms
    });
    */
  };

  self.digStop = function(event) {
    //self.bot.stopDigging(); // TODO: after get digTime right
    /*
    self.bot._client.write('block_dig', {
      status: 1, // stop digging
      location: {x:event.position[0], y:event.position[1], z:event.position[2]}, // TODO: mineflayer sends x,y,z for this packet?!
      face: normal2mcface(event.normal),
    });

    if (swingInterval) self.clearInterval(swingInterval);
    swingInterval = null;
  */
  };

  self.move = function(event) {
    if (!self.bot.entity) return; // entity not loaded yet
    self.bot.entity.position.set(event.position[0], event.position[1], event.position[2]);
  };

  self.placeBlock = function(event) {
    const block = self.bot.blockAt(vec3Object(event.position[0], event.position[1], event.position[2]));
    if (!block) {
      console.log('placeBlock no block location found',event);
      return;
    }

    const ourType = event.value;
    const mcType = self.reverseBlockIDs[ourType];

    block.type = mcType >> 4;
    block.metadata = mcType & 0xf;

    console.log('activateBlock',block);

    self.bot.activateBlock(block);
  };

  self.setHeldItem = function(event) {
    self.bot.setQuickBarSlot(event.slot);
  };
};

