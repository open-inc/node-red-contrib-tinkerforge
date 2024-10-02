# A small set of Node-RED Nodes

These nodes make use of [Tinkerforge's][1] [javascript][2] library to connect
to a local brickd instance or to a remote instance (via Ethernet/WiFi brick)

This repository is a fork of repository [tyrrellsystems][3]. A small selection of nodes has been retained and partially modified.

## Install

From npm

`npm install node-red-contrib-tinkerforge-openinc`

## Supported Bricklets

Currently there are nodes for the following bricklets

- Humidity V2 Bricklet
- Motion Detector V2 Bricklet
- Rotary Poti V2 Bricklet
- Distance IR V2 Bricklet
- LCD 128x64 Bricklet
- RGB LED Button Bricklet
- Accelerometer V2 Bricklet
- Energy Monitor Bricklet
- Industrial Digital In 4 V2 Bricklet
- Laser Range Finder V2 Bricklet
- Load Cell V2 Bricklet
- Temperature V2 Bricklet
- LED Strip V2 Bricklet

Adding more should be pretty trivial, these are just the bricks I currently
access to for testing

## License

Apache 2.0

[1]: http://www.tinkerforge.com/en
[2]: http://www.tinkerforge.com/en/doc/index.html#/software-javascript-open
[3]: https://github.com/tyrrellsystems/node-red-contrib-tinkerforge
