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
  function tinkerForgeLCD(n) {
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
        node.md = new Tinkerforge.BrickletLCD128x64(node.sensor, node.ipcon);
         
          
    });

    node.on('input', function(msg){
      if(node.md) {
              if (typeof msg.payload === "string") {
                node.md.clearDisplay(()=>{},()=>{})



                //node.md.writeLine(0, 0, msg.text, ()=>{},()=>{})

                let text = msg.payload;
                let numLines = 7;
                let charsPerLine = 21;
                displayText(text, numLines, charsPerLine);

              
              } else if(typeof msg.payload === "number") {
                node.md.clearDisplay(()=>{},()=>{})



                //node.md.writeLine(0, 0, msg.text, ()=>{},()=>{})

                let text = "Value is: " + msg.payload;
                let numLines = 7;
                let charsPerLine = 21;
                displayText(text, numLines, charsPerLine);
              }
              else {
                node.error("Wrong Format: e.g. msg.text = 'Hello World!'");
            }
      }
  });


function displayText(text, numLines, charsPerLine) {
    let lines = [];
    // Aufteilen des Textes in Zeilen mit maximal charsPerLine Zeichen
    for (let i = 0; i < text.length; i += charsPerLine) {
        lines.push(text.substring(i, i + charsPerLine));
    }

    // Überprüfen, ob die Anzahl der Zeilen ausreicht
    if (lines.length <= numLines) {
       
    } else {
        // Falls nein, rufe die Funktion rekursiv auf, um den Rest des Textes anzuzeigen
        let remainingText = lines.splice(numLines).join('');
        displayText(remainingText, numLines, charsPerLine);
    }

    // Ausgabe der Zeilen
    for (let i = 0; i < lines.length; i++) {
      node.md.writeLine((i),0,lines[i], ()=>{},()=>{});
    }
}


    node.on("close", function () {
      clearInterval(node.interval);
      node.ipcon.disconnect();
    });
  }

  RED.nodes.registerType("TinkerForge LCD", tinkerForgeLCD);
};
