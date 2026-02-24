// Shared
export interface QuantitativeValue {
  unitCode: string;
  value: number | null;
}

// /points/{lat},{lon} response
export interface GridPointProperties {
  gridId: string; // Weather Forecast Office (WFO) ID e.g. "TOP"
  gridX: number;
  gridY: number;
  forecast: string; // URL
  forecastHourly: string; // URL
  observationStations: string; // URL
  relativeLocation: { properties: { city: string; state: string } };
  timeZone: string;
}

export interface GridPointResponse {
  properties: GridPointProperties;
}

// /gridpoints/{wfo}/{x},{y}/forecast response
export interface ForecastPeriod {
  number: number;
  name: string; // e.g. "Tonight", "Monday"
  startTime: string; // ISO 8601
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  windSpeed: string; // e.g. "10 mph"
  windDirection: string;
  icon: string; // URL
  shortForecast: string;
  detailedForecast: string;
}

export interface ForecastProperties {
  periods: ForecastPeriod[];
}

export interface ForecastResponse {
  properties: ForecastProperties;
}

// /alerts/active response
export interface AlertProperties {
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

export interface Alert {
  id: string;
  properties: AlertProperties;
}

export interface AlertsResponse {
  features: Alert[];
}

// /stations/{stationId}/observations/latest
export interface ObservationProperties {
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

export interface ObservationResponse {
  properties: ObservationProperties;
}

// /points/{lat},{lon} → observationStations list
export interface StationFeature {
  id: string;
  properties: {
    stationIdentifier: string;
  };
}

export interface StationsResponse {
  features: StationFeature[];
}

// Typed error for NWS API failures
export class NWSApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly url: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = 'NWSApiError';
    // Restore prototype chain for instanceof checks in CommonJS output
    Object.setPrototypeOf(this, NWSApiError.prototype);
  }
}
