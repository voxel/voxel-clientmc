# voxel-clientmc

[![Build Status](https://circleci.com/gh/voxel/voxel-clientmc/tree/master.png)](https://circleci.com/gh/voxel/voxel-clientmc/tree/master)

Web-based Minecraft-compatible client using voxel.js, connect to Minecraft servers using WebSockets

![screenshot](http://i.imgur.com/dzs5BFM.png "Screenshot")

Proxy the MC server using [wsmc](https://github.com/deathcap/wsmc) to make it available via WebSocket.
The [builds on CircleCI](https://circleci.com/gh/voxel/voxel-clientmc/tree/master) (login with GitHub,
click on "Artifacts" to download the latest .jar) include the wsmc/Java plugin for Bukkit with an
integrated voxel-clientmc client.

Loads with [voxel-plugins](https://github.com/deathcap/voxel-plugins), options:

* `url`: server to connect to, default `ws://localhost:24444`
* `mcBlocks`: MC block ID to [voxel-registry](https://github.com/deathcap/voxel-registry) block name

Note: very incomplete. For current protocol support status, see: https://github.com/voxel/voxel-clientmc/issues/23

## License

MIT

