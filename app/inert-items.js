'use strict';

const ITEMS_MC_VERSION = '1.8.9'; // TODO: 1.9?
const minecraft_data = require('minecraft-data');

module.exports = (game, opts) => {
  return new InertItemsPlugin(game, opts);
};
module.exports.pluginInfo = {
  loadAfter: [
    'voxel-registry',
    // Load after plugins which also register items - inert-items picks up the slack,
    // registering all other items with otherwise no distinctive behavior
    // TODO: needs a better mapping, e.g. iron_pickaxe MC is voxel-pickaxe pickaxeIron! (or we have two iron pickaxes, one inert one not)
    'voxel-pickaxe',
    'voxel-food',
  ]
};

class InertItemsPlugin
{
  constructor(game, opts) {
    this.registry = game.plugins.get('voxel-registry');
    if (!this.registry) throw new Error('blocks requires voxel-registry plugin');

    this.enable();
  }

  enable() {
    const itemsByName = minecraft_data(ITEMS_MC_VERSION).itemsByName;

    Object.keys(itemsByName).forEach((name) => {
      const item = itemsByName[name];

      // Only register items not already registered by other plugins
      if (this.registry.getItemProps(name)) {
        return;
      }

      const displayName = item.displayName;

      console.log('registering item',name);
      // TODO: add textures, but https://github.com/PrismarineJS/minecraft-data/issues/78
      this.registry.registerItem(name, {displayName: displayName});
    });
  }

  disable() {
    // TODO: unregister items
  }
}
