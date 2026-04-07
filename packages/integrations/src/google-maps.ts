/**
 * Google Maps integration — Distance Matrix for route optimisation
 * and Static Maps API for satellite imagery URLs.
 *
 * Uses per-tenant API key if configured, otherwise the platform-level
 * GOOGLE_MAPS_API_KEY environment variable.
 */

export interface JobLocation {
  id: string;
  address: string;
  suburb: string;
  estimatedDurationMins?: number;
}

export interface RouteStop {
  jobId: string;
  address: string;
  suburb: string;
  order: number;
  travelTimeFromPreviousMins: number;
  estimatedArrival?: string; // HH:MM
}

export interface OptimisedRoute {
  stops: RouteStop[];
  totalTravelTimeMins: number;
  totalJobTimeMins: number;
  startAddress?: string;
}

/**
 * Get the Google Maps API key to use.
 * Prefers the per-tenant key; falls back to the platform-level key.
 */
export function resolveGoogleMapsApiKey(tenantCredentials?: Record<string, string> | null): string {
  return tenantCredentials?.apiKey || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Build a Google Maps Static API satellite image URL for a given address.
 * Returns null if no API key is available.
 */
export function getSatelliteImageUrl(
  address: string,
  options: { apiKey?: string; zoom?: number; size?: string } = {}
): string | null {
  const apiKey = options.apiKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const zoom = options.zoom ?? 20;
  const size = options.size ?? "600x400";
  const encoded = encodeURIComponent(address);

  return `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=${zoom}&size=${size}&maptype=satellite&key=${apiKey}`;
}

/**
 * Use the Distance Matrix API to compute travel times between job locations
 * and return an optimised ordering (nearest-neighbour heuristic).
 *
 * Returns the stops in the recommended visit order with travel time estimates.
 */
export async function optimiseJobRoute(
  jobs: JobLocation[],
  options: {
    apiKey?: string;
    startAddress?: string;
    workdayStartTime?: string; // HH:MM, default "08:00"
  } = {}
): Promise<OptimisedRoute> {
  if (jobs.length === 0) {
    return { stops: [], totalTravelTimeMins: 0, totalJobTimeMins: 0 };
  }

  if (jobs.length === 1) {
    return {
      stops: [
        {
          jobId: jobs[0].id,
          address: jobs[0].address,
          suburb: jobs[0].suburb,
          order: 1,
          travelTimeFromPreviousMins: 0
        }
      ],
      totalTravelTimeMins: 0,
      totalJobTimeMins: jobs[0].estimatedDurationMins ?? 60
    };
  }

  const apiKey = options.apiKey || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // No API key — return jobs in original order with estimated travel
    return buildFallbackRoute(jobs, options.startAddress, options.workdayStartTime);
  }

  try {
    const allAddresses = [...jobs.map((j) => j.address)];
    if (options.startAddress) allAddresses.unshift(options.startAddress);

    // Build distance matrix (origins × destinations)
    const origins = encodeURIComponent(allAddresses.join("|"));
    const destinations = encodeURIComponent(allAddresses.join("|"));
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Distance Matrix API returned ${response.status}`);

    const data = (await response.json()) as DistanceMatrixResponse;
    if (data.status !== "OK") throw new Error(`Distance Matrix API: ${data.status}`);

    // Extract duration matrix in minutes
    const n = allAddresses.length;
    const durationMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      durationMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        const element = data.rows[i]?.elements[j];
        durationMatrix[i][j] =
          element?.status === "OK" ? Math.round((element.duration?.value ?? 0) / 60) : 30;
      }
    }

    const route = nearestNeighbourRoute(jobs, durationMatrix, options.startAddress ? 1 : 0);
    return buildRouteWithArrivals(route, options.workdayStartTime ?? "08:00");
  } catch {
    // Fall back gracefully
    return buildFallbackRoute(jobs, options.startAddress, options.workdayStartTime);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nearestNeighbourRoute(
  jobs: JobLocation[],
  durationMatrix: number[][],
  startIndex: number
): Array<{ job: JobLocation; travelTimeMins: number }> {
  const unvisited = new Set(jobs.map((_, i) => i));
  const route: Array<{ job: JobLocation; travelTimeMins: number }> = [];
  let current = startIndex;

  while (unvisited.size > 0) {
    let bestNext = -1;
    let bestTime = Infinity;

    for (const idx of unvisited) {
      const matrixIdx = idx + (startIndex > 0 ? 1 : 0);
      const time = durationMatrix[current]?.[matrixIdx] ?? 30;
      if (time < bestTime) {
        bestTime = time;
        bestNext = idx;
      }
    }

    if (bestNext === -1) break;
    unvisited.delete(bestNext);
    route.push({ job: jobs[bestNext], travelTimeMins: bestTime });
    current = bestNext + (startIndex > 0 ? 1 : 0);
  }

  return route;
}

function buildRouteWithArrivals(
  route: Array<{ job: JobLocation; travelTimeMins: number }>,
  workdayStartTime: string
): OptimisedRoute {
  const [startHour, startMin] = workdayStartTime.split(":").map(Number) as [number, number];
  let currentMins = startHour * 60 + startMin;
  let totalTravel = 0;
  let totalJob = 0;

  const stops: RouteStop[] = route.map((entry, i) => {
    const arrival = minutesToHHMM(currentMins + entry.travelTimeMins);
    currentMins += entry.travelTimeMins + (entry.job.estimatedDurationMins ?? 60);
    totalTravel += entry.travelTimeMins;
    totalJob += entry.job.estimatedDurationMins ?? 60;

    return {
      jobId: entry.job.id,
      address: entry.job.address,
      suburb: entry.job.suburb,
      order: i + 1,
      travelTimeFromPreviousMins: entry.travelTimeMins,
      estimatedArrival: arrival
    };
  });

  return { stops, totalTravelTimeMins: totalTravel, totalJobTimeMins: totalJob };
}

function buildFallbackRoute(
  jobs: JobLocation[],
  startAddress?: string,
  workdayStartTime?: string
): OptimisedRoute {
  const defaultTravel = 15; // assume 15 min between jobs
  let currentMins = 8 * 60;
  if (workdayStartTime) {
    const [h, m] = workdayStartTime.split(":").map(Number) as [number, number];
    currentMins = h * 60 + m;
  }

  const stops: RouteStop[] = jobs.map((job, i) => {
    const arrival = minutesToHHMM(currentMins + defaultTravel);
    currentMins += defaultTravel + (job.estimatedDurationMins ?? 60);
    return {
      jobId: job.id,
      address: job.address,
      suburb: job.suburb,
      order: i + 1,
      travelTimeFromPreviousMins: i === 0 ? 0 : defaultTravel,
      estimatedArrival: arrival
    };
  });

  return {
    stops,
    totalTravelTimeMins: defaultTravel * Math.max(0, jobs.length - 1),
    totalJobTimeMins: jobs.reduce((sum, j) => sum + (j.estimatedDurationMins ?? 60), 0),
    startAddress
  };
}

function minutesToHHMM(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Distance Matrix API response types
// ---------------------------------------------------------------------------

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number; text: string };
  distance?: { value: number; text: string };
}

interface DistanceMatrixResponse {
  status: string;
  rows: Array<{ elements: DistanceMatrixElement[] }>;
}
