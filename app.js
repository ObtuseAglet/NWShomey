'use strict';

const Homey = require('homey');

class NWSWeatherApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('NWS Weather App has been initialized');

    // Future: Initialize NWS API client here
    // this.nwsClient = new NWSClient();
  }
}

module.exports = NWSWeatherApp;
