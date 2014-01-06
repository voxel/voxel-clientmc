# voxel-clientmc

Connect to Minecraft servers via WebSockets, chunks displayed using voxel.js

![screenshot](http://i.imgur.com/dzs5BFM.png "Screenshot")

Load with [voxel-plugins](https://github.com/deathcap/voxel-plugins), or:

    var createClientMC = require('voxel-clientmc');

    createClientMC(game, opts);

where game is a voxel-engine instance, and opts is optionally:

* `url`: server to connect to, default `ws://localhost:1234`
* `mcBlocks`: MC block ID to [voxel-registry](https://github.com/deathcap/voxel-registry) block name

Proxy the MC server using [wsmc](https://github.com/deathcap/wsmc) to make it available via WebSocket

Note: very incomplete. Chunks display, that's about it for now.

Minecraft is property of Mojang Specifications

## License

MIT

