'use strict';

var createEngine = require('voxel-engine-stackgl');

var main = function() {
  console.log('starting up');
  createEngine({pluginLoaders: {
    'voxel-clientmc': require('../'),
    'voxel-registry': require('voxel-registry'),
    'voxel-artpacks': require('voxel-artpacks'),
    'voxel-wireframe': require('voxel-wireframe'),
    'voxel-chunkborder': require('voxel-chunkborder'),
    'voxel-carry': require('voxel-carry'),
    'voxel-recipes': require('voxel-recipes'),
    'voxel-workbench': require('voxel-workbench'),
    'voxel-furnace': require('voxel-furnace'),
    'voxel-chest': require('voxel-chest'),
    'voxel-inventory-hotbar': require('voxel-inventory-hotbar'),
    'voxel-inventory-crafting': require('voxel-inventory-crafting'),
    'voxel-outline': require('voxel-outline'),
    'voxel-voila': require('voxel-voila'),
    'voxel-health': require('voxel-health'),
    'voxel-health-bar': require('voxel-health-bar'),
    'voxel-food': require('voxel-food'),
    'voxel-sfx': require('voxel-sfx'),
    'voxel-flight': require('voxel-flight'),
    'voxel-gamemode': require('voxel-gamemode'),
    'voxel-sprint': require('voxel-sprint'),
    'voxel-mine': require('voxel-mine'),
    'voxel-decals': require('voxel-decals'),
    'voxel-harvest': require('voxel-harvest'),
    'voxel-use': require('voxel-use'),
    'voxel-reach': require('voxel-reach'),
    'voxel-pickaxe': require('voxel-pickaxe'),
    'voxel-wool': require('voxel-wool'),
    'voxel-pumpkin': require('voxel-pumpkin'),
    'voxel-blockdata': require('voxel-blockdata'),
    './blocks.js': require('./blocks.js'),
    'voxel-decorative': require('voxel-decorative'),
    'voxel-land': require('voxel-land'),
    'voxel-inventory-creative': require('voxel-inventory-creative'),
    'voxel-console': require('voxel-console'),
    'voxel-commands': require('voxel-commands'),
    'voxel-drop': require('voxel-drop'),
    'voxel-zen': require('voxel-zen'),
    'voxel-plugins-ui': require('voxel-plugins-ui'),
    'voxel-keys': require('voxel-keys'),
    'kb-bindings-ui': require('kb-bindings-ui'),
    'camera-debug': require('camera-debug')
  }, exposeGlobal:true, pluginOpts:{
    'voxel-engine-stackgl': {
      appendDocument: true,
      exposeGlobal: true,  // for debugging

      lightsDisabled: true,
      arrayTypeSize: 2,  // arrayType: Uint16Array
      useAtlas: true,
      generateChunks: false,
      chunkDistance: 2,
      texturePath: 'ArtPacks/ProgrammerArt/textures/blocks/', // subproject with textures
      worldOrigin: [0, 0, 0],
      controls: {
        discreteFire: false,
        fireRate: 100, // ms between firing
        jumpTimer: 25,
      },
      keybindings: {
        // voxel-engine defaults
        'W': 'forward',
        'A': 'left',
        'S': 'backward',
        'D': 'right',
        '<up>': 'forward',
        '<left>': 'left',
        '<down>': 'backward',
        '<right>': 'right',
        '<mouse 1>': 'fire',
        '<mouse 3>': 'firealt',
        '<space>': 'jump',
        '<shift>': 'crouch',
        '<control>': 'alt',
        '<tab>': 'sprint',

        // our extras,
        'F5': 'pov',
        'O': 'home',
        'E': 'inventory',

        'T': 'console',
        '/': 'console2',
        '.': 'console3',

        'P': 'packs',

        'F1': 'zen',
      },
    },
    'voxel-registry': {},
    'voxel-artpacks': {},
    'voxel-stitch': {
      artpacks: ['https://dl.dropboxusercontent.com/u/258156216/artpacks/ProgrammerArt-v2.2.2-dev-ResourcePack-20140521.zip']
    },
    'voxel-shader': {
      cameraFOV: 90.0
    },
    'voxel-wireframe': {},
    'voxel-chunkborder': {},
    'voxel-recipes': {},
    'voxel-carry': {inventoryWidth:10, inventoryRows:5},
    'voxel-blockdata': {},
    'voxel-chest': {},
    'voxel-workbench': {},
    'voxel-furnace': {},
    'voxel-pickaxe': {},
    'voxel-wool': {},
    'voxel-pumpkin': {},

    './blocks.js': {}, // misc inanimate opaque solid blocks
    'voxel-decorative': {},
    //'voxel-land': {registerBlocks: false},
    'voxel-inventory-creative': {},
    'voxel-clientmc': {},

    'voxel-console': {},
    'voxel-commands': {},
    'voxel-drop': {},
    'voxel-zen': {},

    'voxel-health': {},
    'voxel-health-bar': {},
    'voxel-food': {},
    'voxel-sfx': {},
    'voxel-flight': {},
    'voxel-gamemode': {},
    'voxel-sprint': {},
    'voxel-inventory-hotbar': {inventorySize:10},
    'voxel-inventory-crafting': {},
    'voxel-reach': { reachDistance: 8 },
    // left-click hold to mine
    'voxel-mine': {
      instaMine: false,
      progressTexturesPrefix: 'destroy_stage_',
      progressTexturesCount: 9,
    },
    'voxel-decals': {},
    // right-click to place block (etc.)
    'voxel-use': {},
    // handles 'break' event from voxel-mine (left-click hold breaks blocks), collects block and adds to inventory
    //'voxel-harvest': {},
    'voxel-outline': {},
    'voxel-voila': {},
    'voxel-keys': {},

    // the GUI window (built-in toggle with 'H')
    'voxel-plugins-ui': {},
    'kb-bindings-ui': {},
    'camera-debug': {},
    }
  });
};

main()
