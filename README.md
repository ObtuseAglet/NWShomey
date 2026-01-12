# NWS Weather for Homey

A Homey app that integrates the National Weather Service (NWS) API to enable weather-based automations in your smart home.

## Overview

This app brings official weather data from the National Oceanic and Atmospheric Administration (NOAA) National Weather Service directly into your Homey. Create powerful automations based on real-time weather conditions, forecasts, and alerts.

## Current Status

This is the initial setup of the app. The basic structure is in place and ready for development.

### Implemented
- ✅ Basic app structure following Homey SDK guidelines
- ✅ App manifest with proper metadata
- ✅ Project configuration and dependencies

### Planned Features
- 🔜 NWS API client integration
- 🔜 Location-based weather data retrieval
- 🔜 Real-time weather alerts and warnings
- 🔜 Current conditions monitoring
- 🔜 Forecast data access (hourly and daily)
- 🔜 Flow cards for weather-based automations
  - Trigger cards: When alert issued, when conditions change, etc.
  - Condition cards: Current temperature, alert active, etc.
  - Action cards: Check forecast, get alert details, etc.
- 🔜 Custom location support via GPS coordinates or ZIP codes
- 🔜 Severe weather notifications

## About the NWS API

The National Weather Service provides free, reliable weather data for the United States and its territories through their public API at https://api.weather.gov/

Key features of the NWS API:
- No API key required
- Real-time weather alerts and warnings
- Detailed forecasts (hourly and 7-day)
- Observations from weather stations
- Radar and satellite data references
- Free and reliable service from NOAA

## Development Setup

### Prerequisites
- Node.js v18 or higher
- Homey CLI (`npm install -g homey`)
- A Homey device (Pro or Cloud)

### Installation
1. Clone this repository
2. Navigate to the app directory: `cd com.obtuseaglet.nws`
3. Install dependencies: `npm install`
4. Build the app: `homey app build`

### Running for Development
```bash
homey app run
```

This will install the app on your Homey in development mode. Press Ctrl+C to stop and uninstall.

### Testing
To install without keeping the terminal open:
```bash
homey app install
```

## Project Structure

```
com.obtuseaglet.nws/
├── .homeycompose/          # Compose files for building app.json
│   └── app.json            # App manifest source
├── assets/                 # App assets
│   ├── icon.svg           # App icon
│   └── images/            # App store images
├── drivers/               # Device drivers (future)
├── locales/              # Translations
│   └── en.json          # English translations
├── app.js               # Main app class
├── package.json        # Node.js dependencies
└── README.txt         # App store description
```

## Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome!

## Resources

- [NWS API Documentation](https://www.weather.gov/documentation/services-web-api)
- [Homey Apps SDK](https://apps.developer.homey.app/)
- [GitHub Repository](https://github.com/ObtuseAglet/NWSHomey)

## License

GPL-3.0

## Author

ObtuseAglet

## Disclaimer

This app uses data from the National Weather Service, which is a U.S. government service. The developer of this app is not affiliated with NOAA or the National Weather Service.
