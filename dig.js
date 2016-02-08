'use strict';

module.exports = (clientmc) => {
  clientmc.on('connectServer', () => {
    // TODO: refactor
    // block events
    clientmc.reachPlugin.on('start mining', (target) => { // TODO: remove events on disable
      console.log('start mining',target);
      if (!target) return; // no target (air)
      clientmc.mfworkerStream.write({cmd: 'digStart', position:target.voxel, normal:target.normal});
    });
    clientmc.reachPlugin.on('stop mining', (target) => {
      if (!target) target = clientmc.reachPlugin.specifyTarget(); // TODO: why is this sometimes null? voxel-reach bug?
      console.log('stop mining',target);
      clientmc.mfworkerStream.write({cmd: 'digStop', position:target.voxel, normal:target.normal});
    });
  });
  // TODO: remove on disconnect
};
