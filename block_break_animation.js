'use strict';

module.exports = (clientmc) => {
  clientmc.blockBreakProgressObserved = (event) => {
    const texture = 'destroy_stage_' + event.destroyStage;

    clientmc.blockBreakProgress(event.position, texture);
  };

  clientmc.blockBreakProgressEnd = (event) => {
    clientmc.blockBreakProgress(event.position, null);
  };

  clientmc.blockBreakProgress = (position, texture) => {
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
        clientmc.decalsPlugin.change({position: position, normal: normal, texture: texture});
      } else {
        clientmc.decalsPlugin.remove({position: position, normal: normal});
      }
    }

    clientmc.decalsPlugin.update();
  };
};
