"use strict";

var request = require("request");
const EventEmitter = require("events");

var ThermostatItem = function(widget,platform,homebridge) {
    //General
    this.temperatureDisplayUnits = homebridge.hap.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    this.thermostatItemEmitter = new EventEmitter();
    this.initEmitter();

    //CurrentTemperature
    this.itemCurrentTemperature = undefined;
    this.listenerCurrentTemperature = undefined;
    this.wsCurrentTemperature = undefined;

    //TargetTemperature
    this.itemTargetTemperature = undefined;
    this.setTargetTemperatureInitialState = false;
    this.targetTemperatureArr = [];
    this.targetTemperatureInProgress = false;
    this.targetTemperatureTimeout = 1000;

    //CurrentHeatingCoolingState
    this.itemCurrentHeatingCoolingState = undefined;
    this.listenerCurrentHeatingCoolingState = undefined;
    this.wsCurrentHeatingCoolingState = undefined;

    //TargetHeatingCoolingState
    this.itemTargetHeatingCoolingState = undefined;
    this.listenerTargetHeatingCoolingState = undefined;
    this.wsTargetHeatingCoolingState = undefined;

    //CoolingThresholdTemperature
    this.itemCoolingThresholdTemperature = undefined;
    this.listenerCoolingThresholdTemperature = undefined;
    this.wsCoolingThresholdTemperature = undefined;

    //HeatingThresholdTemperature
    this.itemHeatingThresholdTemperature = undefined;
    this.listenerHeatingThresholdTemperature = undefined;
    this.wsHeatingThresholdTemperature = undefined;

    ThermostatItem.super_.call(this, widget,platform,homebridge);
};

//CurrentTemperature
ThermostatItem.prototype.setCurrentTemperatureItem = function(item){
    this.itemCurrentTemperature = item;
    this.temperatureDisplayUnits = this.homebridge.hap.Characteristic.TemperatureDisplayUnits.CELSIUS;
};
//TargetTemperature
ThermostatItem.prototype.setTargetTemperatureItem = function(item){
    this.itemTargetTemperature = item;
};
//CurrentHeatingCoolingState
ThermostatItem.prototype.setCurrentHeatingCoolingStateItem = function(item){
    this.itemCurrentHeatingCoolingState = item;
};
//TargetHeatingCoolingState
ThermostatItem.prototype.setTargetHeatingCoolingStateItem = function(item){
    this.itemTargetHeatingCoolingState = item;
};
//CoolingThresholdTemperature
ThermostatItem.prototype.setCoolingThresholdTemperatureItem = function(item){
    this.itemCoolingThresholdTemperature = item;
};
//HeatingThresholdTemperature
ThermostatItem.prototype.setHeatingThresholdTemperatureItem = function(item){
    this.itemHeatingThresholdTemperature = item;
};


ThermostatItem.prototype.initEmitter = function() {
    var self=this;
    this.thermostatItemEmitter.on('TARGET_TEMPERATURE_UPDATE_EVENT', function() {
        self.setTargetTemperatureStateFromEmit();
    });
};

/**
 * Init all thermostat listener
 */
ThermostatItem.prototype.initListener = function() {
    if ((typeof this.itemCurrentTemperature) == 'undefined'){
        throw new Error(this.name + " needs CurrentTemperatureItem!");
    }

    //CurrentTemperature
    this.listenerCurrentTemperature = this.listenerFactory(
        this.itemCurrentTemperature.name,
        this.itemCurrentTemperature.link,
        this.wsCurrentTemperature,
        this.log,
        this.updateCurrentTemperature.bind(this)
    );

    //CurrentHeatingCoolingState
    this.listenerCurrentHeatingCoolingState = this.listenerFactory(
        this.itemCurrentHeatingCoolingState.name,
        this.itemCurrentHeatingCoolingState.link,
        this.wsCurrentHeatingCoolingState,
        this.log,
        this.updateCurrentHeatingCoolingState.bind(this)
    );

    //TargetHeatingCoolingState
    this.listenerTargetHeatingCoolingState = this.listenerFactory(
        this.itemTargetHeatingCoolingState.name,
        this.itemTargetHeatingCoolingState.link,
        this.wsTargetHeatingCoolingState,
        this.log,
        this.updateTargetHeatingCoolingState.bind(this)
    );

    //CoolingThresholdTemperature
    this.listenerCoolingThresholdTemperature = this.listenerFactory(
        this.itemCoolingThresholdTemperature.name,
        this.itemCoolingThresholdTemperature.link,
        this.wsCoolingThresholdTemperature,
        this.log,
        this.updateCoolingThresholdTemperature.bind(this)
    );

    //HeatingThresholdTemperature
    this.listenerHeatingThresholdTemperature = this.listenerFactory(
        this.itemHeatingThresholdTemperature.name,
        this.itemHeatingThresholdTemperature.link,
        this.wsHeatingThresholdTemperature,
        this.log,
        this.updateHeatingThresholdTemperature.bind(this)
    );
};

/**
 * Initiialize Others Services needed for ThermostatItem
 * @returns {*}
 */
ThermostatItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.Thermostat();

    //Init CurrentTemperature Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.CurrentTemperature)
        .on('get', this.getCurrentTemperatureState.bind(this))
        .setValue(this.checkTemperatureState(this.itemCurrentTemperature.state));

    //Init TargetTemperature Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.TargetTemperature)
        .on('get', this.getCurrentTemperatureState.bind(this))
        .setValue(this.checkTemperatureState(this.itemCurrentTemperature.state));

    //Init CurrentHeatingCoolingState Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.CurrentHeatingCoolingState)
        .on('get', this.getCurrentHeatingCoolingState.bind(this))
        .setValue(this.checkCurrentHeatingCoolingState(this.itemCurrentHeatingCoolingState.state));

    //Init TargetHeatingCoolingState Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.TargetHeatingCoolingState)
        .on('set', this.setTargetHeatingCoolingState.bind(this))
        .on('get', this.getTargetHeatingCoolingState.bind(this))
        .setValue(this.checkTargetHeatingCoolingState(this.itemTargetHeatingCoolingState.state));

    //Init CoolingThresholdTemperature Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.CoolingThresholdTemperature)
        .on('set', this.setCoolingThresholdTemperature.bind(this))
        .on('get', this.getCoolingThresholdTemperature.bind(this))
        .setValue(this.checkTemperatureState(this.itemCoolingThresholdTemperature.state));

    //Init HeatingThresholdTemperature Characteristic
    otherService.getCharacteristic(this.homebridge.hap.Characteristic.HeatingThresholdTemperature)
        .on('set', this.setHeatingThresholdTemperature.bind(this))
        .on('get', this.getHeatingThresholdTemperature.bind(this))
        .setValue(this.checkTemperatureState(this.itemHeatingThresholdTemperature.state));

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.TemperatureDisplayUnits)
        .on('get', this.getTemperatureDisplayUnits.bind(this))
        .setValue(this.temperatureDisplayUnits);



    return otherService;
};

//CurrentTemperature
ThermostatItem.prototype.updateCurrentTemperature = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.CurrentTemperature)
        .setValue(this.checkTemperatureState(message));
};
ThermostatItem.prototype.getCurrentTemperatureState = function(callback) {
    var self = this;
    this.log("iOS - request current temperature state from " + this.itemCurrentTemperature.name + " (" + (self.name)+")");
    request(self.itemCurrentTemperature.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.itemCurrentTemperature.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkTemperatureState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.itemCurrentTemperature.name + " (" + (self.name)+"): " + error);
        }
    })
};


//CurrentHeatingCoolingState
ThermostatItem.prototype.updateCurrentHeatingCoolingState = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.CurrentHeatingCoolingState)
        .setValue(this.checkCurrentHeatingCoolingState(message));
};
ThermostatItem.prototype.getCurrentHeatingCoolingState = function(callback) {
    var self = this;
    this.log("iOS - request Current Heating/Cooling State state from " + this.itemTargetHeatingCoolingState.name + " (" + (self.name)+")");
    request(self.itemTargetHeatingCoolingState.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.itemTargetHeatingCoolingState.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkCurrentHeatingCoolingState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.itemTargetHeatingCoolingState.name + " (" + (self.name)+"): " + error);
        }
    })
};


//TargetHeatingCoolingState
ThermostatItem.prototype.updateTargetHeatingCoolingState = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.TargtHeatingCoolingState)
        .setValue(this.checkTargetHeatingCoolingState(message));
};
ThermostatItem.prototype.getTargetHeatingCoolingState = function(callback) {
    var self = this;
    this.log("iOS - request Target Heating/Cooling State from " + this.itemTargetHeatingCoolingState.name + " (" + (self.name)+")");
    request(self.itemTargetHeatingCoolingState.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.itemTargetHeatingCoolingState.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkTargetHeatingCoolingState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.itemTargetHeatingCoolingState.name + " (" + (self.name)+"): " + error);
        }
    })
};
ThermostatItem.prototype.setTargetHeatingCoolingState = function(value,callback) {
    callback();
};


//CoolingThresholdTemperature
ThermostatItem.prototype.updateCoolingThresholdTemperature = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.CoolingThresholdTemperature)
        .setValue(this.checkTemperatureState(message));
};
ThermostatItem.prototype.getCoolingThresholdTemperature = function(callback) {
    var self = this;
    this.log("iOS - request Cooling Threshold Temperature state from " + this.itemCoolingThresholdTemperature.name + " (" + (self.name)+")");
    request(self.itemCoolingThresholdTemperature.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.itemCoolingThresholdTemperature.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkTemperatureState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.itemCoolingThresholdTemperature.name + " (" + (self.name)+"): " + error);
        }
    })
};
ThermostatItem.prototype.setCoolingThresholdTemperature = function(callback) {
    // var self = this;
    // //
    // // if (this.setInitialState) {
    // //     this.setInitialState = false;
    // //     callback();
    // //     return;
    // // }
    // //
    // // if (this.setFromOpenHAB) {
    // //     callback();
    // //     return;
    // // }
    //
    // this.log("iOS - send message to " + this.itemCoolingThresholdTemperature.name + ": " + value);
    // var command = value;
    // request.post(
    //     this.itemTargetDoorState.link,
    //     {
    //         body: command,
    //         headers: {'Content-Type': 'text/plain'}
    //     },
    //     function (error, response, body) {
    //         if (!error && response.statusCode == 201) {
    //             self.log("OpenHAB HTTP - response from " + self.itemCoolingThresholdTemperature.name + ": " + body);
    //         } else {
    //             self.log("OpenHAB HTTP - error from " + self.itemCoolingThresholdTemperature.name + ": " + error);
    //         }
    //         callback();
    //     }
    // );
    callback();
}


//HeatingThresholdTemperature
ThermostatItem.prototype.updateHeatingThresholdTemperature = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.HeatingThresholdTemperature)
        .setValue(this.checkTemperatureState(message));
};
ThermostatItem.prototype.getHeatingThresholdTemperature = function(callback) {
    var self = this;
    this.log("iOS - request Heating Threshold Temperature state from " + this.itemHeatingThresholdTemperature.name + " (" + (self.name)+")");
    request(self.itemHeatingThresholdTemperature.link + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log("OpenHAB HTTP - response from " + self.itemHeatingThresholdTemperature.name + " (" + (self.name)+"): " + body);
            callback(undefined,self.checkTemperatureState(body));
        } else {
            self.log("OpenHAB HTTP - error from " + self.itemHeatingThresholdTemperature.name + " (" + (self.name)+"): " + error);
        }
    })
};
ThermostatItem.prototype.setHeatingThresholdTemperature = function(callback) {
    callback();
}



ThermostatItem.prototype.getTemperatureDisplayUnits = function(callback) {
    callback(undefined,this.temperatureDisplayUnits);
};


ThermostatItem.prototype.checkTemperatureState = function(state) {
    if ('Unitialized' === state){
        return 20.0;
    }
    return +state;
};

ThermostatItem.prototype.checkTargetHeatingCoolingState = function(state) {
    switch (state){
        case 0:
            return this.homebridge.hap.Characteristic.TargetHeatingCoolingState.OFF;
        case 1:
            return this.homebridge.hap.Characteristic.TargetHeatingCoolingState.HEAT;
        case 2:
            return this.homebridge.hap.Characteristic.TargetHeatingCoolingState.COOL;
        case 3:
            return this.homebridge.hap.Characteristic.TargetHeatingCoolingState.AUTO;
        default:
            return this.homebridge.hap.Characteristic.TargetHeatingCoolingState.OFF;
    }
};

ThermostatItem.prototype.checkCurrentHeatingCoolingState = function(state) {
    switch (state){
        case 0:
            return this.homebridge.hap.Characteristic.CurrentHeatingCoolingState.OFF;
        case 1:
            return this.homebridge.hap.Characteristic.CurrentHeatingCoolingState.HEAT;
        case 2:
            return this.homebridge.hap.Characteristic.CurrentHeatingCoolingState.COOL;
        case 3:
            return this.homebridge.hap.Characteristic.CurrentHeatingCoolingState.OFF;
        default:
            return this.homebridge.hap.Characteristic.CurrentHeatingCoolingState.OFF;
    }
};


/**
 * Export ThermostatItem
 * @type {ThermostatItem}
 */
module.exports = ThermostatItem;
