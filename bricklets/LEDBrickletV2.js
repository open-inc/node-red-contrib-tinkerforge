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
  function tinkerForgeBrickletLEDStripV2(n) {
    RED.nodes.createNode(this, n);
    this.device = n.device;
    this.sensor = n.sensor;
    this.name = n.name;
    this.topic = n.topic;
    this.pollTime = n.pollTime;
    var node = this;

    node.ipcon = new Tinkerforge.IPConnection();
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
        node.md = new Tinkerforge.BrickletLEDStripV2(node.sensor, node.ipcon);
        node.md.setChipType(Tinkerforge.BrickletLEDStripV2.CHIP_TYPE_WS2812);
        node.md.setChannelMapping(
          Tinkerforge.BrickletLEDStripV2.CHANNEL_MAPPING_GBR, // Der Mapping-Wert
          function () {
            console.log("Kanalzuordnung erfolgreich gesetzt.");
          },
          function (error) {
            console.error("Fehler beim Setzen der Kanalzuordnung:", error);
          }
        );
      }
    );

    node.on("input", function (msg) {
      if (node.md) {
        if (msg.color.length === 3) {
          node.md.setChipType(Tinkerforge.BrickletLEDStripV2.CHIP_TYPE_WS2812);
          node.md.setChannelMapping(
            Tinkerforge.BrickletLEDStripV2.CHANNEL_MAPPING_GBR, // Der Mapping-Wert
            function () {
              console.log("Kanalzuordnung erfolgreich gesetzt.");
            },
            function (error) {
              console.error("Fehler beim Setzen der Kanalzuordnung:", error);
            }
          );
          if (
            typeof msg.color[0] === "number" &&
            typeof msg.color[1] === "number" &&
            typeof msg.color[2] === "number"
          ) {
            var numLEDs = 37;

            // Optional: Stelle sicher, dass alle LEDs initial schwarz sind
            var ledValues = Array(numLEDs * 3).fill(0); // RGB = 3 Werte pro LED
            node.md.setLEDValues(
              0,
              ledValues,
              function () {},
              function (error) {
                console.error("Fehler beim Setzen der LED-Werte:", error);
              }
            );
            // Setze die Werte für die LEDs
            for (var i = 0; i < numLEDs; i++) {
              ledValues[i * 3] = msg.color[2]; // Rot
              ledValues[i * 3 + 1] = msg.color[1]; // Grün
              ledValues[i * 3 + 2] = msg.color[0]; // Blau
            }

            // Setze die LED-Werte
            node.md.setLEDValues(
              0,
              ledValues,
              function () {
                console.log("LED-Werte erfolgreich gesetzt.");
              },
              function (error) {
                console.error("Fehler beim Setzen der LED-Werte:", error);
              }
            );
          } else {
            console.error("msg.color enthält keine gültigen RGB-Werte.");
          }
        } else {
          console.error("msg.color hat nicht die richtige Länge (3 erwartet).");
        }
      }
    });

    node.on("close", function () {
      clearInterval(node.interval);
      node.ipcon.disconnect();
    });
  }

  RED.nodes.registerType(
    "TinkerForge BrickletLEDStripV2",
    tinkerForgeBrickletLEDStripV2
  );
};
