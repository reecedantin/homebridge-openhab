"use strict";

var request = require("request");

var SpeakerItem = function(widget,platform,homebridge) {
    SpeakerItem.super_.call(this, widget,platform,homebridge);
};

SpeakerItem.prototype.getServices = function() {

    this.initListener();
    this.setInitialState = true;

    this.informationService = this.getInformationServices();

    this.otherService = new this.homebridge.hap.Service.Speaker();
    this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.Mute)
        .on('set', this.setItem.bind(this))
        .on('get', this.getItemPowerState.bind(this))
        .setValue(+this.state > 0);

    this.setInitialState = true;

    this.otherService.addCharacteristic(this.homebridge.hap.Characteristic.Volume)
        .on('set', this.setItem.bind(this))
        .on('get', this.getItemVolumeState.bind(this))
        .setValue(+this.state);

    return [this.informationService, this.otherService];
};

SpeakerItem.prototype.updateCharacteristics = function(message) {

    this.setFromOpenHAB = true;
    var volume = +message;
    var steps = 2;
    if (volume >= 0) {
        this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.Volume)
            .setValue(volume,
                function() {
                    steps--;
                    if (!steps) {
                        this.setFromOpenHAB = false;
                    }
                }.bind(this));
        this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.Mute)
            .setValue(volume > 0,
                function() {
                    steps--;
                    if (!steps) {
                        this.setFromOpenHAB = false;
                    }
                }.bind(this));
    }
};

SpeakerItem.prototype.getItemPowerState = function(callback) {

    var self = this;

    this.log("iOS - request power state from " + this.name);
    request(this.url + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.name + ": " + body);
            callback(undefined,+body > 0);
        } else {
            self.log("OpenHAB HTTP - error from " + self.name + ": " + error);
        }
    })
};

SpeakerItem.prototype.setItem = function(value, callback) {

    var self = this;

    if (this.setInitialState) {
        this.setInitialState = false;
        callback();
        return;
    }

    if (this.setFromOpenHAB) {
        callback();
        return;
    }

    this.log("iOS - send message to " + this.name + ": " + value);
    var command = 0;
    if (value == '1' && this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.Mute).value == false) {
        return;
    } else {
        command = "" + value;
    }
    if (value == true)
    {
        command = '100';
    }

    request.post(
        this.url,
        {
            body: command,
            headers: {'Content-Type': 'text/plain'}
        },
        function (error, response, body) {
            if (!error && response.statusCode == 201) {
                self.log("OpenHAB HTTP - response from " + self.name + ": " + body);
            } else {
                self.log("OpenHAB HTTP - error from " + self.name + ": " + error);
            }
            callback();
        }
    );
};

SpeakerItem.prototype.getItemVolumeState = function(callback) {

    var self = this;

    this.log("iOS - request volume state from " + this.name);
    request(this.url + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.name + ": " + body);
            callback(undefined,+body);
        } else {
            self.log("OpenHAB HTTP - error from " + self.name + ": " + error);
        }
    })
};

module.exports = SpeakerItem;
