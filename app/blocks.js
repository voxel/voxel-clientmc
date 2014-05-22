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
  this.registry.registerBlock('farmland', {texture: 'farmland_dry'});
  this.registry.registerBlock('mycelium', {texture: ['mycelium_top', 'dirt', 'mycelium_side']});
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
  this.registry.registerBlock('oreDiamond', {displayName: 'Diamond Ore', texture: 'diamond_ore', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreRedstone', {displayName: 'Redstone Ore', texture: 'redstone_ore', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreEmerald', {displayName: 'Emerald Ore', texture: 'emerald_ore', hardness:15.0, requiredTool: 'pickaxe'});
  this.registry.registerBlock('oreNetherQuartz', {displayName: 'Nether Quartz Ore', texture: 'quartz_ore', hardness:15.0, requiredTool: 'pickaxe'});

  this.registry.registerBlock('logOak', {displayName: 'Oak Wood', texture: ['log_oak_top', 'log_oak_top', 'log_oak'], hardness:2.0, effectiveTool: 'axe', creativeTab: 'plants'});
  this.registry.registerBlock('cobblestone', {texture: 'cobblestone', hardness:10.0, effectiveTool: 'pickaxe', requiredTool: 'pickaxe'});
  this.registry.registerBlock('brick', {texture: 'brick'});
  this.registry.registerBlock('leavesOak', {displayName: 'Oak Leaves', texture: 'leaves_oak', transparent: true, hardness: 0.1, creativeTab: 'plants'});
  this.registry.registerBlock('leavesAcacia', {displayName: 'Acacia Leaves', texture: 'leaves_acacia', transparent: true, hardness: 0.1, creativeTab: 'plants'});
  this.registry.registerBlock('logBirch', {texture: ['log_birch_top', 'log_birch_top', 'log_birch'], hardness:2.0, displayName: 'Birch Wood', effectiveTool: 'axe', creativeTab: 'plants'});
  this.registry.registerBlock('logAcacia', {displayName: 'Acacia Wood', texture: ['log_acacia_top', 'log_acacia_top', 'log_acacia'], hardness:2.0, effectiveTool: 'axe', creativeTab: 'plants'});

  this.registry.registerBlock('sponge', {texture: 'sponge'});
  this.registry.registerBlock('glass', {texture: 'glass', transparent: true, hardness: 0.2});
  this.registry.registerBlock('blockLapis', {texture: 'lapis_block'});
  this.registry.registerBlock('sandstone', {texture: 'sandstone_normal'});

  this.registry.registerBlock('wool', {texture: 'wool_colored_white'}); // TODO: metablocks for colors TODO: use voxel-wool..

  this.registry.registerBlock('blockRedstone', {texture: 'redstone_block', displayName: 'Block of Redstone'}); // TODO: move to voxel-decorative?
  this.registry.registerBlock('blockEmerald', {texture: 'emerald_block', displayName: 'Block of Emerald'}); // TODO: move to voxel-decorative?
  this.registry.registerBlock('blockQuartz', {texture: 'quartz_block_side', displayName: 'Block of Quartz'}); // TODO: move to voxel-decorative?

  this.registry.registerBlock('tnt', {texture: ['tnt_top', 'tnt_bottom', 'tnt_side']});
  this.registry.registerBlock('bookshelf', {texture: 'bookshelf'}); // TODO: sides
  this.registry.registerBlock('stoneMossy', {texture: 'cobblestone_mossy'});
  this.registry.registerBlock('obsidian', {texture: 'obsidian', hardness: 128, requiredTool: 'pickaxe'});
  this.registry.registerBlock('snow', {texture: 'snow'});
  this.registry.registerBlock('ice', {texture: 'ice'});
  this.registry.registerBlock('cactus', {texture: ['cactus_top', 'cactus_bottom', 'cactus_side']});
  this.registry.registerBlock('clay', {texture: 'clay'});
  this.registry.registerBlock('jukebox', {texture: ['jukebox_top', 'planks_oak', 'jukebox_side']});
  this.registry.registerBlock('netherrack', {texture: 'netherrack'});
  this.registry.registerBlock('soulsand', {texture: 'soul_sand'});
  this.registry.registerBlock('glowstone', {texture: 'glowstone'});
  this.registry.registerBlock('portal', {texture: 'portal'});
  this.registry.registerBlock('blockMelon', {texture: ['melon_top', 'melon_top', 'melon_side']});
  this.registry.registerBlock('endstone', {texture: 'end_stone'});
  this.registry.registerBlock('lampOff', {texture: 'redstone_lamp_off'});
  this.registry.registerBlock('lampOn', {texture: 'redstone_lamp_on'});

  this.registry.registerBlock('noteblock', {texture: 'noteblock'});
  this.registry.registerBlock('dispenser', {texture: 'dispenser_front_horizontal'}); // TODO: direction
  this.registry.registerBlock('dropper', {texture: 'dropper_front_horizontal'}); // TODO: direction
  this.registry.registerBlock('mushroomBigRed', {texture: 'mushroom_block_skin_red'});
  this.registry.registerBlock('mushroomBigBrown', {texture: 'mushroom_block_skin_brown'});
  this.registry.registerBlock('brickNether', {texture: 'nether_brick'});
  this.registry.registerBlock('endPortalFrame', {texture: ['endframe_top', 'endframe_top', 'endframe_side']});
  this.registry.registerBlock('command', {texture: 'command_block'});
  this.registry.registerBlock('clayStainedWhite', {texture: 'hardened_clay_stained_white'});
  this.registry.registerBlock('clayHardened', {texture: 'hardened_clay'});
  this.registry.registerBlock('hayBale', {texture: ['hay_block_top', 'hay_block_top', 'hay_block_side']});

  this.registry.registerBlock('missing', {texture: 'no_texture', displayName: 'Missing Block'}); // custom texture (TODO: standard location?)
  // TODO: more blocks
};

BlocksPlugin.prototype.disable = function() {
  // TODO: unregister blocks
};

