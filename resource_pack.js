'use strict';

module.exports = (clientmc) => {
  clientmc.resourcePack = (event) => {
    clientmc.console.log('Server offered resource pack. Download then drag and drop in browser to install:');
    const link = document.createElement('a');
    link.href = event.url;
    link.title = event.hash;
    link.textContent = event.url;
    clientmc.console.logNode(link);
  };
};
