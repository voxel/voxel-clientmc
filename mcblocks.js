'use strict';

const minecraft_data = require('minecraft-data');

const BLOCKS_MC_VERSION = '1.8.9'; // TODO: 1.9?

const mcBlockID2Voxel = {
  0: 'air',
  1: 'stone',
  2: 'grass',
  3: 'dirt',
  4: 'cobblestone',
  5: 'plankOak',
  //6: 'sapling',
  7: 'bedrock',
  8: 'waterFlow',
  9: 'water',
  10: 'lavaFlow',
  11: 'lavaFlow',
  12: 'sand',
  13: 'gravel',
  14: 'oreGold',
  15: 'oreIron',
  16: 'oreCoal',
  17: 'logOak',
  18: 'leavesOak',
  19: 'sponge',
  20: 'glass',
  21: 'oreLapis',
  22: 'blockLapis',
  23: 'dispenser', // TODO: direction
  24: 'sandstone',
  25: 'noteblock',
  //26: 'bed',
  //27: 'railPowered',
  //28: 'railDetector',
  //29: 'pistonSticky',
  //30: 'web',
  //31: 'shrubDead',
  //33: 'piston',
  //34: 'pistonHead',
  //35: 'wool',
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
  //36: ?
  //37: 'dandelion',
  //38: 'poppy',
  //39: 'mushroomBrown',
  //40: 'mushroomRed',
  41: 'blockGold', // voxel-decorative
  42: 'blockIron', // voxel-decorative
  //43: 'slabDouble',
  //44: 'slabStone',
  45: 'brick',
  46: 'tnt',
  47: 'bookshelf',
  48: 'stoneMossy',
  49: 'obsidian',
  //50: 'torch',
  //51: 'fire',
  //52: 'monsterSpawner',
  //53: 'stairsOakWood',
  54: 'chest', // voxel-chest
  //55: 'redstoneWire',
  56: 'oreDiamond',
  57: 'blockDiamond', // voxel-decorative
  58: 'workbench', // voxel-workbench
  //59: 'crops',
  60: 'farmland',
  61: 'furnace',
  62: 'furnace', // TODO: lit
  //63: 'signPost',
  //64: 'doorWood',
  //65: 'ladder',
  //66: 'rails',
  //67: 'stairsCobble',
  //68: 'signWall',
  //69: 'lever',
  //70: 'plateStone',
  //71: 'doorIron',
  //72: 'plateWood',
  73: 'oreRedstone',
  74: 'oreRedstone', // TODO: glowing
  //75: 'redstoneTorchOff',
  //76: 'redstoneTorchOn',
  //77: 'buttonStone',
  78: 'snow', // TODO: non-block snow
  79: 'ice',
  80: 'snow',
  81: 'cactus',
  82: 'clay',
  //83: 'sugarcane',
  84: 'jukebox',
  //85: 'fence',
  86: 'pumpkinCarvedNorth', // voxel-pumpkin
  87: 'netherrack',
  88: 'soulsand',
  89: 'glowstone',
  90: 'portal',
  91: 'pumpkinCarvedNorthLit', // voxel-pumpkin
  //92: 'cake',
  //93: 'repeaterOff',
  //94: 'repeaterOn',
  //95: 'glassStained',
  //96: 'hatch',
  97: 'stone', // silverfish
  98: 'stoneBrick', // voxel-decorative
  //'98:1': 'stoneBrickMossy', // TODO
  //'98:2': 'stoneBrickCracked',
  //'98:3': 'stoneBrickCarved',
  99: 'mushroomBigRed',
  100: 'mushroomBigBrown',
  //101: 'barsIron',
  //102: 'glassPane',
  103: 'blockMelon',
  //104: 'pumpkinStem',
  //105: 'melonStem',
  //106: 'vines',
  //107: 'fenceGate',
  //108: 'stairsBrick',
  //109: 'stairsStoneBrick',
  110: 'mycelium',
  //110: 'lilypad',
  112: 'brickNether',
  //113: 'fenceNether',
  //114: 'stairsNether',
  //115: 'netherwart',
  //116: 'enchantmentTable',
  //117: 'brewingStand',
  //118: 'cauldron',
  //119: 'endPortal',
  120: 'endPortalFrame',
  121: 'endstone',
  //122: 'dragonEgg',
  123: 'lampOff',
  124: 'lampOn',
  //125: 'slabDoubleOak',
  //126: 'slabOak',
  //127: 'cocoa',
  //128: 'stairsSandstone',
  129: 'oreEmerald',
  //130: 'chestEnder',
  //131: 'tripwireHook',
  //132: 'tripwire',
  133: 'blockEmerald',
  //134: 'stairsSpruce',
  //135: 'stairsBrich',
  //136: 'stairsJungle',
  137: 'command',
  //138: 'beacon',
  //139: 'wallCobblestone',
  //140: 'flowerPot',
  //141: 'carrots',
  //142: 'potatoes',
  //143: 'buttonWood',
  //144: 'headMob',
  //145: 'anvil',
  //146: 'chestTrapped',
  //147: 'plateLight',
  //148: 'plateHeavy',
  //149: 'comparatorOff',
  //150: 'comparatorOn',
  //151: 'daylightSensor',
  152: 'blockRedstone',
  153: 'oreNetherQuartz',
  //154: 'hopper',
  155: 'blockQuartz',
  //156: 'stairsQuartz',
  //157: 'railActivator',
  158: 'dropper',
  159: 'clayStainedWhite',
  //160: 'glassPaneStained',
  161: 'leavesAcacia',
  162: 'logAcacia',
  //163: 'stairsAcacia',
  //164: 'stairsDarkOak',
  //165: 'blockSlime',
  //166: 'barrier',
  //167: 'hatchIron',
  170: 'hayBale',
  //171: 'carpet',
  172: 'clayHardened',
  173: 'blockCoal',
  //174: 'icePacked',
  //175: 'sunflower',
}; 

/*
Object.keys(blocks).forEach((name) => {
  const block = blocks[name];
  //mcBlockID2Voxel
  //console.log(name, block);
});

*/

const blocksByName = minecraft_data(BLOCKS_MC_VERSION).blocksByName;
const blocksArray = minecraft_data(BLOCKS_MC_VERSION).blocksArray;

const mcBlockName2Voxel = {};

Object.keys(mcBlockID2Voxel).forEach((id) => {
  const voxelName = mcBlockID2Voxel[id];

  //console.log(id,voxelName,blocksArray[id]);
  if (!blocksArray[id]) return;
  const mcName = blocksArray[id].name;

  mcBlockName2Voxel[mcName] = voxelName;
});

console.log(JSON.stringify(mcBlockName2Voxel, null, '  '));
