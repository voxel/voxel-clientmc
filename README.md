# voxel-clientmc

[![Build Status](https://circleci.com/gh/voxel/voxel-clientmc/tree/master.png)](https://circleci.com/gh/voxel/voxel-clientmc/tree/master)

Web-based Minecraft-compatible client using voxel.js, connects to Minecraft servers using WebSockets

![screenshot](http://i.imgur.com/dzs5BFM.png "Screenshot")

## Downloads

Prebuilt integrated builds are available to download from:

* [![Build Status](https://circleci.com/gh/voxel/voxel-clientmc.svg?style=svg)](https://circleci.com/gh/voxel/voxel-clientmc/tree/master) **[CircleCI](https://circleci.com/gh/voxel/voxel-clientmc/tree/master)** - click the latest build then expand "Artifacts" (requires logging in with GitHub)

Basic setup steps:

1. Download the .jar file and place it in the `plugins` folder of your Bukkit-compatible server

2. Login to your server using the official Minecraft client

3. Click the "Web client enabled (click to view)" link you receive upon login, and open it in your web browser

You should now be disconnected in the vanilla client, and logged in from the voxel-clientmc web-based client.
Once you're logged in, the link you've received in step 3 can be reused to re-login via the web browser
as long as the server is up.

For advanced proxy configuration, see the [wsmc documentation](https://github.com/deathcap/wsmc).

## Status

Very incomplete, many bugs and missing features. The client is able to observe and interact
with the world in a primitive manner, but full survival gameplay is not yet possible.

For details on the current protocol implementation status, see: https://github.com/voxel/voxel-clientmc/issues/23

## Architecture Overview

The integrated build includes several separate components, pre-packaged together for convenience:

### wsmc

In order to allow connecting from a web browser, the Minecraft server is exposed through a WebSocket
via the wsmc (WebSocket/Mincraft) proxy. Integrated builds include the Java version of
wsmc, but a Node.js version is also available. wsmc/Java can be ran as a Bukkit plugin, or standalone.

WSMC is developed in a separate repository, [https://github.com/deathcap/wsmc](https://github.com/deathcap/wsmc).

### voxel-clientmc plugin

The bulk of this project is composed of a voxel.js plugin,
"voxel-clientmc", maintained in this repository. This [plugin](https://github.com/voxel/voxel-plugins) connects to a wsmc proxy using a WebSocket,
via the [mineflayer](https://github.com/PrismarineJS/mineflayer) abstraction layer, and ties it into
[voxel.js](https://github.com/voxel) for GUI interaction. voxel-clientmc is built from a handful of
small modules, injected at runtime. You can build your own voxel.js app with this plugin.

### voxel-clientmc app

The application in `app/` combines the voxel-clientmc plugin with the
[voxel-engine-stackgl](https://github.com/voxel/voxel-engine-stackgl) engine
and numerous other voxel.js plugins to provide various functionality in the voxel.js environment.
This app is [browserified](http://browserify.org) and made available through wsmc/Java's HTTP server.


## License

MIT

