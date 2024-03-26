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
  function tinkerForgeRGBLight(n) {
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


  node.ipcon.on(Tinkerforge.IPConnection.CALLBACK_CONNECTED,
    function(connectReason) {
        node.md = new Tinkerforge.BrickletRGBLEDButton(node.sensor, node.ipcon);
         
          
    });

    node.on('input', function(msg){
      if(node.md) {
              if (msg.color.length == 3) {
                if(typeof msg.color[0] === 'number' && typeof msg.color[1] === 'number' && typeof msg.color[2] === 'number') {
                node.md.setColor(msg.color[0],msg.color[1],msg.color[2], ()=>{},()=>{})
              } else {
                node.error("Wrong Format: e.g. msg.color = [255,0,100]");
            }
              } else {
                node.error("Wrong Format: e.g. msg.color = [255,0,100]");
            }
      }
  });



    node.on("close", function () {
      clearInterval(node.interval);
      node.ipcon.disconnect();
    });
  }

  RED.nodes.registerType("TinkerForge RGBLight", tinkerForgeRGBLight);
};
