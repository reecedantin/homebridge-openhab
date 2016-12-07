"use strict";

var request = require("request");

var ContactItem = function(widget,platform,homebridge) {
    ContactItem.super_.call(this, widget,platform,homebridge);
};

ContactItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.ContactSensor();
    if (this.name.indexOf("Motion") > -1) {
        otherService = new this.homebridge.hap.Service.MotionSensor();
        otherService.getCharacteristic(this.homebridge.hap.Characteristic.MotionDetected)
            .on('get', this.getItemState.bind(this))
            .setValue(this.checkItemState(this.state));
    } else {
        otherService = new this.homebridge.hap.Service.ContactSensor();
        otherService.getCharacteristic(this.homebridge.hap.Characteristic.ContactSensorState)
            .on('get', this.getItemState.bind(this))
            .setValue(this.checkItemState(this.state));
    }

    return otherService;
};

ContactItem.prototype.checkItemState = function(state) {
    if (this.name.indexOf("Motion") > -1) {
        if ('Unitialized' === state){
            return false;
        } else if ('OPEN' === state){
            return true;
        } else {
            return false;
        }
    } else {
        if ('Unitialized' === state){
            return this.homebridge.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        } else if ('OPEN' === state){
            return this.homebridge.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        } else {
            return this.homebridge.hap.Characteristic.ContactSensorState.CONTACT_DETECTED;
        }
    }
};

ContactItem.prototype.updateCharacteristics = function(message) {
    if (this.name.indexOf("Motion") > -1) {
        this.otherService
            .getCharacteristic(this.homebridge.hap.Characteristic.MotionDetected)
            .setValue(this.checkItemState(message));
    } else {
        this.otherService
            .getCharacteristic(this.homebridge.hap.Characteristic.ContactSensorState)
            .setValue(this.checkItemState(message));
    }
};

ContactItem.prototype.getItemState = function(callback) {

    var self = this;
    this.log("iOS - request power state from " + this.name);
    request(this.url + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.name + ": " + body);
            callback(undefined,self.checkItemState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.name + ": " + error);
        }
    })
};

module.exports = ContactItem;
