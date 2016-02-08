'use strict';

const mcData = require('../mcdata');

module.exports = function(game, opts) {
  return new BlocksPlugin(game, opts);
};
module.exports.pluginInfo = {
  loadAfter: ['voxel-registry']
};

function BlocksPlugin(game, opts) {

  this.registry = game.plugins.get('voxel-registry');
  if (!this.registry) throw new Error('blocks requires voxel-registry plugin');

  this.enable();
}

BlocksPlugin.prototype.enable = function() {
  const inertBlockProps = mcData.inertBlockProps;
  Object.keys(inertBlockProps).forEach((name) => {
    const props = inertBlockProps[name];

    this.registry.registerBlock(name, props);
  });
};

BlocksPlugin.prototype.disable = function() {
  // TODO: unregister blocks
};

