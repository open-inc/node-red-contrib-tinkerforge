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
        if (node.t) {
          node.t.setLight(
            true,
            function () {
              // Beleuchtung erfolgreich aktiviert
            },
            function (err) {
              node.warn("Konnte Sensor-Beleuchtung nicht aktivieren: " + err);
            }
          );
        }

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

                // Konvertierung von 16-bit (0-65535) zu 8-bit (0-255) für CSS RGB
                var r8 = Math.round((r / 65535) * 255);
                var g8 = Math.round((g / 65535) * 255);
                var b8 = Math.round((b / 65535) * 255);

                // Verbesserte Normalisierung: verhindert Überbelichtung
                var maxRaw = Math.max(r, g, b);
                var rNorm = maxRaw > 0 ? Math.round((r / maxRaw) * 255) : r8;
                var gNorm = maxRaw > 0 ? Math.round((g / maxRaw) * 255) : g8;
                var bNorm = maxRaw > 0 ? Math.round((b / maxRaw) * 255) : b8;

                // Begrenze auf 0-255 (sollte durch obige Berechnung nicht nötig sein)
                rNorm = Math.min(255, Math.max(0, rNorm));
                gNorm = Math.min(255, Math.max(0, gNorm));
                bNorm = Math.min(255, Math.max(0, bNorm));

                node.send({
                  topic: node.topic || "ColorV2",
                  payload: {
                    r: r, // Rot Rohwert (0-65535)
                    g: g, // Grün Rohwert (0-65535)
                    b: b, // Blau Rohwert (0-65535)
                    c: c, // Clear/Helligkeit (0-65535)
                    r8: r8, // Rot 8-bit (0-255)
                    g8: g8, // Grün 8-bit (0-255)
                    b8: b8, // Blau 8-bit (0-255)
                    rgb: "rgb(" + r8 + "," + g8 + "," + b8 + ")", // CSS RGB
                    rgbNormalized:
                      "rgb(" + rNorm + "," + gNorm + "," + bNorm + ")", // Normalisiert über Clear
                    hex:
                      "#" +
                      ("0" + r8.toString(16)).slice(-2) +
                      ("0" + g8.toString(16)).slice(-2) +
                      ("0" + b8.toString(16)).slice(-2), // HEX-Format
                  },
                });
              },
              function (err) {
                //error
                node.error("ColorV2 Error - " + err);
              }
            );
          }
        }, node.pollTime * 1000);
      }
    );

    node.on("close", function () {
      clearInterval(node.interval);
      if (node.t) {
        node.t.setLight(
          false,
          function () {
            // Beleuchtung erfolgreich deaktiviert
          },
          function (err) {
            node.warn("Konnte Sensor-Beleuchtung nicht deaktivieren: " + err);
          }
        );
      }
      node.ipcon.disconnect();
    });
  }

  RED.nodes.registerType("TinkerForge ColorV2", tinkerForgeColorV2);
};
