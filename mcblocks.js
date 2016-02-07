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
}

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
};
