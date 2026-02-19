import type {
  Alert,
  AlertsResponse,
  ForecastPeriod,
  ForecastResponse,
  GridPointProperties,
  GridPointResponse,
  ObservationProperties,
  ObservationResponse,
  StationsResponse,
} from './NWSTypes';
import { NWSApiError } from './NWSTypes';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export class NWSClient {
  private readonly USER_AGENT = 'NWSHomey/1.0 (https://github.com/ObtuseAglet/NWSHomey)';
  private readonly BASE_URL = 'https://api.weather.gov';
  private readonly cache = new Map<string, CacheEntry>();

  /** Resolve lat/lon to NWS grid metadata (cache 24 hours) */
  async getGridPoint(lat: number, lon: number): Promise<GridPointProperties> {
    const url = `${this.BASE_URL}/points/${lat},${lon}`;
    const response = await this.fetchWithRetry<GridPointResponse>(url, 86400);
    return response.properties;
  }

  /** Get 7-day forecast (cache 30 min) */
  async getForecast(lat: number, lon: number): Promise<ForecastPeriod[]> {
    const gridPoint = await this.getGridPoint(lat, lon);
    const response = await this.fetchWithRetry<ForecastResponse>(gridPoint.forecast, 1800);
    return response.properties.periods;
  }

  /** Get hourly forecast (cache 1 hour) */
  async getHourlyForecast(lat: number, lon: number): Promise<ForecastPeriod[]> {
    const gridPoint = await this.getGridPoint(lat, lon);
    const response = await this.fetchWithRetry<ForecastResponse>(gridPoint.forecastHourly, 3600);
    return response.properties.periods;
  }

  /** Get active alerts for a location (cache 1 min) */
  async getActiveAlerts(lat: number, lon: number): Promise<Alert[]> {
    const url = `${this.BASE_URL}/alerts/active?point=${lat},${lon}`;
    const response = await this.fetchWithRetry<AlertsResponse>(url, 60);
    return response.features;
  }

  /** Get latest observation from nearest station (cache 5 min) */
  async getLatestObservation(lat: number, lon: number): Promise<ObservationProperties> {
    const gridPoint = await this.getGridPoint(lat, lon);
    const stationsResponse = await this.fetchWithRetry<StationsResponse>(
      gridPoint.observationStations,
      86400
    );
    const firstStation = stationsResponse.features[0];
    if (!firstStation) {
      throw new NWSApiError(
        `No observation stations found (lat: ${lat}, lon: ${lon})`,
        0,
        gridPoint.observationStations,
        false
      );
    }
    const stationId = firstStation.properties.stationIdentifier;
    const obsUrl = `${this.BASE_URL}/stations/${stationId}/observations/latest`;
    const obsResponse = await this.fetchWithRetry<ObservationResponse>(obsUrl, 300);
    return obsResponse.properties;
  }

  /** Internal: fetch with retries and User-Agent header */
  private async fetchWithRetry<T>(url: string, ttlSeconds: number): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }

    const maxAttempts = 4; // 1 initial + 3 retries
    let lastError: NWSApiError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delayMs = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': this.USER_AGENT },
        });

        if (!response.ok) {
          const retryable = response.status >= 500;
          const error = new NWSApiError(
            `NWS API error ${response.status}: ${response.statusText}`,
            response.status,
            url,
            retryable
          );
          if (!retryable) {
            console.error(error.message, { url, statusCode: response.status });
            throw error;
          }
          lastError = error;
          console.error(error.message, { url, attempt: attempt + 1 });
          continue;
        }

        const data = (await response.json()) as T;
        this.cache.set(url, { data, expiresAt: now + ttlSeconds * 1000 });
        return data;
      } catch (err) {
        if (err instanceof NWSApiError) {
          throw err;
        }
        // Network / timeout error — retryable
        const networkError = new NWSApiError(
          `Network error: ${err instanceof Error ? err.message : String(err)}`,
          0,
          url,
          true
        );
        lastError = networkError;
        console.error(networkError.message, { url, attempt: attempt + 1 });
      }
    }

    throw lastError ?? new NWSApiError('Unknown error', 0, url, false);
  }
}
