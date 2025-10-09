/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";
var Tinkerforge = require("tinkerforge-openinc");
var devices = require("../lib/devices");

module.exports = function (RED) {
  function tinkerForgeColorV2(n) {
    RED.nodes.createNode(this, n);
    this.device = n.device;
    this.sensor = n.sensor;
    this.name = n.name;
    this.topic = n.topic;
    this.pollTime = n.pollTime;
    var node = this;

    node.ipcon = new Tinkerforge.IPConnection(); //devices[this.device].ipcon;
    node.ipcon.setAutoReconnect(true);
    var devs = devices.getDevices();
    node.ipcon.connect(
      devs[node.device].host,
      devs[node.device].port,
      function (error) {
        if (error) {
          node.warn("couldn't connect");
        }
      }
    );

    node.ipcon.on(
      Tinkerforge.IPConnection.CALLBACK_CONNECTED,
      function (connectReason) {
        node.t = new Tinkerforge.BrickletColorV2(node.sensor, node.ipcon);

        node.interval = setInterval(function () {
          if (node.t) {
            node.t.getColor(
              function (r, g, b, c) {
                // getColor gibt 4 Werte zurück: r (Rot), g (Grün), b (Blau), c (Clear/Helligkeit)
                console.log(
                  "ColorV2 Rohwerte - R:",
                  r,
                  "G:",
                  g,
                  "B:",
                  b,
                  "C:",
                  c
                );

                node.send({
                  topic: node.topic || "ColorV2",
                  payload: {
                    r: r, // Rot (0-65535)
                    g: g, // Grün (0-65535)
                    b: b, // Blau (0-65535)
                    c: c, // Clear/Helligkeit (0-65535)
                    rgb:
                      "rgb(" +
                      Math.round(r / 257) +
                      "," +
                      Math.round(g / 257) +
                      "," +
                      Math.round(b / 257) +
                      ")", // CSS RGB-Wert (0-255)
                  },
                });
              },
              function (err) {
                //error
                node.error("PTC - " + err);
              }
            );
          }
        }, node.pollTime * 1000);
      }
    );

    node.on("close", function () {
      clearInterval(node.interval);
      node.ipcon.disconnect();
    });
  }

  RED.nodes.registerType("TinkerForge ColorV2", tinkerForgeColorV2);
};
