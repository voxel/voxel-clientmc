'use strict';

const mcData = require('../mcdata');

module.exports = (game, opts) => {
  return new InertItemsPlugin(game, opts);
};
module.exports.pluginInfo = {
  loadAfter: [ 'voxel-registry' ]
};

class InertItemsPlugin
{
  constructor(game, opts) {
    this.registry = game.plugins.get('voxel-registry');
    if (!this.registry) throw new Error('blocks requires voxel-registry plugin');

    this.enable();
  }

  enable() {
    const inertItemProps = mcData.inertItemProps;
    Object.keys(inertItemProps).forEach((name) => {
      const props = inertItemProps[name];

      this.registry.registerItem(name, props);
    });
  }

  disable() {
    // TODO: unregister items
  }
}
