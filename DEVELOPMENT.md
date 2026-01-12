# Development Notes for NWS Homey App

## App Structure Created

This basic Homey app has been successfully set up following the Homey App SDK guidelines.

### What's Included

1. **App Manifest** (`.homeycompose/app.json`)
   - App ID: `com.obtuseaglet.nws`
   - SDK version: 3
   - Platforms: local and cloud
   - Category: climate
   - Brand color: #0077BE (blue)

2. **Main App Class** (`app.js`)
   - Basic structure with `onInit()` method
   - Placeholder for future NWS API client

3. **Assets**
   - App icon (SVG)
   - Store images (small, large, xlarge)

4. **Configuration Files**
   - `package.json` - Node.js dependencies
   - `.gitignore` - Git exclusions
   - `.homeyignore` - Files to exclude from published app
   - `locales/en.json` - English translations

5. **Documentation**
   - `README.md` - Developer documentation
   - `README.txt` - App Store description

### Validation Status

✅ The app successfully validates with `homey app validate`
✅ App builds correctly with `homey app build`
✅ Ready for development and testing

## Next Steps for Development

### 1. NWS API Integration
- Create an API client module for NWS endpoints
- Key endpoints to implement:
  - `/points/{lat},{lon}` - Get forecast URLs for a location
  - `/gridpoints/{office}/{gridX},{gridY}/forecast` - Get forecast
  - `/alerts/active` - Get active weather alerts
  - `/stations/{stationId}/observations/latest` - Current conditions

### 2. Location Management
- Add settings for user's location (lat/lon or ZIP code)
- Convert ZIP codes to coordinates if needed
- Store location preferences

### 3. Flow Cards
Implement Homey Flow cards for automations:

**Trigger Cards:**
- Weather alert issued
- Temperature crosses threshold
- Weather condition changes

**Condition Cards:**
- Current temperature is...
- Weather alert is active
- Forecast calls for...

**Action Cards:**
- Get current conditions
- Get forecast
- Check for alerts

### 4. Data Polling
- Set up polling intervals for weather data
- Implement caching to respect API rate limits
- Handle API errors gracefully

### 5. Notifications
- Optional push notifications for severe weather
- Configurable alert types

### 6. Testing
- Test on both Homey Pro (local) and Homey Cloud
- Verify API responses and error handling
- Test Flow cards

## NWS API Notes

- **No API key required** - The NWS API is completely free
- **User-Agent header required** - Must identify your app
- **Rate limiting** - Be respectful; cache responses
- **HTTPS only** - All requests must use HTTPS
- **Coverage** - US and territories only

### Example API Flow

1. Get grid point data for coordinates:
   ```
   GET https://api.weather.gov/points/{lat},{lon}
   ```

2. From response, extract forecast URL

3. Get forecast:
   ```
   GET {forecastUrl}
   ```

4. Check for active alerts:
   ```
   GET https://api.weather.gov/alerts/active?point={lat},{lon}
   ```

## Useful Homey CLI Commands

- `homey app run` - Run app in development mode
- `homey app install` - Install app without keeping terminal open
- `homey app validate` - Validate app structure
- `homey app build` - Build app.json from compose files
- `homey select` - Switch between Homey devices
- `homey logout` / `homey login` - Change account

## Resources

- [Homey Apps SDK Documentation](https://apps.developer.homey.app/)
- [Homey SDK API Reference](https://apps-sdk-v3.developer.homey.app/)
- [NWS API Specification](https://www.weather.gov/documentation/services-web-api)
- [NWS API OpenAPI Spec](https://api.weather.gov/openapi.json)

## License

This app is licensed under GPL-3.0. The National Weather Service data is in the public domain as a U.S. government product.
