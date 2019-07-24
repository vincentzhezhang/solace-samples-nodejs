/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Systems Node.js API
 * Publish/Subscribe tutorial - Topic Publisher
 * Demonstrates publishing direct messages to a topic
 */

/*jslint es6 node:true devel:true*/

var TopicPublisher = function (solaceModule, topicName) {
    'use strict';
    var solace = solaceModule;
    var publisher = {};
    publisher.session = null;
    publisher.topicName = topicName;

    // Logger
    publisher.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    publisher.log('\n*** Publisher to topic "' + publisher.topicName + '" is ready to connect ***');

    // main function
    publisher.run = function () {
        publisher.connect();
    };

    // Establishes connection to Solace message router
    publisher.connect = function () {
        if (publisher.session !== null) {
            publisher.log('Already connected and ready to publish.');
            return;
        }

        // var hosturl = "http://shadevklun02.akunacapital.local";
        var hosturl = "http://localhost";
        publisher.log('Connecting to Solace message router using url: ' + hosturl);
        // var username = "svc_akuna_pdle_id";
        var username = "admin";
        publisher.log('Client username: ' + username);
        // var vpn = "hk_kunlun_staging_vpn";
        var vpn = "default";
        publisher.log('Solace message router VPN name: ' + vpn);
        // var pass = "25Mku4xkznvosn";
        var pass = "admin";
        // create session
        try {
            publisher.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            publisher.log(error.toString());
        }
        // define session event listeners
        publisher.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            publisher.log('=== Successfully connected and ready to publish messages. ===');
            publisher.publish();
            publisher.exit();
        });
        publisher.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            publisher.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        publisher.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            publisher.log('Disconnected.');
            if (publisher.session !== null) {
                publisher.session.dispose();
                publisher.session = null;
            }
        });
        // connect the session
        try {
            publisher.session.connect();
        } catch (error) {
            publisher.log(error.toString());
        }
    };

    // Publishes one message
    publisher.publish = function () {
        if (publisher.session !== null) {
            var messageText = 'Sample Message';
            var message = solace.SolclientFactory.createMessage();
            //
            // here below are the tests played within the container
            //
            // userData = 0x20e04842a6332e312e3636000000000000000000;
            // crc of hb_msg in hex: 0x20e04842
            // // fixstr of protocol version, using msgpack it begins with 101 (0xa0), here we have 3.1.66 which
            // // hex form is 'a6332e312e3636', which is 7bytes, so we have 0xa0 + 0x7 = 0xa7a6332e312e3636
            // //
            // // c: crc, v: version, r: reseved
            // //
            // //               |<- crc ->|  |<- protocol version with padding fixed to 12 bytes ->|  | reserved |
            // // userData = 0x   20e04842        a6332e312e3636  0000000000                            00000000;
            // userData = 0x20e04842a6332e312e3636000000000000000000;
            // message.setUserData(userData);
            //
            // //
            // // message is the packable fields packed by msgpack packb in hex form, for hb, we
            // // can easily hack by generate it from protocol package
            // //
            // hbMsg = 0x98a96c6f63616c686f7374a6776562617070ad746573745f696e7374616e6365a5312e322e3302ab6e6f20636f6d6d656e7421cf15b3911f8e377d00cf15b39121df678100;
            //
            //
            // here below are extracted directly from pysolclient
            //
            // bytes(userdata).hex() = '20e04842332e312e363300000000000000000000'
            //
            message.setDestination(solace.SolclientFactory.createTopicDestination(publisher.topicName));
            message.setBinaryAttachment(messageText);
            message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
            publisher.log('Publishing message "' + messageText + '" to topic "' + publisher.topicName + '"...');
            try {
                publisher.session.send(message);
                publisher.log('Message published.');
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Cannot publish because not connected to Solace message router.');
        }
    };

    publisher.exit = function () {
        publisher.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Gracefully disconnects from Solace message router
    publisher.disconnect = function () {
        publisher.log('Disconnecting from Solace message router...');
        if (publisher.session !== null) {
            try {
                publisher.session.disconnect();
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Not connected to Solace message router.');
        }
    };

    return publisher;
};

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the publisher, specifying the name of the subscription topic
var publisher = new TopicPublisher(solace, 'v2/webapp/mgmt/ttt/heartbeat');

// publish message to Solace message router
publisher.run();
