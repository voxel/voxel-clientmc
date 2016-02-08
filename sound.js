'use strict';

module.exports = (clientmc) => {
  clientmc.sound = (event) => {
    //console.log('sound',event);
    if (clientmc.sfxPlugin) {
      const path = event.soundName.replace('.', '/');
      // TODO: https://github.com/deathcap/artpacks/issues/14 Randomized sound effect lookup
      // for now, try either unnumbered or first effect variant
      clientmc.sfxPlugin.play(path);
      clientmc.sfxPlugin.play(path + '1');
    }
  };
};
