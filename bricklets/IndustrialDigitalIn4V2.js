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
  function tinkerForgeIndustrialDigitalIn4V2(n) {
    RED.nodes.createNode(this, n);
    this.device = n.device;
    this.sensor = n.sensor;
    this.name = n.name;
    this.topic = n.topic;
    this.pollTime = n.pollTime;
    this.channel1type = n.channel1type;
    this.channel2type = n.channel2type;
    this.channel3type = n.channel3type;
    this.channel4type = n.channel4type;
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
        node.t = new Tinkerforge.BrickletIndustrialDigitalIn4V2(
          node.sensor,
          node.ipcon
        );

        node.t.setEdgeCountConfiguration(0, this.channel1type);
        node.t.setEdgeCountConfiguration(1, this.channel2type);
        node.t.setEdgeCountConfiguration(2, this.channel3type);
        node.t.setEdgeCountConfiguration(3, this.channel4type);

        node.interval = setInterval(function () {
          if (node.t) {
            node.t.getEdgeCount(
              0,
              false,
              function (one) {
                var hu = {
                  topic: node.topic || "Channel",
                  payload: one,
                };

                node.t.getEdgeCount(1, false, function (two) {
                  var te = {
                    topic: node.topic || "Channel",
                    payload: [one, two],
                  };

                  node.t.getEdgeCount(2, false, function (three) {
                    var ba = {
                      topic: node.topic || "Channel",
                      payload: [one, two, three],
                    };

                    node.t.getEdgeCount(3, false, function (four) {
                      var fo = {
                        topic: node.topic || "Channel",
                        payload: [one, two, three, four],
                      };
                      node.send(fo);
                    });
                  });
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

  RED.nodes.registerType(
    "TinkerForge IndustrialDigitalIn4V2",
    tinkerForgeIndustrialDigitalIn4V2
  );
};
