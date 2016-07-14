"use strict"


var events = require('events');
var util = require('util');
var bodyParser = require('body-parser');
var Tinkerforge = require('tinkerforge');
var bricklets = require('./lib/bricklets');
var colours = require('./lib/colours');

var devices = {};

function newDevice(host, port, id) {
    var name = host + ":" + port;
    var ipcon = new Tinkerforge.IPConnection();
    var dev = {
        ipcon: ipcon,
        sensors: {}
    };

    devices[id] = dev;
    ipcon.setAutoReconnect(true);
    ipcon.connect(host, port,
        function(error) {
            console.log('Error: ' + error);
        }
    );

    ipcon.on(Tinkerforge.IPConnection.CALLBACK_CONNECTED,
        function(connectReason) {
            ipcon.enumerate();
        });

    ipcon.on(Tinkerforge.IPConnection.CALLBACK_ENUMERATE,
        function(uid, connectedUid, position, hardwareVersion, firmwareVersion,
            deviceIdentifier, enumerationType) {
            var sensor = {
                uid: uid,
                type: deviceIdentifier,
                typeName: bricklets[deviceIdentifier],
                position: position,
                hardwareVersion: hardwareVersion,
                firmwareVersion: firmwareVersion
            }
            devices[id].sensors[sensor.uid] = sensor;
            //console.log(sensor);
        }
    );
}

module.exports = function(RED){

    var settings = RED.settings;

    function tinkerForgeConfig(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
        this.name = n.host + ":" + n.port;
        this.id = n.id;

        var node = this;

        if (devices[node.name]) {
            //already exists?
        } else {
            newDevice(node.host,node.port,node.id);
        }
            
    }

    RED.nodes.registerType('TinkerForgeConfig', tinkerForgeConfig);

    function tinkerForgeMovement(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        var node = this;

        node.ipcon = devices[this.device].ipcon;

        node.md = new Tinkerforge.BrickletMotionDetector(node.sensor, node.ipcon);
        

        var detected = function () {
            node.send({
                topic: node.topic || "movement",
                payload: true
            });
        }

        node.md.on(Tinkerforge.BrickletMotionDetector.CALLBACK_MOTION_DETECTED,
            detected
        );

        var ended = function () {
            node.send({
                topic: node.topic || "movement",
                payload: false
            });
        }

        // Register detection cycle ended callback
        node.md.on(Tinkerforge.BrickletMotionDetector.CALLBACK_DETECTION_CYCLE_ENDED,
            ended
        );

        node.on('close',function() {
            node.ipcon.disconnect();
        });
    }

    RED.nodes.registerType('TinkerForge Motion', tinkerForgeMovement);


    function tinkerForgeHumidity(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        this.pollTime = n.pollTime;
        var node = this;

        node.ipcon = devices[this.device].ipcon;
        node.h = new Tinkerforge.BrickletHumidity(node.sensor, node.ipcon);

        setInterval(function(){
            node.h.getHumidity(function(humidity) {
                node.send({
                    topic: node.topic || 'humidity',
                    payload: humidity/10.0
                })
            },
            function(err) {
                //error
                if (err == 31) {
                    node.error("Not connected");
                }
            });
        },(node.pollTime * 1000));

        node.on('close',function() {
            node.ipcon.disconnect();
        });
    }

    RED.nodes.registerType('TinkerForge Humidity', tinkerForgeHumidity);

    function tinkerForgePTC(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        this.pollTime = n.pollTime;
        var node = this;

        node.ipcon = devices[this.device].ipcon;

        node.t = new Tinkerforge.BrickletPTC(node.sensor, node.ipcon);

        node.interval = setInterval(function(){
            node.t.getTemperature(function(temp) {
                node.send({
                    topic: node.topic || 'temperature',
                    payload: temp/100.0
                })
            },
            function(err) {
                //error
                node.error(err);
            });
        },(node.pollTime * 1000));

        node.on('close',function() {
            clearInterval(node.interval);
            node.ipcon.disconnect();
        });
        
    }

    RED.nodes.registerType('TinkerForge PTC', tinkerForgePTC);

    function tinkerForgeTemperature(n) {
        RED.nodes.createNode(this,n);
        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        this.pollTime = n.pollTime;
        var node = this;

        node.ipcon = devices[this.device].ipcon;

        node.t = new Tinkerforge.BrickletTemperature(node.sensor, node.ipcon);

        node.interval = setInterval(function(){
            node.t.getTemperature(function(temp) {
                node.send({
                    topic: node.topic || 'temperature',
                    payload: temp/100.0
                })
            },
            function(err) {
                //error
                node.error("PTC - " + err);
            });
        },(node.pollTime * 1000));

        node.on('close',function() {
            clearInterval(node.interval);
            node.ipcon.disconnect();
        });
        
    }

    RED.nodes.registerType('TinkerForge Temperature', tinkerForgeTemperature);

    function tinkerForgeDigitalIn(n) {
        RED.nodes.createNode(this,n);

        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        var node = this;

        node.currentState = 0;

        node.ipcon = devices[this.device].ipcon;

        node.idi4 = new Tinkerforge.BrickletIndustrialDigitalIn4(node.sensor, node.ipcon);
        //((1 << 0) + (1 << 1) + (1 << 2) + (1 << 3))
        node.idi4.setInterrupt( 15);

        node.idi4.on(Tinkerforge.BrickletIndustrialDigitalIn4.CALLBACK_INTERRUPT, 
            function(interupMask, valueMask){
                // console.log("int mask - " + interupMask.toString(2));
                // console.log("val mask - " + valueMask.toString(2));

                if ((valueMask & 1) !== (node.currentState & 1)) {
                    node.send({
                        topic: node.topic + "/0",
                        payload: (valueMask & 1)  != 0
                    });
                }

                if ((valueMask & 2) !== (node.currentState & 2)) {
                    node.send({
                        topic: node.topic + "/1",
                        payload: (valueMask & 2) != 0
                    });
                }

                if ((valueMask & 4) !== (node.currentState & 4)) {
                    node.send({
                        topic: node.topic + "/2",
                        payload: (valueMask & 4) != 0
                    });
                }

                if ((valueMask & 8) !== (node.currentState & 8)) {
                    node.send({
                        topic: node.topic + "/3",
                        payload: (valueMask & 8) != 0
                    });
                }
                node.currentState = valueMask;
        });

        node.on('close',function() {
            node.ipcon.disconnect();
        });

    }

    RED.nodes.registerType('TinkerForge Digital-In', tinkerForgeDigitalIn);

    function tinkerForgeDigitalOut(n) {
        RED.nodes.createNode(this,n);

        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        var node = this;

        node.ipcon = devices[this.device].ipcon;

        node.ido4 = new Tinkerforge.BrickletIndustrialDigitalOut4(node.sensor, node.ipcon);

        node.on('input', function(msg){
            var mask = -1;
            if (Array.isArray(msg.payload)) {
                if (msg.payload.length == 4) {
                    mask = 0;
                    for (var i=0; i<4; i++) {
                        if (msg.payload[i]) {
                            var n = (1 << i);
                            mask += n;
                        }
                    }
                    
                }
            } else if (typeof msg.payload === "Object"){
                mask = 0;
                if (msg.payload.hasOwnProperty("1")) {
                    if (msg.payload["1"])
                    mask = 1 << 0;
                }
            }
            if (mask >= 0) {
                console.log(mask.toString(2));
                node.ido4.setValue(mask);
            }
            
        });

    }

    RED.nodes.registerType('TinkerForge Digital-Out', tinkerForgeDigitalOut);

    function tinkerForgeAmbientLight(n) {
        RED.nodes.createNode(this,n);

        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.topic = n.topic;
        this.pollTime = n.pollTime;
        var node = this;

        node.ipcon = devices[this.device].ipcon;
        node.al = new Tinkerforge.BrickletAmbientLightV2(node.sensor, node.ipcon);

        node.interval = setInterval(function(){
            node.al.getIlluminance(function(lux) {
                node.send({
                    topic: node.topic || 'light',
                    payload: lux/100.0
                })
            },
            function(err) {
                //error
                node.error(err);
            });
        },(node.pollTime * 1000));

        node.on('close',function() {
            clearInterval(node.interval);
            node.ipcon.disconnect();
        });
    };

    RED.nodes.registerType('TinkerForge AmbientLight', tinkerForgeAmbientLight);

    function tinkerForgeLEDStrip(n) {
        RED.nodes.createNode(this,n);

        this.device = n.device;
        this.sensor = n.sensor;
        this.name = n.name;
        this.rgb = n.rgb || "rgb";
        this.mode = n.mode;
        this.bgnd = n.bgnd; 
        this.pixels = n.pixels;
        this.wipe = Number(n.wipe || 40)
        if (this.wipe <0) {this.wipe = 0};

        var needle = "255,255,255";

        var node = this;

        node.ipcon = devices[this.device].ipcon;
        node.led = new Tinkerforge.BrickletLEDStrip(node.sensor, node.ipcon);
        //node.led.setFrameDuration(50000);

        node.on('input', function(msg){

            var r = [];
            var g = [];
            var b = [];
            if (msg.hasOwnProperty('payload')) {
                var pay = msg.payload.toString().toUpperCase();
                var parts = pay.split(',');
                switch(parts.length) {
                    case 2:
                        // hmm
                        break;
                    case 3:
                        for (var i=0; i<node.pixels; i++) {
                            if (node.mode === 'rgb') {
                                r.push(Number(parts[0]));
                                g.push(Number(parts[1]));
                                b.push(Number(parts[2]));
                            } else if (node.mode === 'bgr') {
                                r.push(Number(parts[2]));
                                g.push(Number(parts[1]));
                                b.push(Number(parts[0]));
                            } else if ( node.mode === 'brg') {
                                r.push(Number(parts[2]));
                                g.push(Number(parts[1]));
                                b.push(Number(parts[0]));
                            }
                        }
                        break;
                    case 4:
                        if (node.mode === 'rgb') {
                            r[parts[0]] = parts[1];
                            g[parts[0]] = parts[2];
                            b[parts[0]] = parts[3];
                        } else if (node.mode === 'bgr') {
                            b[parts[0]] = parts[1];
                            g[parts[0]] = parts[2];
                            r[parts[0]] = parts[3];
                        } else if (node.mode === 'brg') {
                            b[parts[0]] = parts[1];
                            r[parts[0]] = parts[2];
                            g[parts[0]] = parts[3];
                        }
                        break;
                }
                if (node.pixels < 16) {
                    node.led.setRGBValues(0,node.pixels,r,g,b);
                } else {
                    var c = Math.floor(node.pixels / 16);
                    var remainder = node.pixels % 16;
                    for (var i = 0; i<c ; i++) {
                        node.led.setRGBValues(i*16,16,r,g,b);
                    }
                    if (remainder) {
                        node.led.setRGBValues((c * 16),remainder,r,g,b);
                    }
                }
            }
        });

        node.on('close',function() {
            node.ipcon.disconnect();
        });

    };

    RED.nodes.registerType('TinkerForge LEDStrip', tinkerForgeLEDStrip);

    RED.httpAdmin.use('/TinkerForge/device',bodyParser.json());

    RED.httpAdmin.post('/TinkerForge/device', function(req,res){
        if (!devices[req.body.id]) {
            newDevice(req.body.host, req.body.port, req.body.id);
        }
    });

    RED.httpAdmin.get('/TinkerForge/:device/sensors/:type', function(req,res){
        var dev = devices[req.params.device];
        //console.log(dev + " - - " + req.params.device);
        if (dev) {
            var sensors = [];
            for (var s in dev.sensors) {
                if (dev.sensors.hasOwnProperty(s)) {
                    if (dev.sensors[s].type == req.params.type) {
                        sensors.push(dev.sensors[s]);
                    }
                }
            }
            //console.log(sensors);
            res.send(sensors);
        } else {
            res.status(404).end();
        }
    });
};