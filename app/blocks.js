'use strict';

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
  this.registry.registerBlock('grass', {texture: ['grass_top', 'dirt', 'grass_side'], hardness:1.0, itemDrop: 'dirt', effectiveTool: 'spade'});
  this.registry.registerBlock('dirt', {texture: 'dirt', hardness:0.75, effectiveTool: 'spade'});
  this.registry.registerBlock('stone', {displayName: 'Smooth Stone', texture: 'stone', hardness:10.0, itemDrop: 'cobblestone', effectiveTool: 'pickaxe', requiredTool: 'pickaxe'});
  this.registry.registerBlock('bedrock', {texture: 'bedrock'});
  this.registry.registerBlock('waterFlow', {texture: 'water_flow'}); // TODO: animation
  this.registry.registerBlock('water', {texture: 'water_still'}); // TODO: animation
  this.registry.registerBlock('lavaFlow', {texture: 'lava_flow'}); // TODO: animation
  this.registry.registerBlock('lava', {texture: 'lava_still'}); // TODO: animation
  this.registry.registerBlock('sand', {texture: 'sand'});
  this.registry.registerBlock('gravel', {texture: 'gravel'});

  this.registry.registerBlock('oreGold', {displayName: 'Gold Ore', texture: 'gold_ore', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreIron', {displayName: 'Iron Ore', texture: 'iron_ore', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreCoal', {displayName: 'Coal Ore', texture: 'coal_ore', itemDrop: 'coal', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreLapis', {displayName: 'Lapis Lazuli Ore', texture: 'lapis_ore', hardness:15.0, requiredTool: 'pickaxe'});

  this.registry.registerBlock('logOak', {displayName: 'Oak Wood', texture: ['log_oak_top', 'log_oak_top', 'log_oak'], hardness:2.0, effectiveTool: 'axe', creativeTab: 'plants'});
  this.registry.registerBlock('cobblestone', {texture: 'cobblestone', hardness:10.0, effectiveTool: 'pickaxe', requiredTool: 'pickaxe'});
  this.registry.registerBlock('brick', {texture: 'brick'});
  this.registry.registerBlock('obsidian', {texture: 'obsidian', hardness: 128, requiredTool: 'pickaxe'});
  this.registry.registerBlock('leavesOak', {displayName: 'Oak Leaves', texture: 'leaves_oak', transparent: true, hardness: 0.1, creativeTab: 'plants'});
  this.registry.registerBlock('logBirch', {texture: ['log_birch_top', 'log_birch_top', 'log_birch'], hardness:2.0, displayName: 'Birch Wood', effectiveTool: 'axe', creativeTab: 'plants'});

  this.registry.registerBlock('sponge', {texture: 'sponge'});
  this.registry.registerBlock('glass', {texture: 'glass', transparent: true, hardness: 0.2});
  this.registry.registerBlock('blockLapis', {texture: 'lapis_block'});
  this.registry.registerBlock('sandstone', {texture: 'sandstone_normal'});

  this.registry.registerBlock('wool', {texture: 'wool_colored_white'}); // TODO: metablocks for colors

  this.registry.registerBlock('missing', {texture: 'no_texture', displayName: 'Missing Block'}); // custom texture (TODO: standard location?)
  // TODO: more blocks
};

BlocksPlugin.prototype.disable = function() {
  // TODO: unregister blocks
};

