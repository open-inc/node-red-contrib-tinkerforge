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
  function tinkerForgeEnergyMonitor(n) {
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
        node.t = new Tinkerforge.BrickletEnergyMonitor(node.sensor, node.ipcon);

        node.interval = setInterval(function () {
          if (node.t) {
            node.t.getEnergyData(
              function (a, amps, c, d) {
                node.send({
                  topic: node.topic || "EnergyMonitor",
                  payload: amps / 100,
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

  RED.nodes.registerType("TinkerForge EnergyMonitor", tinkerForgeEnergyMonitor);
};
