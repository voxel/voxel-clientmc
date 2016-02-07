'use strict';

const minecraft_data = require('minecraft-data');

const BLOCKS_MC_VERSION = '1.8.9'; // TODO: 1.9?

const blocksByName = minecraft_data(BLOCKS_MC_VERSION).blocksByName;
const blocksArray = minecraft_data(BLOCKS_MC_VERSION).blocksArray;

// Translate the MC block name to a block name recognized by various voxel.js plugins
const mcBlockName2Voxel = {
  air: 'air',
  bedrock: 'bedrock',
  bookshelf: 'bookshelf',
  brick_block: 'brick',
  brown_mushroom_block: 'mushroomBigRed',
  cactus: 'cactus',
  chest: 'chest',               // voxel-chest
  clay: 'clay',
  coal_block: 'blockCoal',
  coal_ore: 'oreCoal',
  cobblestone: 'cobblestone',
  command_block: 'command',
  crafting_table: 'workbench',  // voxel-workbench
  diamond_block: 'blockDiamond',// voxel-decorative
  diamond_ore: 'oreDiamond',
  dirt: 'dirt',
  dispenser: 'dispenser',       // TODO: direction
  dropper: 'dropper',
  emerald_block: 'blockEmerald',
  emerald_ore: 'oreEmerald',
  end_portal_frame: 'endPortalFrame',
  end_stone: 'endstone',
  farmland: 'farmland',
  flowing_lava: 'lavaFlow',
  flowing_water: 'waterFlow',
  furnace: 'furnace',           // TODO: lit
  glass: 'glass',
  glowstone: 'glowstone',
  gold_block: 'blockGold',      // voxel-decorative
  gold_ore: 'oreGold',
  grass: 'grass',
  gravel: 'gravel',
  hardened_clay: 'clayHardened',
  hay_block: 'hayBale',
  ice: 'ice',
  iron_block: 'blockIron',      // voxel-decorative
  iron_ore: 'oreIron',
  jukebox: 'jukebox',
  lapis_block: 'blockLapis',
  lapis_ore: 'oreLapis',
  lava: 'lavaFlow',
  leaves: 'leavesOak',
  leaves2: 'leavesAcacia',
  lit_furnace: 'furnace',
  lit_pumpkin: 'pumpkinCarvedNorthLit', // voxel-pumpkin
  lit_redstone_lamp: 'lampOn',
  lit_redstone_ore: 'oreRedstone',  // TODO: glowing
  log: 'logOak',
  log2: 'logAcacia',
  melon_block: 'blockMelon',
  monster_egg: 'stone',             // TODO: silverfish
  mossy_cobblestone: 'stoneMossy',
  mycelium: 'mycelium',
  nether_brick: 'brickNether',
  netherrack: 'netherrack',
  noteblock: 'noteblock',
  obsidian: 'obsidian',
  planks: 'plankOak',
  portal: 'portal',
  pumpkin: 'pumpkinCarvedNorth',    // voxel-pumpkin
  quartz_block: 'blockQuartz',
  quartz_ore: 'oreNetherQuartz',
  red_mushroom_block: 'mushroomBigBrown',
  redstone_block: 'blockRedstone',
  redstone_lamp: 'lampOff',
  redstone_ore: 'oreRedstone',
  sand: 'sand',
  sandstone: 'sandstone',
  snow: 'snow',                     // TODO: non-block snow (snowball?)
  snow_layer: 'snow',
  soul_sand: 'soulsand',
  sponge: 'sponge',
  stained_hardened_clay: 'clayStainedWhite',
  stone: 'stone',
  stonebrick: 'stoneBrick',         // voxel-decorative
  /* TODO
  '98:1': 'stoneBrickMossy',
  '98:2': 'stoneBrickCracked',
  '98:3': 'stoneBrickCarved',
  */
  tnt: 'tnt',
  water: 'water',
    /* TODO
  '35:0': 'woolWhite',
  '35:1': 'woolOrange',
  '35:2': 'woolMagenta',
  '35:3': 'woolLight_blue',
  '35:4': 'woolYellow',
  '35:5': 'woolLime',
  '35:6': 'woolPink',
  '35:7': 'woolGray',
  '35:8': 'woolSilver',
  '35:9': 'woolCyan',
  '35:10': 'woolPurple',
  '35:11': 'woolBlue',
  '35:12': 'woolBrown',
  '35:13': 'woolGreen',
  '35:14': 'woolRed',
  '35:15': 'woolBlack',
  */
};

// Block properties to register for "inert" blocks (those without functionality provided by other plugins yet)
const inertBlockProps = {
  grass: {texture: ['grass_top', 'dirt', 'grass_side'], hardness:1.0, itemDrop: 'dirt', effectiveTool: 'spade'},
  dirt: {texture: 'dirt', hardness:0.75, effectiveTool: 'spade'},
  farmland: {texture: 'farmland_dry'},
  mycelium: {texture: ['mycelium_top', 'dirt', 'mycelium_side']},
  stone: {displayName: 'Smooth Stone', texture: 'stone', hardness:10.0, itemDrop: 'cobblestone', effectiveTool: 'pickaxe', requiredTool: 'pickaxe'},
  waterFlow: {texture: 'water_flow'}, // TODO: animation
  water: {texture: 'water_still'}, // TODO: animation
  lavaFlow: {texture: 'lava_flow'}, // TODO: animation
  lava: {texture: 'lava_still'}, // TODO: animation
  sand: {texture: 'sand'},
  gravel: {texture: 'gravel'},

  oreGold: {displayName: 'Gold Ore', texture: 'gold_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreIron: {displayName: 'Iron Ore', texture: 'iron_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreCoal: {displayName: 'Coal Ore', texture: 'coal_ore', itemDrop: 'coal', hardness:15.0, requiredTool: 'pickaxe'},
  oreLapis: {displayName: 'Lapis Lazuli Ore', texture: 'lapis_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreDiamond: {displayName: 'Diamond Ore', texture: 'diamond_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreRedstone: {displayName: 'Redstone Ore', texture: 'redstone_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreEmerald: {displayName: 'Emerald Ore', texture: 'emerald_ore', hardness:15.0, requiredTool: 'pickaxe'},
  oreNetherQuartz: {displayName: 'Nether Quartz Ore', texture: 'quartz_ore', hardness:15.0, requiredTool: 'pickaxe'},

  logOak: {displayName: 'Oak Wood', texture: ['log_oak_top', 'log_oak_top', 'log_oak'], hardness:2.0, effectiveTool: 'axe', creativeTab: 'plants'},
  cobblestone: {texture: 'cobblestone', hardness:10.0, effectiveTool: 'pickaxe', requiredTool: 'pickaxe'},
  brick: {texture: 'brick'},
  leavesOak: {displayName: 'Oak Leaves', texture: 'leaves_oak', transparent: true, hardness: 0.1, creativeTab: 'plants'},
  leavesAcacia: {displayName: 'Acacia Leaves', texture: 'leaves_acacia', transparent: true, hardness: 0.1, creativeTab: 'plants'},
  logBirch: {texture: ['log_birch_top', 'log_birch_top', 'log_birch'], hardness:2.0, displayName: 'Birch Wood', effectiveTool: 'axe', creativeTab: 'plants'},
  logAcacia: {displayName: 'Acacia Wood', texture: ['log_acacia_top', 'log_acacia_top', 'log_acacia'], hardness:2.0, effectiveTool: 'axe', creativeTab: 'plants'},

  sponge: {texture: 'sponge'},
  glass: {texture: 'glass', transparent: true, hardness: 0.2},
  blockLapis: {texture: 'lapis_block'},
  sandstone: {texture: 'sandstone_normal'},

  wool: {texture: 'wool_colored_white'}, // TODO: metablocks for colors TODO: use voxel-wool..

  blockRedstone: {texture: 'redstone_block', displayName: 'Block of Redstone'}, // TODO: move to voxel-decorative?
  blockEmerald: {texture: 'emerald_block', displayName: 'Block of Emerald'}, // TODO: move to voxel-decorative?
  blockQuartz: {texture: 'quartz_block_side', displayName: 'Block of Quartz'}, // TODO: move to voxel-decorative?

  tnt: {texture: ['tnt_top', 'tnt_bottom', 'tnt_side']},
  bookshelf: {texture: 'bookshelf'}, // TODO: sides
  stoneMossy: {texture: 'cobblestone_mossy'},
  obsidian: {texture: 'obsidian', hardness: 128, requiredTool: 'pickaxe'},
  snow: {texture: 'snow'},
  ice: {texture: 'ice'},
  cactus: {texture: ['cactus_top', 'cactus_bottom', 'cactus_side']},
  clay: {texture: 'clay'},
  jukebox: {texture: ['jukebox_top', 'planks_oak', 'jukebox_side']},
  netherrack: {texture: 'netherrack'},
  soulsand: {texture: 'soul_sand'},
  glowstone: {texture: 'glowstone'},
  portal: {texture: 'portal'},
  blockMelon: {texture: ['melon_top', 'melon_top', 'melon_side']},
  endstone: {texture: 'end_stone'},
  lampOff: {texture: 'redstone_lamp_off'},
  lampOn: {texture: 'redstone_lamp_on'},

  noteblock: {texture: 'noteblock'},
  dispenser: {texture: 'dispenser_front_horizontal'}, // TODO: direction
  dropper: {texture: 'dropper_front_horizontal'}, // TODO: direction
  mushroomBigRed: {texture: 'mushroom_block_skin_red'},
  mushroomBigBrown: {texture: 'mushroom_block_skin_brown'},
  brickNether: {texture: 'nether_brick'},
  endPortalFrame: {texture: ['endframe_top', 'endframe_top', 'endframe_side']},
  command: {texture: 'command_block'},
  clayStainedWhite: {texture: 'hardened_clay_stained_white'},
  clayHardened: {texture: 'hardened_clay'},
  hayBale: {texture: ['hay_block_top', 'hay_block_top', 'hay_block_side']},

  missing: {texture: 'no_texture', displayName: 'Missing Block'}, // custom texture (TODO: standard location?)
  // TODO: more blocks
};

const mcBlockID2Voxel = {
  default: 'missing'
};

Object.keys(mcBlockName2Voxel).forEach((mcName) => {
  const ourName = mcBlockName2Voxel[mcName];

  const blockInfo = blocksByName[mcName];

  mcBlockID2Voxel[blockInfo.id] = ourName;
});

module.exports = {
  mcBlockName2Voxel,
  mcBlockID2Voxel,
  inertBlockProps,
};
