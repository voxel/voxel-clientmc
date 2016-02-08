'use strict';

const ndarray = require('ndarray');

module.exports = (clientmc) => {
  clientmc.handlers.setBlock = (event) => {
    clientmc.game.setBlock(event.position, event.value);
  };

  clientmc.handlers.chunks = (event) => {
    clientmc.game.plugins.disable('voxel-flatland');

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
      clientmc.game.voxels.chunks[key] = realChunk;
      clientmc.game.addChunkToNextUpdate(realChunk);
      //this.game.showChunk(realChunk);
    };
  };

  clientmc.on('connectServer', () => {
    const maxId = 4096; // 2^12 TODO: 2^16? for extended block IDs (plus metadata)

    // array MC block ID -> our block ID
    // packs 4-bit metadata in LSBs (MC block ID = 12-bits, meta = 4-bits, total 16-bits -> ours 16 bit)
    clientmc.translateBlockIDs = new clientmc.game.arrayType(maxId);
    clientmc.reverseBlockIDs = {};
    clientmc.defaultBlockID = clientmc.registry.getBlockIndex(clientmc.opts.mcBlocks.default);

    for (let mcID in clientmc.opts.mcBlocks) {
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
      const ourBlockName = clientmc.opts.mcBlocks[mcID];
      const ourBlockID = clientmc.registry.getBlockIndex(ourBlockName);
      if (ourBlockID === undefined)
        throw new Error('voxel-clientmc unrecognized block name: '+ourBlockName+' for MC '+mcID);
      const mcPackedID = (mcBlockID << 4) | mcMetaID;
      clientmc.translateBlockIDs[mcPackedID] = ourBlockID;
      clientmc.reverseBlockIDs[ourBlockID] = mcPackedID;
    }

    // for chunk conversion - see voxel/chunker.js
    clientmc.chunkBits = Math.log(clientmc.game.chunkSize) / Math.log(2); // must be power of two
    clientmc.chunkBits |= 0;
    clientmc.chunkMask = (1 << clientmc.chunkBits) - 1;

  });
  // TODO: remove handler on disconnect
  /*
  missingChunk(pos) {
    const chunk = this.voxelChunks[pos.join('|')];
    if (chunk === undefined) return;

    this.game.showChunk(chunk);
  };
  */
};
