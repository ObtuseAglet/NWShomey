# NWS Weather Homey App — Project Plan

This document defines the sequential development plan for completing the NWS Weather Homey App
with 100% functionality. Each phase is self-contained and designed to be assigned to a GitHub
agent for implementation.

---

## Architecture Overview

### Core Components
| Component | File(s) | Description |
|-----------|---------|-------------|
| NWS API Client | `lib/NWSClient.ts` | HTTP client for api.weather.gov |
| API Types | `lib/NWSTypes.ts` | TypeScript interfaces for all NWS responses |
| Location Manager | `lib/LocationManager.ts` | Location storage and coordinate resolution |
| Weather Poller | `lib/WeatherPoller.ts` | Scheduled data refresh with caching |
| Weather Cache | `lib/WeatherCache.ts` | In-memory + persistent cache with TTL |
| Flow Card Manager | `lib/FlowCardManager.ts` | Homey Flow card registration and handlers |
| Notification Service | `lib/NotificationService.ts` | Push notifications for severe weather |
| Weather Device | `drivers/nws-weather/` | Virtual weather device driver |
| Settings UI | `settings/index.html` | Homey app settings web page |

### Tech Stack
- **Language**: TypeScript 5 (compiled to CommonJS for Homey SDK)
- **Linting / Formatting**: Biome.js
- **Platform**: Homey SDK v3 — `local` and `cloud` platforms
- **Dev Environment**: VS Code Dev Container (`.devcontainer/devcontainer.json`)
- **Testing**: Jest + ts-jest (added in Phase 8)
- **API**: National Weather Service — `https://api.weather.gov` (no API key required)

---

## Phase 1: Project Infrastructure ✅

**Status**: Complete (this PR)

### What Was Done
- Converted `app.js` → `app.ts` (TypeScript)
- Added `tsconfig.json` for TypeScript compilation
- Added `biome.json` for Biome.js linting and formatting
- Created `.homeycompose/app.json` app manifest source
- Updated `package.json` with dev dependencies and scripts
- Expanded `locales/en.json` with all planned translation keys
- Updated `.devcontainer/devcontainer.json` with Biome VS Code extension and Homey CLI setup
- Updated `.gitignore` for TypeScript build artifacts

### Developer Commands (established in this phase)
```bash
npm install               # Install all dependencies
npm run build             # Compile TypeScript → .homeybuild/
npm run lint              # Run Biome linter
npm run format            # Auto-format with Biome
npm run check             # Lint + format in one pass
homey app validate        # Validate app.json structure
homey app run             # Deploy to Homey in dev mode
```

---

## Phase 2: NWS API Client

**Depends on**: Phase 1
**Estimated effort**: Medium

### Goal
Create a fully-typed TypeScript HTTP client for the NWS `api.weather.gov` API with built-in
caching, retry logic, and error handling.

### Agent Instructions
> Implement the NWS API types and HTTP client. Create `lib/NWSTypes.ts` with TypeScript
> interfaces for every NWS API response shape, and `lib/NWSClient.ts` with a class that wraps
> the NWS API endpoints. No third-party HTTP libraries — use the built-in Node.js `https`
> module or the global `fetch` (available in Node 18+). All code must pass `npm run check`
> (Biome). Do not modify any existing files outside of `lib/`.

### Files to Create
1. **`lib/NWSTypes.ts`** — TypeScript interfaces for NWS API responses
2. **`lib/NWSClient.ts`** — HTTP client class

### NWSTypes.ts — Interfaces Required
```typescript
// Shared
interface QuantitativeValue { unitCode: string; value: number | null; }

// /points/{lat},{lon} response
interface GridPointProperties {
  gridId: string;          // Weather Forecast Office (WFO) ID e.g. "TOP"
  gridX: number;
  gridY: number;
  forecast: string;        // URL
  forecastHourly: string;  // URL
  observationStations: string; // URL
  relativeLocation: { properties: { city: string; state: string; } };
  timeZone: string;
}
interface GridPointResponse { properties: GridPointProperties; }

// /gridpoints/{wfo}/{x},{y}/forecast response
interface ForecastPeriod {
  number: number;
  name: string;            // e.g. "Tonight", "Monday"
  startTime: string;       // ISO 8601
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  windSpeed: string;       // e.g. "10 mph"
  windDirection: string;
  icon: string;            // URL
  shortForecast: string;
  detailedForecast: string;
}
interface ForecastProperties { periods: ForecastPeriod[]; }
interface ForecastResponse { properties: ForecastProperties; }

// /alerts/active response
interface AlertProperties {
  id: string;
  areaDesc: string;
  sent: string;
  effective: string;
  expires: string;
  status: string;
  messageType: string;
  category: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme' | 'Unknown';
  certainty: string;
  urgency: string;
  event: string;
  headline: string;
  description: string;
  instruction: string;
}
interface Alert { id: string; properties: AlertProperties; }
interface AlertsResponse { features: Alert[]; }

// /stations/{stationId}/observations/latest
interface ObservationProperties {
  timestamp: string;
  textDescription: string;
  temperature: QuantitativeValue;
  dewpoint: QuantitativeValue;
  windDirection: QuantitativeValue;
  windSpeed: QuantitativeValue;
  windGust: QuantitativeValue;
  barometricPressure: QuantitativeValue;
  visibility: QuantitativeValue;
  relativeHumidity: QuantitativeValue;
  windChill: QuantitativeValue;
  heatIndex: QuantitativeValue;
}
interface ObservationResponse { properties: ObservationProperties; }
```

### NWSClient.ts — Methods Required
```typescript
class NWSClient {
  private readonly USER_AGENT = 'NWSHomey/1.0 (https://github.com/ObtuseAglet/NWSHomey)';

  /** Resolve lat/lon to NWS grid metadata (cache 24 hours) */
  async getGridPoint(lat: number, lon: number): Promise<GridPointProperties>;

  /** Get 7-day forecast (cache 30 min) */
  async getForecast(lat: number, lon: number): Promise<ForecastPeriod[]>;

  /** Get hourly forecast (cache 1 hour) */
  async getHourlyForecast(lat: number, lon: number): Promise<ForecastPeriod[]>;

  /** Get active alerts for a location (cache 1 min) */
  async getActiveAlerts(lat: number, lon: number): Promise<Alert[]>;

  /** Get latest observation from nearest station (cache 5 min) */
  async getLatestObservation(lat: number, lon: number): Promise<ObservationProperties>;

  /** Internal: fetch with retries and User-Agent header */
  private async fetchWithRetry<T>(url: string, ttlSeconds: number): Promise<T>;
}
```

### Caching Requirements
- Use an in-memory `Map<string, { data: unknown; expiresAt: number }>` for simple TTL caching
- Cache keys: `gridpoint:{lat},{lon}`, `forecast:{lat},{lon}`, etc.
- TTL values: gridpoint=86400s, forecast=1800s, hourlyForecast=3600s, alerts=60s, observation=300s

### Error Handling Requirements
- Throw typed errors: `NWSApiError` (extends `Error`) with `statusCode`, `url`, and `retryable` fields
- Retry up to 3 times on 5xx errors and network timeouts with exponential backoff (1s, 2s, 4s)
- Do not retry on 4xx errors (bad request)
- Log all errors via `console.error`

---

## Phase 3: Location Management & Settings Page

**Depends on**: Phase 2
**Estimated effort**: Medium

### Goal
Allow users to configure their location (latitude/longitude or US ZIP code). Store settings
in Homey and provide a web-based settings page.

### Agent Instructions
> Implement location management and the Homey settings page. Create `lib/LocationManager.ts`
> and `settings/index.html`. Update `app.ts` to initialize `LocationManager` on startup.
> All TypeScript must pass `npm run check`.

### Files to Create
1. **`lib/LocationManager.ts`** — Location service
2. **`settings/index.html`** — Homey settings web page

### LocationManager.ts — Interface
```typescript
interface LocationConfig {
  latitude: number;
  longitude: number;
  locationName: string;    // Human-readable name (city, state)
  source: 'manual' | 'zip' | 'homey';
}

class LocationManager {
  constructor(private app: Homey.App) {}

  async init(): Promise<void>;                            // Load stored settings
  async getLocation(): Promise<LocationConfig | null>;
  async setCoordinates(lat: number, lon: number): Promise<void>;
  async setZipCode(zip: string): Promise<void>;           // Resolves via Census API
  isWithinCoverage(lat: number, lon: number): boolean;   // US + territories only
  async resolveLocationName(lat: number, lon: number): Promise<string>;
}
```

### ZIP Code Resolution
- Use the free US Census Bureau Geocoding API:
  `https://geocoding.geo.census.gov/geocoder/locations/address?benchmark=4&format=json&zip={zip}`
- Extract latitude/longitude from response
- No API key required

### NWS Coverage Validation
The NWS API only covers the contiguous US, Alaska, Hawaii, and US territories.
Implement `isWithinCoverage` with bounding box checks:
- Contiguous US: lat 24–49, lon -125 to -66
- Alaska: lat 51–72, lon -180 to -130
- Hawaii: lat 18–23, lon -161 to -154
- Puerto Rico: lat 17–18.5, lon -67.5 to -65

### Settings Page (`settings/index.html`)
Build a responsive HTML page using the Homey Apps SDK settings API (`homeyReady`, `Homey.get`, `Homey.set`).

**Required UI elements:**
- Section: **Location**
  - Input: Latitude (number, step 0.0001)
  - Input: Longitude (number, step 0.0001)
  - Input: ZIP Code
  - Button: "Use ZIP Code" → resolves ZIP and populates lat/lon
  - Button: "Save Location"
  - Status text: Shows location name after save
- Section: **Weather Updates**
  - Select: Update interval (1 min, 5 min, 10 min, 15 min, 30 min) — default 10 min
- Section: **Notifications**
  - Toggle: Enable severe weather notifications
  - Select: Minimum severity (Minor, Moderate, Severe, Extreme) — default Severe
- Button: "Save Settings"

Use inline CSS only. Style consistently with `#0077BE` brand color.

### Update `app.ts`
```typescript
import { LocationManager } from './lib/LocationManager';
// In onInit():
this.locationManager = new LocationManager(this);
await this.locationManager.init();
```

---

## Phase 4: Weather Device Driver

**Depends on**: Phase 3
**Estimated effort**: Large

### Goal
Create a Homey virtual device driver that represents a weather station. Each device shows live
weather conditions as Homey capabilities.

### Agent Instructions
> Create the NWS weather device driver. Implement `drivers/nws-weather/driver.ts`,
> `drivers/nws-weather/device.ts`, and all required `.homeycompose` manifest files.
> The device should update its capabilities every time new weather data is polled.
> All TypeScript must pass `npm run check`.

### Files to Create
1. **`drivers/nws-weather/driver.ts`** — Driver class (extends `Homey.Driver`)
2. **`drivers/nws-weather/device.ts`** — Device class (extends `Homey.Device`)
3. **`drivers/nws-weather/assets/icon.svg`** — Copy from `assets/icon.svg`
4. **`.homeycompose/drivers/nws-weather/driver.compose.json`** — Driver manifest
5. **`.homeycompose/capabilities/weather_description.json`** — Custom capability
6. **`.homeycompose/capabilities/weather_alert_active.json`** — Custom capability

### Standard Capabilities (use Homey built-ins)
| Capability | Type | Unit | Description |
|------------|------|------|-------------|
| `measure_temperature` | number | °F | Current temperature |
| `measure_humidity` | number | % | Relative humidity |
| `measure_wind_strength` | number | mph | Wind speed |
| `measure_wind_angle` | number | ° | Wind direction |
| `measure_pressure` | number | hPa | Barometric pressure |
| `measure_rain` | number | in | Precipitation |

### Custom Capabilities
```json
// .homeycompose/capabilities/weather_description.json
{
  "type": "string",
  "title": { "en": "Weather Description" },
  "getable": true, "setable": false, "uiComponent": "sensor",
  "insights": false
}

// .homeycompose/capabilities/weather_alert_active.json
{
  "type": "boolean",
  "title": { "en": "Weather Alert Active" },
  "getable": true, "setable": false, "uiComponent": "sensor",
  "insights": true
}
```

### driver.compose.json
```json
{
  "name": { "en": "NWS Weather Station" },
  "class": "sensor",
  "capabilities": [
    "measure_temperature", "measure_humidity", "measure_wind_strength",
    "measure_wind_angle", "measure_pressure", "weather_description",
    "weather_alert_active"
  ],
  "platforms": ["local", "cloud"],
  "connectivity": ["cloud"],
  "pair": [{ "id": "list_devices", "template": "list_devices" }]
}
```

### Device Class Requirements
```typescript
class NWSWeatherDevice extends Homey.Device {
  async onInit(): Promise<void>;      // Register with app's poller
  async onDeleted(): Promise<void>;   // Unregister from poller
  async updateConditions(obs: ObservationProperties, alerts: Alert[]): Promise<void>;
  async updateFromObservation(obs: ObservationProperties): Promise<void>;
  async updateAlertStatus(alerts: Alert[]): Promise<void>;
}
```

### Driver Class Requirements
```typescript
class NWSWeatherDriver extends Homey.Driver {
  async onInit(): Promise<void>;
  async onPairListDevices(): Promise<DeviceData[]>;  // Returns location-based device
}
```

---

## Phase 5: Flow Cards

**Depends on**: Phase 4
**Estimated effort**: Large

### Goal
Implement all Homey Flow trigger, condition, and action cards for weather-based automations.

### Agent Instructions
> Implement all Flow cards. Create the `.homeycompose/flow/` manifest files and the
> `lib/FlowCardManager.ts` handler class. Register all cards in `app.ts`.
> All TypeScript must pass `npm run check`.

### Files to Create
1. **`lib/FlowCardManager.ts`** — Card registration and handler logic
2. **`.homeycompose/flow/triggers/weather_alert_issued.json`**
3. **`.homeycompose/flow/triggers/temperature_threshold.json`**
4. **`.homeycompose/flow/triggers/weather_condition_changed.json`**
5. **`.homeycompose/flow/conditions/alert_active.json`**
6. **`.homeycompose/flow/conditions/temperature_is.json`**
7. **`.homeycompose/flow/conditions/forecast_includes.json`**
8. **`.homeycompose/flow/actions/get_current_conditions.json`**
9. **`.homeycompose/flow/actions/get_forecast.json`**
10. **`.homeycompose/flow/actions/refresh_weather_data.json`**
11. **`.homeycompose/flow/actions/speak_weather.json`**

### Trigger Card Definitions

#### `weather_alert_issued`
```json
{
  "id": "weather_alert_issued",
  "title": { "en": "A weather alert was issued" },
  "hint": { "en": "Triggers when a new NWS weather alert is issued for your location." },
  "args": [
    {
      "name": "severity",
      "type": "dropdown",
      "title": { "en": "Minimum severity" },
      "values": [
        { "id": "Minor", "label": { "en": "Minor or above" } },
        { "id": "Moderate", "label": { "en": "Moderate or above" } },
        { "id": "Severe", "label": { "en": "Severe or above" } },
        { "id": "Extreme", "label": { "en": "Extreme only" } }
      ]
    }
  ],
  "tokens": [
    { "name": "alert_event", "type": "string", "title": { "en": "Alert event" } },
    { "name": "alert_headline", "type": "string", "title": { "en": "Alert headline" } },
    { "name": "alert_severity", "type": "string", "title": { "en": "Alert severity" } },
    { "name": "alert_area", "type": "string", "title": { "en": "Alert area" } }
  ]
}
```

#### `temperature_threshold`
```json
{
  "id": "temperature_threshold",
  "title": { "en": "Temperature crosses a threshold" },
  "args": [
    {
      "name": "direction",
      "type": "dropdown",
      "title": { "en": "Direction" },
      "values": [
        { "id": "above", "label": { "en": "rises above" } },
        { "id": "below", "label": { "en": "drops below" } }
      ]
    },
    { "name": "value", "type": "number", "title": { "en": "Temperature (°F)" } }
  ],
  "tokens": [
    { "name": "temperature", "type": "number", "title": { "en": "Temperature (°F)" } }
  ]
}
```

#### `weather_condition_changed`
```json
{
  "id": "weather_condition_changed",
  "title": { "en": "Weather condition changed" },
  "tokens": [
    { "name": "old_condition", "type": "string", "title": { "en": "Previous condition" } },
    { "name": "new_condition", "type": "string", "title": { "en": "New condition" } },
    { "name": "description", "type": "string", "title": { "en": "Description" } }
  ]
}
```

### Condition Card Definitions

#### `alert_active`
```json
{
  "id": "alert_active",
  "title": { "en": "A weather alert is !{{active|inactive}}" },
  "args": [
    {
      "name": "severity",
      "type": "dropdown",
      "title": { "en": "Minimum severity" },
      "values": [
        { "id": "Minor", "label": { "en": "Minor or above" } },
        { "id": "Moderate", "label": { "en": "Moderate or above" } },
        { "id": "Severe", "label": { "en": "Severe or above" } },
        { "id": "Extreme", "label": { "en": "Extreme only" } }
      ]
    }
  ]
}
```

#### `temperature_is`
```json
{
  "id": "temperature_is",
  "title": { "en": "Current temperature is !{{above|below}} {{value}}°F" },
  "args": [
    {
      "name": "direction",
      "type": "dropdown",
      "title": { "en": "Direction" },
      "values": [
        { "id": "above", "label": { "en": "above" } },
        { "id": "below", "label": { "en": "below" } }
      ]
    },
    { "name": "value", "type": "number", "title": { "en": "Temperature (°F)" } }
  ]
}
```

#### `forecast_includes`
```json
{
  "id": "forecast_includes",
  "title": { "en": "The forecast calls for {{condition}} {{period}}" },
  "args": [
    {
      "name": "condition",
      "type": "dropdown",
      "title": { "en": "Condition" },
      "values": [
        { "id": "rain", "label": { "en": "Rain" } },
        { "id": "snow", "label": { "en": "Snow" } },
        { "id": "thunderstorm", "label": { "en": "Thunderstorms" } },
        { "id": "fog", "label": { "en": "Fog" } },
        { "id": "wind", "label": { "en": "High winds" } },
        { "id": "clear", "label": { "en": "Clear skies" } }
      ]
    },
    {
      "name": "period",
      "type": "dropdown",
      "title": { "en": "Time period" },
      "values": [
        { "id": "today", "label": { "en": "Today" } },
        { "id": "tonight", "label": { "en": "Tonight" } },
        { "id": "tomorrow", "label": { "en": "Tomorrow" } },
        { "id": "next_24h", "label": { "en": "Next 24 hours" } },
        { "id": "next_48h", "label": { "en": "Next 48 hours" } }
      ]
    }
  ]
}
```

### Action Card Definitions

#### `get_current_conditions`
```json
{
  "id": "get_current_conditions",
  "title": { "en": "Get current weather conditions" },
  "tokens": [
    { "name": "temperature", "type": "number", "title": { "en": "Temperature (°F)" } },
    { "name": "humidity", "type": "number", "title": { "en": "Humidity (%)" } },
    { "name": "wind_speed", "type": "number", "title": { "en": "Wind speed (mph)" } },
    { "name": "description", "type": "string", "title": { "en": "Description" } }
  ]
}
```

#### `get_forecast`
```json
{
  "id": "get_forecast",
  "title": { "en": "Get weather forecast for {{period}}" },
  "args": [
    {
      "name": "period",
      "type": "dropdown",
      "title": { "en": "Period" },
      "values": [
        { "id": "today", "label": { "en": "Today" } },
        { "id": "tonight", "label": { "en": "Tonight" } },
        { "id": "tomorrow", "label": { "en": "Tomorrow" } }
      ]
    }
  ],
  "tokens": [
    { "name": "forecast_text", "type": "string", "title": { "en": "Forecast text" } },
    { "name": "high_temp", "type": "number", "title": { "en": "High temperature (°F)" } },
    { "name": "low_temp", "type": "number", "title": { "en": "Low temperature (°F)" } }
  ]
}
```

#### `refresh_weather_data`
```json
{
  "id": "refresh_weather_data",
  "title": { "en": "Refresh weather data" },
  "hint": { "en": "Forces an immediate weather data refresh from NWS." }
}
```

#### `speak_weather`
```json
{
  "id": "speak_weather",
  "title": { "en": "Speak current weather conditions" },
  "hint": { "en": "Speaks the current weather conditions using Homey's text-to-speech." }
}
```

### FlowCardManager.ts Requirements
```typescript
class FlowCardManager {
  constructor(private app: Homey.App, private poller: WeatherPoller) {}

  async init(): Promise<void>;  // Register all cards

  // Trigger handlers (called by WeatherPoller events)
  async triggerAlertIssued(alert: Alert): Promise<void>;
  async triggerTemperatureThreshold(temp: number): Promise<void>;
  async triggerConditionChanged(oldCond: string, newCond: string): Promise<void>;

  // Condition handlers
  private isAlertActive(severity: string): boolean;
  private isTemperatureInRange(direction: string, value: number): boolean;
  private doesForecastInclude(condition: string, period: string): boolean;

  // Action handlers
  private async handleGetCurrentConditions(): Promise<Record<string, unknown>>;
  private async handleGetForecast(period: string): Promise<Record<string, unknown>>;
  private async handleRefresh(): Promise<void>;
  private async handleSpeakWeather(): Promise<void>;
}
```

### Update `app.ts`
```typescript
import { FlowCardManager } from './lib/FlowCardManager';
// In onInit() (after weatherPoller):
this.flowCardManager = new FlowCardManager(this, this.weatherPoller);
await this.flowCardManager.init();
```

---

## Phase 6: Polling Service & Caching

**Depends on**: Phase 5
**Estimated effort**: Medium

### Goal
Implement a robust polling service that periodically fetches weather data, maintains a cache,
and emits typed events that drive flow card triggers and device capability updates.

### Agent Instructions
> Implement `lib/WeatherPoller.ts` and `lib/WeatherCache.ts`. The poller must emit events
> using Node.js `EventEmitter`. Wire the poller into `app.ts` and make sure
> `FlowCardManager` and device instances subscribe to its events.
> All TypeScript must pass `npm run check`.

### Files to Create
1. **`lib/WeatherCache.ts`** — TTL cache with Homey store persistence
2. **`lib/WeatherPoller.ts`** — Polling service with event emitter

### WeatherCache.ts
```typescript
interface CacheEntry<T> { data: T; expiresAt: number; }

class WeatherCache {
  constructor(private store: Homey.SimpleClass) {}

  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttlSeconds: number): void;
  invalidate(key: string): void;
  clear(): void;
  async persist(): Promise<void>;      // Save to Homey store
  async restore(): Promise<void>;      // Load from Homey store
}
```

### WeatherPoller.ts
```typescript
interface PollerEvents {
  'alerts_updated': (alerts: Alert[]) => void;
  'alert_issued': (alert: Alert) => void;
  'conditions_updated': (obs: ObservationProperties) => void;
  'condition_changed': (oldCond: string, newCond: string) => void;
  'temperature_changed': (temp: number) => void;
  'forecast_updated': (periods: ForecastPeriod[]) => void;
  'error': (err: Error) => void;
}

class WeatherPoller extends EventEmitter {
  constructor(
    private app: Homey.App,
    private client: NWSClient,
    private locationManager: LocationManager,
    private cache: WeatherCache
  ) { super(); }

  async start(): Promise<void>;   // Begin polling all data types
  async stop(): Promise<void>;    // Clear all intervals
  async refresh(): Promise<void>; // Force immediate refresh

  // Polling intervals (configurable via settings)
  private alertsIntervalMs: number;      // default: 60_000 (1 min)
  private conditionsIntervalMs: number;  // default: 300_000 (5 min)
  private forecastIntervalMs: number;    // default: 1_800_000 (30 min)
}
```

### Update `app.ts`
```typescript
import { NWSClient } from './lib/NWSClient';
import { WeatherCache } from './lib/WeatherCache';
import { WeatherPoller } from './lib/WeatherPoller';

// In onInit():
const client = new NWSClient();
const cache = new WeatherCache(this);
await cache.restore();
this.weatherPoller = new WeatherPoller(this, client, this.locationManager, cache);
await this.weatherPoller.start();
```

---

## Phase 7: Notification Service

**Depends on**: Phase 6
**Estimated effort**: Small

### Goal
Send Homey push notifications for new severe weather alerts. Respect user-configured severity
thresholds. Deduplicate notifications so the same alert is not sent twice.

### Agent Instructions
> Implement `lib/NotificationService.ts`. Register the service in `app.ts` and subscribe it
> to `WeatherPoller` `alert_issued` events. All TypeScript must pass `npm run check`.

### Files to Create
1. **`lib/NotificationService.ts`** — Notification manager

### NotificationService.ts
```typescript
type AlertSeverity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme';

const SEVERITY_ORDER: AlertSeverity[] = ['Minor', 'Moderate', 'Severe', 'Extreme'];

class NotificationService {
  private sentAlertIds = new Set<string>();

  constructor(private app: Homey.App, private poller: WeatherPoller) {}

  async init(): Promise<void>;   // Subscribe to poller events, load settings

  private async onAlertIssued(alert: Alert): Promise<void>;
  private meetsThreshold(alertSeverity: AlertSeverity, threshold: AlertSeverity): boolean;
  private formatNotification(alert: Alert): string;
  private async sendNotification(message: string): Promise<void>;
  private pruneExpiredAlerts(alerts: Alert[]): void;
}
```

### Notification Format
```
⚠️ {alert.properties.event}: {alert.properties.headline}
```
For Extreme severity, prefix with: `🚨` instead of `⚠️`

### Settings Integration
Read from `Homey.ManagerSettings`:
- `notifications_enabled` (boolean, default `true`)
- `notification_severity` (string, default `'Severe'`)

### Update `app.ts`
```typescript
import { NotificationService } from './lib/NotificationService';
// In onInit() (after weatherPoller):
this.notificationService = new NotificationService(this, this.weatherPoller);
await this.notificationService.init();
```

---

## Phase 8: Unit Tests

**Depends on**: Phases 2–7
**Estimated effort**: Large

### Goal
Add comprehensive unit tests for all core modules using Jest and ts-jest.

### Agent Instructions
> Add unit tests for all modules in `lib/`. Use Jest with ts-jest. Create fixture files in
> `test/fixtures/` with real NWS API response shapes. Tests must not make real HTTP calls —
> mock the `fetch` global and Homey classes. Run `npm test` and ensure all tests pass.
> Add Jest dependencies and config to `package.json`.

### Dependencies to Add
```bash
npm install --save-dev jest ts-jest @types/jest
```

### Files to Create
1. **`jest.config.ts`** — Jest configuration
2. **`test/NWSClient.test.ts`** — API client tests
3. **`test/LocationManager.test.ts`** — Location service tests
4. **`test/WeatherPoller.test.ts`** — Polling service tests
5. **`test/FlowCards.test.ts`** — Flow card handler tests
6. **`test/NotificationService.test.ts`** — Notification service tests
7. **`test/fixtures/gridpoint.json`** — Sample NWS /points response
8. **`test/fixtures/forecast.json`** — Sample NWS /forecast response
9. **`test/fixtures/alerts.json`** — Sample NWS /alerts/active response
10. **`test/fixtures/observation.json`** — Sample NWS /observations/latest response

### jest.config.ts
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.d.ts'],
  coverageThreshold: { global: { lines: 80 } },
};
export default config;
```

### NWSClient.test.ts — Key Test Cases
- Returns cached data on second call (no duplicate fetch)
- Retries on 503 status (up to 3 times)
- Throws `NWSApiError` on 404 without retry
- Returns typed `GridPointProperties` on success
- Uses correct `User-Agent` header
- Handles malformed JSON response gracefully

### LocationManager.test.ts — Key Test Cases
- Stores and retrieves coordinates from Homey settings
- Resolves a valid US ZIP code to coordinates
- Rejects coordinates outside NWS coverage area
- Returns `null` when no location configured

### WeatherPoller.test.ts — Key Test Cases
- Emits `alert_issued` when a new alert appears
- Does not re-emit `alert_issued` for existing alerts
- Emits `conditions_updated` on each poll cycle
- Emits `condition_changed` when text description changes
- Stops polling after `stop()` is called

### FlowCards.test.ts — Key Test Cases
- `alert_active` condition returns true when alert matches severity
- `temperature_is` above/below logic works correctly
- `get_current_conditions` action returns all expected tokens
- `speak_weather` action calls Homey TTS

---

## Phase 9: Integration Testing & Release Polish

**Depends on**: Phase 8
**Estimated effort**: Medium

### Goal
End-to-end testing, documentation finalization, and app store preparation.

### Agent Instructions
> Complete all remaining polish tasks. Run `homey app validate` and fix any issues. Run
> `npm run check` and fix any remaining Biome lint errors. Update all documentation.
> Ensure `npm test` passes with ≥80% coverage. Create `CHANGELOG.md`.

### Tasks
1. Run `npx biome check --write .` and commit all auto-fixes
2. Run `homey app validate` and fix any manifest issues
3. Update `README.md`:
   - Add full feature list with checkmarks
   - Add configuration instructions with screenshots
   - Add troubleshooting section
   - Update "Current Status" to reflect completed features
4. Update `README.txt` for the Homey App Store
5. Create `CHANGELOG.md` with version `1.0.0` entry listing all features
6. Verify `npm test` passes with ≥80% line coverage
7. Verify all strings in `locales/en.json` are used in the codebase
8. Add `homepage` field to `package.json`
9. Bump version to `1.0.0` in `package.json` and `.homeycompose/app.json`

---

## Summary Table

| Phase | Description | Depends On | Effort |
|-------|-------------|------------|--------|
| 1 | Project Infrastructure (TypeScript, Biome) | — | ✅ Done |
| 2 | NWS API Client | 1 | Medium |
| 3 | Location Management & Settings | 2 | Medium |
| 4 | Weather Device Driver | 3 | Large |
| 5 | Flow Cards | 4 | Large |
| 6 | Polling Service & Caching | 5 | Medium |
| 7 | Notification Service | 6 | Small |
| 8 | Unit Tests | 2–7 | Large |
| 9 | Integration Testing & Release | 8 | Medium |

---

## NWS API Reference

| Endpoint | Purpose | Cache TTL |
|----------|---------|-----------|
| `GET /points/{lat},{lon}` | Grid metadata (WFO, gridX, gridY, timezone) | 24 hours |
| `GET /gridpoints/{wfo}/{x},{y}/forecast` | 7-day forecast periods | 30 min |
| `GET /gridpoints/{wfo}/{x},{y}/forecast/hourly` | Hourly forecast | 1 hour |
| `GET /alerts/active?point={lat},{lon}` | Active alerts for a point | 1 min |
| `GET /stations/{stationId}/observations/latest` | Latest observation | 5 min |

**Required HTTP headers:**
```
User-Agent: NWSHomey/1.0 (https://github.com/ObtuseAglet/NWSHomey)
Accept: application/geo+json
```

---

## Homey SDK Resources

- [App SDK Docs](https://apps.developer.homey.app/)
- [SDK API Reference](https://apps-sdk-v3.developer.homey.app/)
- [Flow Cards Guide](https://apps.developer.homey.app/flows)
- [Device Capabilities](https://apps.developer.homey.app/devices/capabilities)
- [App Settings](https://apps.developer.homey.app/settings)
- [Notifications](https://apps.developer.homey.app/notifications)
- [NWS API Spec](https://api.weather.gov/openapi.json)
