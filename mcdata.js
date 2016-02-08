'use strict';

const minecraft_data = require('minecraft-data');

const DATA_MC_VERSION = '1.8.9'; // TODO: 1.9?

const blocksByName = minecraft_data(DATA_MC_VERSION).blocksByName;
const blocksArray = minecraft_data(DATA_MC_VERSION).blocksArray;
const itemsByName = minecraft_data(DATA_MC_VERSION).itemsByName;

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


const inertItemProps = {
  acacia_door: {itemTexture: 'items/door_acacia', displayName: 'Acacia Door'},
  //apple: {itemTexture: 'items/apple', displayName: 'Apple'}, // voxel-food
  armor_stand: {itemTexture: 'items/wooden_armorstand', displayName: 'Armor Stand'},
  arrow: {itemTexture: 'items/arrow', displayName: 'Arrow'},
  //baked_potato: {itemTexture: 'items/potato_baked', displayName: 'Baked Potato'},
  bed: {itemTexture: 'items/bed', displayName: 'Bed'},
  //beef: {itemTexture: 'items/beef_raw', displayName: 'Raw Beef'},
  birch_door: {itemTexture: 'items/door_birch', displayName: 'Birch Door'},
  blaze_powder: {itemTexture: 'items/blaze_powder', displayName: 'Blaze Powder'},
  blaze_rod: {itemTexture: 'items/blaze_rod', displayName: 'Blaze Rod'},
  boat: {itemTexture: 'items/boat', displayName: 'Boat'},
  bone: {itemTexture: 'items/bone', displayName: 'Bone'},
  book: {itemTexture: 'items/book_normal', displayName: 'Book'},
  bow: {itemTexture: 'items/bow_standby', displayName: 'Bow'},
  bowl: {itemTexture: 'items/bowl', displayName: 'Bowl'},
  //bread: {itemTexture: 'items/bread', displayName: 'Bread'}, // voxel-food
  brewing_stand: {itemTexture: 'items/brewing_stand', displayName: 'Brewing Stand'},
  //brick: {itemTexture: 'items/brick', displayName: 'Brick'},    // TODO: disambiguate vs block of the same name
  bucket: {itemTexture: 'items/bucket_empty', displayName: 'Bucket'},
  //cake: {itemTexture: 'items/cake', displayName: 'Cake'}, // voxel-food
  //carrot: {itemTexture: 'items/carrot', displayName: 'Carrot'}, // voxel-food
  carrot_on_a_stick: {itemTexture: 'items/carrot_on_a_stick', displayName: 'Carrot on a Stick'},
  cauldron: {itemTexture: 'items/cauldron', displayName: 'Cauldron'},
  chainmail_boots: {itemTexture: 'items/chainmail_boots', displayName: 'Chain Boots'},
  chainmail_chestplate: {itemTexture: 'items/chainmail_chestplate', displayName: 'Chain Chestplate'},
  chainmail_helmet: {itemTexture: 'items/chainmail_helmet', displayName: 'Chain Helmet'},
  chainmail_leggings: {itemTexture: 'items/chainmail_leggings', displayName: 'Chain Leggings'},
  chest_minecart: {itemTexture: 'items/minecart_chest', displayName: 'Minecart with Chest'},
  //chicken: {itemTexture: 'items/chicken_raw', displayName: 'Raw Chicken'},
  clay_ball: {itemTexture: 'items/clay_ball', displayName: 'Clay'},
  coal: {itemTexture: 'items/coal', displayName: 'Coal'},
  command_block_minecart: {itemTexture: 'items/minecart_command_block', displayName: 'Minecart with Command Block'},
  comparator: {itemTexture: 'items/comparator', displayName: 'Redstone Comparator'},
  //cooked_beef: {itemTexture: 'items/beef_cooked', displayName: 'Steak'},
  //cooked_chicken: {itemTexture: 'items/chicken_cooked', displayName: 'Cooked Chicken'},
  cooked_mutton: {itemTexture: 'items/mutton_cooked', displayName: 'Cooked Mutton'},
  cooked_porkchop: {itemTexture: 'items/porkchop_cooked', displayName: 'Cooked Porkchop'},
  cooked_rabbit: {itemTexture: 'items/rabbit_cooked', displayName: 'Cooked Rabbit'},
  //cookie: {itemTexture: 'items/cookie', displayName: 'Cookie'}, // voxel-food
  dark_oak_door: {itemTexture: 'items/door_dark_oak', displayName: 'Dark Oak Door'},
  diamond: {itemTexture: 'items/diamond', displayName: 'Diamond'},
  diamond_axe: {itemTexture: 'items/diamond_axe', displayName: 'Diamond Axe'},
  diamond_boots: {itemTexture: 'items/diamond_boots', displayName: 'Diamond Boots'},
  diamond_chestplate: {itemTexture: 'items/diamond_chestplate', displayName: 'Diamond Chestplate'},
  diamond_helmet: {itemTexture: 'items/diamond_helmet', displayName: 'Diamond Helmet'},
  diamond_hoe: {itemTexture: 'items/diamond_hoe', displayName: 'Diamond Hoe'},
  diamond_horse_armor: {itemTexture: 'items/diamond_horse_armor', displayName: 'Diamond Horse Armor'},
  diamond_leggings: {itemTexture: 'items/diamond_leggings', displayName: 'Diamond Leggings'},
  diamond_pickaxe: {itemTexture: 'items/diamond_pickaxe', displayName: 'Diamond Pickaxe'},
  diamond_shovel: {itemTexture: 'items/diamond_shovel', displayName: 'Diamond Shovel'},
  diamond_sword: {itemTexture: 'items/diamond_sword', displayName: 'Diamond Sword'},
  egg: {itemTexture: 'items/egg', displayName: 'Egg'},
  emerald: {itemTexture: 'items/emerald', displayName: 'Emerald'},
  enchanted_book: {itemTexture: 'items/book_enchanted', displayName: 'Enchanted Book'},
  ender_eye: {itemTexture: 'items/ender_eye', displayName: 'Eye of Ender'},
  ender_pearl: {itemTexture: 'items/ender_pearl', displayName: 'Ender Pearl'},
  experience_bottle: {itemTexture: 'items/experience_bottle', displayName: 'Bottle o\' Enchanting'},
  feather: {itemTexture: 'items/feather', displayName: 'Feather'},
  fermented_spider_eye: {itemTexture: 'items/spider_eye_fermented', displayName: 'Fermented Spider Eye'},
  filled_map: {itemTexture: 'items/map_filled', displayName: 'Map'},
  fire_charge: {itemTexture: 'items/fireball', displayName: 'Fire Charge'},
  firework_charge: {itemTexture: 'items/fireworks_charge', displayName: 'Firework Star'},
  fireworks: {itemTexture: 'items/fireworks', displayName: 'Firework Rocket'},
  fishing_rod: {itemTexture: 'items/fishing_rod_uncast', displayName: 'Fishing Rod'},
  flint: {itemTexture: 'items/flint', displayName: 'Flint'},
  flint_and_steel: {itemTexture: 'items/flint_and_steel', displayName: 'Flint and Steel'},
  flower_pot: {itemTexture: 'items/flower_pot', displayName: 'Flower Pot'},
  furnace_minecart: {itemTexture: 'items/minecart_furnace', displayName: 'Minecart with Furnace'},
  ghast_tear: {itemTexture: 'items/ghast_tear', displayName: 'Ghast Tear'},
  glass_bottle: {itemTexture: 'items/potion_bottle_empty', displayName: 'Glass Bottle'},
  glowstone_dust: {itemTexture: 'items/glowstone_dust', displayName: 'Glowstone Dust'},
  gold_ingot: {itemTexture: 'items/gold_ingot', displayName: 'Gold Ingot'},
  gold_nugget: {itemTexture: 'items/gold_nugget', displayName: 'Gold Nugget'},
  //golden_apple: {itemTexture: 'items/apple_golden', displayName: 'Golden Apple'},
  golden_axe: {itemTexture: 'items/gold_axe', displayName: 'Golden Axe'},
  golden_boots: {itemTexture: 'items/gold_boots', displayName: 'Golden Boots'},
  //golden_carrot: {itemTexture: 'items/carrot_golden', displayName: 'Golden Carrot'},
  golden_chestplate: {itemTexture: 'items/gold_chestplate', displayName: 'Golden Chestplate'},
  golden_helmet: {itemTexture: 'items/gold_helmet', displayName: 'Golden Helmet'},
  golden_hoe: {itemTexture: 'items/gold_hoe', displayName: 'Golden Hoe'},
  golden_horse_armor: {itemTexture: 'items/gold_horse_armor', displayName: 'Golden Horse Armor'},
  golden_leggings: {itemTexture: 'items/gold_leggings', displayName: 'Golden Leggings'},
  golden_pickaxe: {itemTexture: 'items/gold_pickaxe', displayName: 'Golden Pickaxe'},
  golden_shovel: {itemTexture: 'items/gold_shovel', displayName: 'Golden Shovel'},
  golden_sword: {itemTexture: 'items/gold_sword', displayName: 'Golden Sword'},
  gunpowder: {itemTexture: 'items/gunpowder', displayName: 'Gunpowder'},
  hopper_minecart: {itemTexture: 'items/minecart_hopper', displayName: 'Minecart with Hopper'},
  //iron_axe: {itemTexture: 'items/iron_axe', displayName: 'Iron Axe'}, // voxel-pickaxe
  iron_boots: {itemTexture: 'items/iron_boots', displayName: 'Iron Boots'},
  iron_chestplate: {itemTexture: 'items/iron_chestplate', displayName: 'Iron Chestplate'},
  iron_door: {itemTexture: 'items/door_iron', displayName: 'Iron Door'},
  iron_helmet: {itemTexture: 'items/iron_helmet', displayName: 'Iron Helmet'},
  iron_hoe: {itemTexture: 'items/iron_hoe', displayName: 'Iron Hoe'},
  iron_horse_armor: {itemTexture: 'items/iron_horse_armor', displayName: 'Iron Horse Armor'},
  iron_ingot: {itemTexture: 'items/iron_ingot', displayName: 'Iron Ingot'},
  iron_leggings: {itemTexture: 'items/iron_leggings', displayName: 'Iron Leggings'},
  //iron_pickaxe: {itemTexture: 'items/iron_pickaxe', displayName: 'Iron Pickaxe'}, // voxel-pickaxe
  //iron_shovel: {itemTexture: 'items/iron_shovel', displayName: 'Iron Shovel'}, // voxel-pickaxe
  iron_sword: {itemTexture: 'items/iron_sword', displayName: 'Iron Sword'},
  item_frame: {itemTexture: 'items/item_frame', displayName: 'Item Frame'},
  jungle_door: {itemTexture: 'items/door_jungle', displayName: 'Jungle Door'},
  lava_bucket: {itemTexture: 'items/bucket_lava', displayName: 'Lava Bucket'},
  lead: {itemTexture: 'items/lead', displayName: 'Lead'},
  leather: {itemTexture: 'items/leather', displayName: 'Leather'},
  leather_boots: {itemTexture: 'items/leather_boots', displayName: 'Leather Boots'},
  leather_chestplate: {itemTexture: 'items/leather_chestplate', displayName: 'Leather Tunic'},
  leather_helmet: {itemTexture: 'items/leather_helmet', displayName: 'Leather Cap'},
  leather_leggings: {itemTexture: 'items/leather_leggings', displayName: 'Leather Pants'},
  magma_cream: {itemTexture: 'items/magma_cream', displayName: 'Magma Cream'},
  map: {itemTexture: 'items/map_empty', displayName: 'Empty Map'},
  //melon: {itemTexture: 'items/melon', displayName: 'Melon'}, // voxel-food
  melon_seeds: {itemTexture: 'items/seeds_melon', displayName: 'Melon Seeds'},
  milk_bucket: {itemTexture: 'items/bucket_milk', displayName: 'Milk'},
  minecart: {itemTexture: 'items/minecart_normal', displayName: 'Minecart'},
  mushroom_stew: {itemTexture: 'items/mushroom_stew', displayName: 'Mushroom Stew'},
  mutton: {itemTexture: 'items/mutton_raw', displayName: 'Raw Mutton'},
  name_tag: {itemTexture: 'items/name_tag', displayName: 'Name Tag'},
  nether_star: {itemTexture: 'items/nether_star', displayName: 'Nether Star'},
  nether_wart: {itemTexture: 'items/nether_wart', displayName: 'Nether Wart'},
  netherbrick: {itemTexture: 'items/netherbrick', displayName: 'Nether Brick'},
  painting: {itemTexture: 'items/painting', displayName: 'Painting'},
  paper: {itemTexture: 'items/paper', displayName: 'Paper'},
  poisonous_potato: {itemTexture: 'items/potato_poisonous', displayName: 'Poisonous Potato'},
  porkchop: {itemTexture: 'items/porkchop_raw', displayName: 'Raw Porkchop'},
  potato: {itemTexture: 'items/potato', displayName: 'Potato'},
  prismarine_crystals: {itemTexture: 'items/prismarine_crystals', displayName: 'Prismarine Crystals'},
  prismarine_shard: {itemTexture: 'items/prismarine_shard', displayName: 'Prismarine Shard'},
  pumpkin_pie: {itemTexture: 'items/pumpkin_pie', displayName: 'Pumpkin Pie'},
  pumpkin_seeds: {itemTexture: 'items/seeds_pumpkin', displayName: 'Pumpkin Seeds'},
  quartz: {itemTexture: 'items/quartz', displayName: 'Nether Quartz'},
  rabbit: {itemTexture: 'items/rabbit_raw', displayName: 'Raw Rabbit'},
  rabbit_foot: {itemTexture: 'items/rabbit_foot', displayName: 'Rabbit\'s Foot'},
  rabbit_hide: {itemTexture: 'items/rabbit_hide', displayName: 'Rabbit Hide'},
  rabbit_stew: {itemTexture: 'items/rabbit_stew', displayName: 'Rabbit Stew'},
  record_11: {itemTexture: 'items/record_11', displayName: '11 Disc'},
  record_13: {itemTexture: 'items/record_13', displayName: '13 Disc'},
  record_blocks: {itemTexture: 'items/record_blocks', displayName: 'Blocks Disc'},
  record_cat: {itemTexture: 'items/record_cat', displayName: 'Cat Disc'},
  record_chirp: {itemTexture: 'items/record_chirp', displayName: 'Chirp Disc'},
  record_far: {itemTexture: 'items/record_far', displayName: 'Far Disc'},
  record_mall: {itemTexture: 'items/record_mall', displayName: 'Mall Disc'},
  record_mellohi: {itemTexture: 'items/record_mellohi', displayName: 'Mellohi Disc'},
  record_stal: {itemTexture: 'items/record_stal', displayName: 'Stal Disc'},
  record_strad: {itemTexture: 'items/record_strad', displayName: 'Strad Disc'},
  record_wait: {itemTexture: 'items/record_wait', displayName: 'Wait Disc'},
  record_ward: {itemTexture: 'items/record_ward', displayName: 'Ward Disc'},
  redstone: {itemTexture: 'items/redstone_dust', displayName: 'Redstone'},
  reeds: {itemTexture: 'items/reeds', displayName: 'Sugar Cane'},
  repeater: {itemTexture: 'items/repeater', displayName: 'Redstone Repeater'},
  rotten_flesh: {itemTexture: 'items/rotten_flesh', displayName: 'Rotten Flesh'},
  saddle: {itemTexture: 'items/saddle', displayName: 'Saddle'},
  //shears: {itemTexture: 'items/shears', displayName: 'Shears'}, // voxel-pumpkin
  sign: {itemTexture: 'items/sign', displayName: 'Sign'},
  slime_ball: {itemTexture: 'items/slimeball', displayName: 'Slimeball'},
  snowball: {itemTexture: 'items/snowball', displayName: 'Snowball'},
  spawn_egg: {itemTexture: 'items/spawn_egg', displayName: 'Spawn Egg'},
  speckled_melon: {itemTexture: 'items/melon_speckled', displayName: 'Glistering Melon'},
  spider_eye: {itemTexture: 'items/spider_eye', displayName: 'Spider Eye'},
  spruce_door: {itemTexture: 'items/door_spruce', displayName: 'Spruce Door'},
  //stick: {itemTexture: 'items/stick', displayName: 'Stick'}, // voxel-pickaxe
  //stone_axe: {itemTexture: 'items/stone_axe', displayName: 'Stone Axe'}, // voxel-pickaxe
  stone_hoe: {itemTexture: 'items/stone_hoe', displayName: 'Stone Hoe'},
  //stone_pickaxe: {itemTexture: 'items/stone_pickaxe', displayName: 'Stone Pickaxe'}, // voxel-pickaxe
  //stone_shovel: {itemTexture: 'items/stone_shovel', displayName: 'Stone Shovel'}, // voxel-pickaxe
  stone_sword: {itemTexture: 'items/stone_sword', displayName: 'Stone Sword'},
  string: {itemTexture: 'items/string', displayName: 'String'},
  sugar: {itemTexture: 'items/sugar', displayName: 'Sugar'},
  tnt_minecart: {itemTexture: 'items/minecart_tnt', displayName: 'Minecart with TNT'},
  water_bucket: {itemTexture: 'items/bucket_water', displayName: 'Water Bucket'},
  wheat: {itemTexture: 'items/wheat', displayName: 'Wheat'},
  wheat_seeds: {itemTexture: 'items/seeds_wheat', displayName: 'Seeds'},
  //wooden_axe: {itemTexture: 'items/wood_axe', displayName: 'Wooden Axe'}, // voxel-pickaxe
  wooden_hoe: {itemTexture: 'items/wood_hoe', displayName: 'Wooden Hoe'},
  //wooden_pickaxe: {itemTexture: 'items/wood_pickaxe', displayName: 'Wooden Pickaxe'}, // voxel-pickaxe
  //wooden_shovel: {itemTexture: 'items/wood_shovel', displayName: 'Wooden Shovel'}, // voxel-pickaxe
  wooden_sword: {itemTexture: 'items/wood_sword', displayName: 'Wooden Sword'},
  writable_book: {itemTexture: 'items/book_writable', displayName: 'Book and Quill'},
  written_book: {itemTexture: 'items/book_written', displayName: 'Written Book'},
  // TODO: more items
  // TODO: default
};
// in absence of model definitions support https://github.com/deathcap/artpacks/issues/16, above output is based on:
/*
function readItemTextures() {
  const itemTextures = {};
  const fs = require('fs');
  const root = '/tmp/assets/minecraft/models/item/'; // assumes jar extracted to /tmp
  const filenames = fs.readdirSync(root);
  filenames.forEach((filename) => {
    if (filename.startsWith('.') || !filename.endsWith('.json')) return;

    const modelData = fs.readFileSync(root + filename)
    const model = JSON.parse(modelData);

    if (model.parent !== 'builtin/generated') return; // only handle simple models for now

    const texture = model.textures.layer0; // TODO: other layers (overlays)
    const itemName = filename.replace('.json', '');

    const itemInfo = itemsByName[itemName];
    if (!itemInfo) return; // some sub-items are missing.. acacia_sapling, due to https://github.com/PrismarineJS/minecraft-data/issues/18
    //console.log(itemName,itemInfo);

    //console.log(itemName,texture);
    itemTextures[itemName] = {itemTexture: texture, displayName:itemInfo.displayName};

    console.log(`  ${itemName}: {itemTexture: '${texture}', displayName: '${itemInfo.displayName}'},`);
  });
  return itemTextures;
}
//console.log(JSON.stringify(readItemTextures(), null, '  '));
readItemTextures();
*/

const mcItemName2Voxel = {
  // voxel-food
  apple: 'apple',
  baked_potato: 'potatoBaked',
  beef: 'beefRaw',
  bread: 'bread',
  cake: 'cake',
  carrot: 'carrot',
  golden_apple: 'appleGolden',
  golden_carrot: 'carrotGolden',
  chicken: 'chickenRaw',
  cooked_beef: 'beefCooked',
  cooked_chicken: 'chickenCooked',
  cookie: 'cookie',
  melon: 'melon',
  pumpkin_pie: 'pumpkinPie',
  spider_eye: 'spiderEye',

  // voxel-pickaxe
  wooden_pickaxe: 'pickaxeWood',
  stone_pickaxe: 'pickaxeStone',
  iron_pickaxe: 'pickaxeIron',

  wooden_shovel: 'spadeWood',
  stone_shovel: 'spadeStone',
  iron_shovel: 'spadeIron',

  wooden_axe: 'axeWood',
  stone_axe: 'axeStone',
  iron_axe: 'ironAxe',
  // TODO: diamond pick/axe/spade https://github.com/voxel/voxel-pickaxe/issues/5


  // note: appended with inertItemProps below
};

Object.keys(inertItemProps).forEach((mcName) => {
  const ourName = mcName;

  mcItemName2Voxel[mcName] = ourName;
});

module.exports = {
  mcBlockName2Voxel,
  mcBlockID2Voxel,
  inertBlockProps,
  inertItemProps,
  mcItemName2Voxel,
};


