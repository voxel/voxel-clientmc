'use strict';

var ParentStream = require('workerstream/parent');
var mineflayer = require('wsmc/mineflayer-stream');
var duplexer = require('duplexer');
var toBufferStream = require('tobuffer-stream');
var Writable = require('stream').Writable;
var through = require('through');
var ndarray = require('ndarray');
var vec3Object = require('vec3'); // note: object type used by mineflayer, NOT gl-vec3 which is just a typed array :(

module.exports = function(self) {
  console.log('mf-worker initializing',self);

  self.readStream = ParentStream().pipe(toBufferStream).pipe(through(function write(event) {
    if (Buffer.isBuffer(event)) {
      // buffer data passes through to readStream -> duplexStream for bot
      this.queue(event);
    } else {
      // divert non-packet data, tells us what to do from the main thread
      console.log('mfworker NON-BUFFER DATA:',event);
      var cmd = event.cmd;
      var f = self[event.cmd];
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
    var arrayBuffer = chunk.buffer;
    self.postMessage({cmd: 'packet', data: arrayBuffer}, [arrayBuffer]); // transferrable; arrayBuffer now deleted
    next();
  };

  self.duplexStream = duplexer(self.writeStream, self.readStream);

  self.bot = mineflayer.createBot({
    username: 'user1', // TODO
    stream: self.duplexStream,
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

  var pos = [0,0,0];
  self.bot.on('blockUpdate', function(oldBlock, newBlock) {
    console.log('blockUpdate', oldBlock, newBlock);
    var position = newBlock.position;
    pos[0] = position.x;
    pos[1] = position.y;
    pos[2] = position.z;
    var val = self.translateBlockID((newBlock.type << 4) | newBlock.metadata);
    self.postMessage({cmd: 'setBlock', position: pos, value: val});
    //self.game.setBlock(pos, val);
  });
  // TODO: also handle mass block update (event? would like to optimize multi_block_change, but..)

  // Translate packed MC block ID (lower 4 bits metadata, upper 12 block) to 16-bit voxel ID
  self.translateBlockID = function(mcPackedID) {
    var ourBlockID;
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

  var chunkCache = {}; // TODO: read from existing? if need to merge

  // convert MC chunk format to ours, sends back to main to show
  var CHUNKS_ADDED = 0;
  self.addColumn = function(point) {
    if (CHUNKS_ADDED >= 10) return; // only a few for testing
    console.log('Chunk load ('+point.x+','+point.y+','+point.z+')');
    var chunkX = point.x;
    var chunkZ = point.z;

    var started = self.performance.now();

    for (var chunkY = 0; chunkY < 16*16; chunkY += 16) {

      var column = self.bot._chunkColumn(chunkX, chunkZ);
      if (!column) continue;

      var buffer = column.blockType[chunkY >> 4]; // for MC 1.8, block type is 16-bit array. TODO: support earlier, 8-bit blockType, add, meta (separated)
      //console.log('array',chunkY,array);
      if (!buffer) continue; // TODO: set to all air (probably already is, but no guarantee)

      for (var i = 0; i < buffer.length; i += 2) {
        var mcPackedID = buffer.readUInt16LE(i); // TODO: Uint16Array data view typed array instead?

        //var mcBlockID = blockType >> 4;
        //var mcMetaID = blockType & 0xf;

        //var blockIndex = x + self.chunkSize * z + self.chunkSize * self.chunkSize * y;
        var blockIndex = i >> 1; // since 2 bytes
        var dx = blockIndex & 0xf;
        var dz = (blockIndex >> 4) & 0xf;
        var dy = blockIndex >> 8;

        var x = chunkX + dx;
        var y = chunkY + dy;
        var z = chunkZ + dz;


        var ourBlockID = self.translateBlockID(mcPackedID);

        //var chunkIndex = this.game.voxels.chunkAtCoordinates(a[0], a[1], a[2]);
        var chunkIndex = [x >> self.chunkBits, y >> self.chunkBits, z >> self.chunkBits];

        var chunkKey = chunkIndex.join('|');

        //var chunk = this.game.voxels.chunks[chunkKey];
        var chunk = chunkCache[chunkKey];

        if (!chunk) {
          // create new chunk TODO: refactor, similar chunk data store object creation in voxel-land
          var width = self.chunkSize;
          var pad = self.chunkPad;
          var buffer = new ArrayBuffer((width+pad) * (width+pad) * (width+pad) * self.arrayTypeSize);
          var arrayType = {1:Uint8Array, 2:Uint16Array, 4:Uint32Array}[self.arrayTypeSize];
          var voxels = new arrayType(buffer);
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
        var mask = self.chunkMask;
        var h = self.chunkPadHalf;
        var mx = x & mask;
        var my = y & mask;
        var mz = z & mask;
        chunk.set(mx+h, my+h, mz+h, ourBlockID);

      }
    }

    /*
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

          var blockObject = self.bot.blockAt(v);
          if (!blockObject) continue; // TODO: fix out of bounds?

          var mcBlockID = blockObject.type;
          var ourBlockID = self.translateBlockIDs[mcBlockID]; // TODO: metadata?

          //var chunkIndex = this.game.voxels.chunkAtCoordinates(a[0], a[1], a[2]);
          var chunkIndex = [a[0] >> self.chunkBits, a[1] >> self.chunkBits, a[2] >> self.chunkBits];

          var chunkKey = chunkIndex.join('|');

          //var chunk = this.game.voxels.chunks[chunkKey];
          var chunk = chunkCache[chunkKey];

          if (!chunk) {
            // create new chunk TODO: refactor, similar chunk data store object creation in voxel-land
            var width = self.chunkSize;
            var pad = self.chunkPad;
            var buffer = new ArrayBuffer((width+pad) * (width+pad) * (width+pad) * self.arrayTypeSize);
            var arrayType = {1:Uint8Array, 2:Uint16Array, 4:Uint32Array}[self.arrayTypeSize];
            var voxels = new arrayType(buffer);
            chunk = ndarray(new arrayType(buffer), [width+pad, width+pad, width+pad]);
            chunk.position = [chunkIndex[0], chunkIndex[1], chunkIndex[2]];

            //var h = pad >>> 1;
            //var chunkUnpadded = chunk.lo(h,h,h).hi(width,width,width); // for easier access

            //this.game.voxels.chunks[chunkKey] = chunk;
            chunkCache[chunkKey] = chunk;

            console.log('Created new chunk '+chunkKey);
          }

          //this.game.setBlock(a, ourBlockID); // instead, faster direct chunk access below (avoids events)
          //this.game.addChunkToNextUpdate({position: chunkIndex});

          //this.game.chunksNeedsUpdate[chunkKey] = this.game.voxels.chunks[chunkKey]; // dirty for showChunk TODO: accumulate all first, then one showChunk at end

          //this.game.voxels.voxelAtPosition(a, ourBlockID);
          var mask = self.chunkMask;
          var h = self.chunkPadHalf;
          var mx = a[0] & mask;
          var my = a[1] & mask;
          var mz = a[2] & mask;
          chunk.set(mx+h, my+h, mz+h, ourBlockID);
        }
      }
    }
    */

    var took = self.performance.now() - started;
    console.log('chunk added in '+took);
    CHUNKS_ADDED += 1;
    self.postMessage({cmd: 'chunks', chunks: chunkCache}); // TODO: transferrable
  };

  // if we exist (the webworker), socket is connected
  self.bot.client.emit('connect');


  // handlers called for main thread
  self.chat = function(event) {
    self.bot.chat(event.text);
  };

  self.setVariables = function(event) {
    for (var key in event) {
      self[key] = event[key];
    }
  };

  // http://wiki.vg/Protocol#Player_Digging
  var normal2mcface = function(normal) {
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

  var swingInterval = null;

  self.digStart = function(event) {
    // TODO: higher-level dig api in mineflayer (currently, blocks.js dig() does both start and stop, and hardcodes face top)
    // this uses the low-level packet protocol interface
    self.bot.client.write('block_dig', {
      status: 0, // start digging
      location: {x:event.position[0], y:event.position[1], z:event.position[2]},
      face: normal2mcface(event.normal),
    });

    swingInterval = self.setInterval(function() {
      self.bot.client.write('arm_animation', {
        entityId: self.bot.entity.id,
        animation: 1, // 0? swing arm http://wiki.vg/Protocol#Animation
      }, 350); // TODO: stop hardcoding 350 ms
    });
  };

  self.digStop = function(event) {
    self.bot.client.write('block_dig', {
      status: 1, // stop digging
      location: {x:event.position[0], y:event.position[1], z:event.position[2]}, // TODO: mineflayer sends x,y,z for this packet?!
      face: normal2mcface(event.normal),
    });

    if (swingInterval) self.clearInterval(swingInterval);
    swingInterval = null;
  };
};

