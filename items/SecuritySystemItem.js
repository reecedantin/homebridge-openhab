"use strict";

var request = require("request");

var SecuritySystemItem = function(widget,platform,homebridge) {

    // Security System Current State
    this.itemSSCurrentState = undefined;
    this.listenerSSCurrentState = undefined;
    this.wsSSCurrentState = undefined;

    // Security System Target state
    this.itemSSTargetState = undefined;
    this.listenerSSTargetState = undefined;
    this.wsSSTargetState = undefined;

    // Security System Alarm State
    this.itemSSAlarmState = undefined;
    this.listenerSSAlarmState = undefined;
    this.wsSSAlarmState = undefined;

    this.setFromOpenHAB = false;
    this.setInitialState = true;

    SecuritySystemItem.super_.call(this, widget,platform,homebridge);
};

/**
 * Binding SSCurrentStateItem
 * @param item
 */
SecuritySystemItem.prototype.setSSCurrentStateItem = function(item){
    this.itemSSCurrentState = item;
};

/**
 * Binding SSTargetStateItem
 * @param item
 */
SecuritySystemItem.prototype.setSSTargetStateItem = function(item){
    this.itemSSTargetState = item;
};

/**
 * Binding SSAlarmStateItem
 * @param item
 */
SecuritySystemItem.prototype.setSSAlarmStateItem = function(item){
    this.itemSSAlarmState = item;
};

/**
 * Init all thermostat listener
 */
SecuritySystemItem.prototype.initListener = function() {
    if ((typeof this.itemSSCurrentState) == 'undefined'){
        throw new Error(this.name + " needs SSCurrentState!");
    }

    if ((typeof this.itemSSTargetState) == 'undefined'){
        throw new Error(this.name + " needs SSTargetState!");
    }

    if ((typeof this.itemSSAlarmState) == 'undefined'){
        throw new Error(this.name + " needs SSAlarmState!");
    }

    this.listenerSSCurrentState = this.listenerFactory(
        this.itemSSCurrentState.name,
        this.itemSSCurrentState.link,
        this.wsSSCurrentState,
        this.log,
        this.updateSSCurrentState.bind(this)
    );

    this.listenerSSTargetState = this.listenerFactory(
        this.itemSSTargetState.name,
        this.itemSSTargetState.link,
        this.wsSSTargetState,
        this.log,
        this.updateSSTargetState.bind(this)
    );

    this.listenerSSAlarmState = this.listenerFactory(
        this.itemSSAlarmState.name,
        this.itemSSAlarmState.link,
        this.wsSSAlarmState,
        this.log,
        this.updateSSAlarmState.bind(this)
    );
};

SecuritySystemItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.SecuritySystem();

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemCurrentState)
        .on('get', this.getSSCurrentState.bind(this))
        .setValue(this.checkSSCurrentState(this.itemSSCurrentState.state));

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemTargetState)
        .on('get', this.getSSTargetState.bind(this))
        .on('set', this.setSSTargetState.bind(this))
        .setValue(this.checkSSTargetState(this.itemSSTargetState.state));

    return otherService;
};

SecuritySystemItem.prototype.checkSSCurrentState = function(state) {
    switch (state){
        case 'Vacation':
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.STAY_ARM;
        case 'Away':
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        case 'Day':
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        case 'Night':
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
        case 'Off':
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.DISARMED;
        case 'Burglary':
        default:
            return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
    }
};

SecuritySystemItem.prototype.checkSSTargetState = function(state) {
    switch (state){
      case 'Vacation':
          return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      case 'Away':
          return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      case 'Day':
          return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      case 'Night':
          return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
      case 'Off':
      default:
          return this.homebridge.hap.Characteristic.SecuritySystemCurrentState.DISARMED;
    }
};

/**
 * Get SSCurrentState requested from iOS
 * @param callback
 */
SecuritySystemItem.prototype.getSSCurrentState = function(callback) {
    var self = this;
    var alarmTriggered = false;

    //this.log("iOS - request target alarm state from " + this.itemSSAlarmState.name + " (" + (self.name)+")");
    request(self.itemSSAlarmState.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //self.log("OpenHAB HTTP - response from " + self.itemSSAlarmState.name + " (" + (self.name)+"): " + body);
            alarmTriggered = body === "Burglary";
        } else {
            //self.log("OpenHAB HTTP - error from " + self.itemSSAlarmState.name + " (" + (self.name)+"): " + error);
        }
    })

    if(!alarmTriggered)
    {
      //this.log("iOS - request current security system state from " + this.itemSSCurrentState.name + " (" + (self.name)+")");
      request(self.itemSSCurrentState.link + '/state?type=json', function (error, response, body) {
          if (!error && response.statusCode == 200) {
              //self.log("OpenHAB HTTP - response from " + self.itemSSCurrentState.name + " (" + (self.name)+"): " + body);
              callback(undefined,self.checkSSCurrentState(body));
          } else {
              //self.log("OpenHAB HTTP - error from " + self.itemSSCurrentState.name + " (" + (self.name)+"): " + error);
          }
      })
    }
    else
    {
      callback(undefined,self.checkSSCurrentState("Burglary"));
    }
};

/**
 * Get SSTargetState requested from iOS
 * @param callback
 */
SecuritySystemItem.prototype.getSSTargetState = function(callback) {
    var self = this;
    //this.log("iOS - request target security system state from " + this.itemSSTargetState.name + " (" + (self.name)+")");
    request(self.itemSSTargetState.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //self.log("OpenHAB HTTP - response from " + self.itemSSTargetState.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkSSTargetState(body));
        } else {
            //self.log("OpenHAB HTTP - error from " + self.itemSSTargetState.name + " (" + (self.name)+"): " + error);
        }
    })
};

/**
 * Set SSCurrentState from OpenHAB
 * @param message
 */
SecuritySystemItem.prototype.updateSSCurrentState = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemCurrentState)
        .setValue(this.checkSSCurrentState(message));

    this.setFromOpenHAB = true;
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemTargetState)
        .setValue(this.checkSSTargetState(message),
            function() {
                this.setFromOpenHAB = false;
            }.bind(this)
        );
};

/**
 * Set SSTargetState from OpenHAB
 * @param message
 */
SecuritySystemItem.prototype.updateSSTargetState = function(message) {
    this.setFromOpenHAB = true;
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemTargetState)
        .setValue(this.checkSSTargetState(message),
            function() {
                this.setFromOpenHAB = false;
            }.bind(this)
        );
};

/**
 * Set SSAlarmState from OpenHAB
 * @param message
 */
SecuritySystemItem.prototype.updateSSAlarmState = function(message) {
    if(message === "Burglary") {
        this.log(this.name + " ALARM TRIGGERED!");
    } else {
        this.log(this.name + " Alarm reset");
    }
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.SecuritySystemCurrentState)
        .setValue(this.checkSSCurrentState(message));
};

/**
 * Set SSTargetState
 * @param value
 * @param callback
 */
SecuritySystemItem.prototype.setSSTargetState = function(value, callback){
    var self = this;

    var command = 'Off';
    if (value == 0) {
      command = 'Vacation';
    } else if (value == 1) {
      command = 'Away';
    } else if (value == 2) {
      command = 'Night';
    } else if (value == 3) {
      command = 'Off';
    }

    if (this.setInitialState) {
        this.setInitialState = false;
        this.log(this.name + " set to " + command);
        callback();
        return;
    }

    if (this.setFromOpenHAB) {
        this.log(this.name + " set to " + command);
        callback();
        return;
    }

    //this.log("iOS - send message to " + this.itemSSTargetState.name + ": " + value);

    //this.log("iOS - send message to " + this.itemSSTargetState.name + ": " + command);

    request.post(
        this.itemSSTargetState.link,
        {
            body: command,
            headers: {'Content-Type': 'text/plain'}
        },
        function (error, response, body) {
            if (!error && response.statusCode == 201) {
                if(body !== " ") {
                    self.log(self.name + " set to " + body);
                }
                //self.log("OpenHAB HTTP - response from " + self.itemSSTargetState.name + ": " + body);
            } else {
                //self.log("OpenHAB HTTP - error from " + self.itemSSTargetState.name + ": " + error);
            }
            callback();
        }
    );
};


module.exports = SecuritySystemItem;
