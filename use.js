'use strict';

module.exports = (clientmc) => {
  clientmc.on('connectServer', () => {
    clientmc.usePlugin.on('usedBlock', (target, held, newHeld) => {
      console.log('usedBlock',target,held,newHeld);

      if (!target) return;

      //const value = clientmc.registry.getBlockIndex(held.item);

      clientmc.mfworkerStream.write({cmd: 'placeBlock', position:target.voxel, value:target.value});
    });
  });
};
