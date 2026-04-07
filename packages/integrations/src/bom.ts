/**
 * Bureau of Meteorology (BOM) weather integration.
 * Uses the free BOM JSON API — no API key required.
 *
 * BOM product IDs by state (IDx60801 = forecast for state capital area).
 * For suburb-level forecasts we use the BOM public weather API.
 */

export interface DayForecast {
  date: string; // YYYY-MM-DD
  rainProbabilityPct: number | null;
  maxWindSpeedKmh: number | null;
  description: string | null;
  minTempC: number | null;
  maxTempC: number | null;
}

export interface WeatherForecast {
  suburb: string;
  state: string;
  days: DayForecast[];
  fetchedAt: string;
}

export interface WeatherRisk {
  suburb: string;
  date: string;
  level: "none" | "low" | "moderate" | "high";
  reason: string;
}

// BOM state forecast product codes
const STATE_PRODUCT_MAP: Record<string, string> = {
  QLD: "IDQ10095",
  NSW: "IDN10064",
  VIC: "IDV10450",
  SA:  "IDS10034",
  WA:  "IDW14199",
  TAS: "IDT16710",
  NT:  "IDD10207",
  ACT: "IDN10064" // ACT shares NSW product
};

/**
 * Fetch a 3-day weather forecast for a given suburb/state from BOM.
 * Falls back gracefully if the API is unreachable.
 */
export async function getWeatherForecast(suburb: string, state: string): Promise<WeatherForecast> {
  const productCode = STATE_PRODUCT_MAP[state.toUpperCase()] ?? "IDQ10095";
  const url = `http://www.bom.gov.au/fwo/${productCode}/${productCode}.json`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "FlowLab/1.0 (field-service-platform)" }
    });

    if (!response.ok) {
      throw new Error(`BOM API returned ${response.status}`);
    }

    const data = (await response.json()) as BomApiResponse;
    const days = parseBomForecast(data, suburb);

    return {
      suburb,
      state: state.toUpperCase(),
      days: days.slice(0, 3),
      fetchedAt: new Date().toISOString()
    };
  } catch {
    // Return empty forecast rather than throwing — weather is non-critical
    return {
      suburb,
      state: state.toUpperCase(),
      days: [],
      fetchedAt: new Date().toISOString()
    };
  }
}

/**
 * Evaluate weather risk for a job scheduled on a specific date.
 * Returns a risk level and human-readable reason.
 */
export function evaluateWeatherRisk(forecast: DayForecast): WeatherRisk["level"] {
  if (!forecast) return "none";

  const rainPct = forecast.rainProbabilityPct ?? 0;
  const wind = forecast.maxWindSpeedKmh ?? 0;

  if (rainPct >= 80 || wind >= 60) return "high";
  if (rainPct >= 60 || wind >= 40) return "moderate";
  if (rainPct >= 40 || wind >= 25) return "low";
  return "none";
}

/**
 * Given a list of jobs (with suburb, state, scheduledDate), return risk assessments.
 * Jobs with high or moderate risk are flagged for operator review.
 */
export async function assessJobWeatherRisks(
  jobs: Array<{ id: string; suburb: string; state?: string; scheduledDate: string }>
): Promise<Array<{ jobId: string; suburb: string; date: string; risk: WeatherRisk["level"]; forecast: DayForecast | null }>> {
  // Group by suburb+state to avoid redundant BOM calls
  const suburbMap = new Map<string, Array<typeof jobs[0]>>();
  for (const job of jobs) {
    const key = `${job.suburb}|${job.state ?? "QLD"}`;
    const group = suburbMap.get(key) ?? [];
    group.push(job);
    suburbMap.set(key, group);
  }

  const results: Array<{ jobId: string; suburb: string; date: string; risk: WeatherRisk["level"]; forecast: DayForecast | null }> = [];

  for (const [key, groupJobs] of suburbMap) {
    const [suburb, state] = key.split("|") as [string, string];
    const weatherData = await getWeatherForecast(suburb, state);

    for (const job of groupJobs) {
      const targetDate = job.scheduledDate.split("T")[0]; // normalise to YYYY-MM-DD
      const dayForecast = weatherData.days.find((d) => d.date === targetDate) ?? null;
      const risk = dayForecast ? evaluateWeatherRisk(dayForecast) : "none";

      results.push({
        jobId: job.id,
        suburb,
        date: targetDate,
        risk,
        forecast: dayForecast
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// BOM JSON response types (simplified)
// ---------------------------------------------------------------------------

interface BomApiResponse {
  observations?: {
    data?: Array<{
      local_date_time_full?: string;
      rain_trace?: string;
    }>;
  };
  forecasts?: Array<{
    forecast_region?: string;
    forecast_type?: string;
    header?: Array<{ product_name?: string }>;
    periods?: Array<{
      start_time_local?: string;
      elements?: Array<{
        type?: string;
        elementValue?: Array<{ value?: string | number; units?: string }>;
      }>;
    }>;
  }>;
  product?: {
    // newer BOM API format
    [key: string]: unknown;
  };
}

function parseBomForecast(data: BomApiResponse, suburb: string): DayForecast[] {
  const days: DayForecast[] = [];

  // BOM JSON API structure varies by product — attempt common paths
  const forecasts = data.forecasts ?? [];

  for (const forecast of forecasts) {
    const periods = forecast.periods ?? [];
    for (const period of periods) {
      const dateStr = period.start_time_local?.split("T")[0];
      if (!dateStr) continue;

      const elements = period.elements ?? [];
      let rainPct: number | null = null;
      let windKmh: number | null = null;
      let description: string | null = null;
      let minTemp: number | null = null;
      let maxTemp: number | null = null;

      for (const el of elements) {
        const val = el.elementValue?.[0]?.value;
        switch (el.type) {
          case "precipitation_probability":
            rainPct = val != null ? Number(val) : null;
            break;
          case "wind_speed_kmh":
          case "wind_speed":
            windKmh = val != null ? Number(val) : null;
            break;
          case "forecast":
          case "precis":
            description = val != null ? String(val) : null;
            break;
          case "air_temperature_minimum":
            minTemp = val != null ? Number(val) : null;
            break;
          case "air_temperature_maximum":
            maxTemp = val != null ? Number(val) : null;
            break;
        }
      }

      days.push({
        date: dateStr,
        rainProbabilityPct: rainPct,
        maxWindSpeedKmh: windKmh,
        description,
        minTempC: minTemp,
        maxTempC: maxTemp
      });
    }
  }

  // Deduplicate by date (keep first occurrence)
  const seen = new Set<string>();
  return days.filter((d) => {
    if (seen.has(d.date)) return false;
    seen.add(d.date);
    return true;
  });
}
