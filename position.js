'use strict';

module.exports = (clientmc) => {
  clientmc.handlers.spawn = (event) => {
    clientmc.console.log('Spawn position: '+JSON.stringify(event.spawnPoint));
    clientmc.game.controls.target().avatar.position.x = event.spawnPoint.x;
    clientmc.game.controls.target().avatar.position.y = event.spawnPoint.y;
    clientmc.game.controls.target().avatar.position.z = event.spawnPoint.z;

    clientmc.commands.isConnectedToServer = true;
  };

  clientmc.handlers.move = (event) => {
    clientmc.game.controls.target().avatar.position.x = event.position[0];
    clientmc.game.controls.target().avatar.position.y = event.position[1];
    clientmc.game.controls.target().avatar.position.z = event.position[2];
  };

  clientmc.on('connectServer', () => {
    let position = [0,0,0];
    clientmc.game.on('tick', (dt) => { // TODO: remove event on disable
      position[0] = clientmc.game.controls.target().avatar.position.x;
      position[1] = clientmc.game.controls.target().avatar.position.y;
      position[2] = clientmc.game.controls.target().avatar.position.z;
      clientmc.mfworkerStream.write({cmd: 'move', position: position});
    });
  });
  // TODO: remove handler on disconnect

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


};


