import Homey from 'homey';

class NWSWeatherApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit(): Promise<void> {
    this.log('NWS Weather App has been initialized');

    // Future phases will initialize services here:
    // this.locationManager = new LocationManager(this);
    // this.nwsClient = new NWSClient();
    // this.weatherPoller = new WeatherPoller(this, this.nwsClient, this.locationManager);
    // this.flowCardManager = new FlowCardManager(this, this.weatherPoller);
    // this.notificationService = new NotificationService(this, this.weatherPoller);
    // await this.locationManager.init();
    // await this.weatherPoller.start();
  }
}

module.exports = NWSWeatherApp;
