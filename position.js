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
};


