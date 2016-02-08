'use strict';

module.exports = (clientmc) => {
  clientmc.kicked = (event) => {
    window.alert('Disconnected from server: '+event.reason); // TODO: console, also for chat
  };
};
