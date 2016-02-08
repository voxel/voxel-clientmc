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
};
