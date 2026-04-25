import { haversineKm, forwardGeocode } from "../utils/geo.js";

export const DISRUPTION_CATEGORIES = {
  accident: "accident",
  congestion: "congestion",
  construction: "construction",
  hazard: "hazard",
  weather: "weather",
  natural_disaster: "natural_disaster",
  road_closure: "road_closure",
  vehicle_breakdown: "vehicle_breakdown",
  police_activity: "police_activity",
  special_event: "special_event",
  other: "other",
};

const INCIDENT_TYPE_KEYWORDS = [
  { category: DISRUPTION_CATEGORIES.accident, terms: ["accident", "crash", "collision", "wreck"] },
  { category: DISRUPTION_CATEGORIES.congestion, terms: ["congestion", "traffic", "slow", "jam"] },
  { category: DISRUPTION_CATEGORIES.construction, terms: ["construction", "roadwork", "maintenance", "repair"] },
  { category: DISRUPTION_CATEGORIES.hazard, terms: ["hazard", "debris", "obstruction", "spill", "ice"] },
  { category: DISRUPTION_CATEGORIES.weather, terms: ["weather", "storm", "fog", "snow", "rain", "hail"] },
  { category: DISRUPTION_CATEGORIES.natural_disaster, terms: ["flood", "landslide", "earthquake", "wildfire"] },
  { category: DISRUPTION_CATEGORIES.road_closure, terms: ["closure", "blocked", "closed", "shutdown"] },
  { category: DISRUPTION_CATEGORIES.vehicle_breakdown, terms: ["breakdown", "disabled vehicle", "stall"] },
  { category: DISRUPTION_CATEGORIES.police_activity, terms: ["police", "incident", "checkpoint", "investigation"] },
  { category: DISRUPTION_CATEGORIES.special_event, terms: ["event", "parade", "festival", "marathon", "procession"] },
];

function normalizeType(rawType, rawDescription = "") {
  const normalized = String(rawType || rawDescription || "").toLowerCase();

  for (const item of INCIDENT_TYPE_KEYWORDS) {
    for (const term of item.terms) {
      if (normalized.includes(term)) {
        return item.category;
      }
    }
  }

  return DISRUPTION_CATEGORIES.other;
}

function buildBoundingBox(routeGeometry, paddingKm = 50) {
  const lats = routeGeometry.coordinates.map(([lon, lat]) => lat);
  const lons = routeGeometry.coordinates.map(([lon, lat]) => lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latPadding = paddingKm / 110.574;
  const lonPadding = paddingKm / (111.320 * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)));

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding,
  };
}

function pointToSegmentDistanceKm(point, start, end) {
  const lat1 = start.lat;
  const lon1 = start.lon;
  const lat2 = end.lat;
  const lon2 = end.lon;
  const lat3 = point.lat;
  const lon3 = point.lon;

  const A = haversineKm(start, point);
  const B = haversineKm(point, end);
  const C = haversineKm(start, end);

  if (C === 0) {
    return A;
  }

  const dot = ((lat3 - lat1) * (lat2 - lat1) + (lon3 - lon1) * (lon2 - lon1)) /
    ((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);

  if (dot <= 0) {
    return A;
  }
  if (dot >= 1) {
    return B;
  }

  const projLat = lat1 + dot * (lat2 - lat1);
  const projLon = lon1 + dot * (lon2 - lon1);
  return haversineKm(point, { lat: projLat, lon: projLon });
}

function buildRouteBoundingBox(routeGeometry) {
  const lats = routeGeometry.coordinates.map(([_lon, lat]) => lat);
  const lons = routeGeometry.coordinates.map(([lon, _lat]) => lon);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

function pointInBoundingBox(point, bbox, marginDeg = 0.5) {
  return (
    point.lat >= bbox.minLat - marginDeg &&
    point.lat <= bbox.maxLat + marginDeg &&
    point.lon >= bbox.minLon - marginDeg &&
    point.lon <= bbox.maxLon + marginDeg
  );
}

function incidentIsNearRoute(incident, routeGeometry, thresholdKm = 50, routeBbox = null) {
  if (!incident.location) {
    return false;
  }

  const point = { lat: incident.location.lat, lon: incident.location.lon };
  const bbox = routeBbox || buildRouteBoundingBox(routeGeometry);
  if (!pointInBoundingBox(point, bbox, 0.5)) {
    return false;
  }

  for (let index = 0; index < routeGeometry.coordinates.length - 1; index += 1) {
    const [lon1, lat1] = routeGeometry.coordinates[index];
    const [lon2, lat2] = routeGeometry.coordinates[index + 1];
    const segmentDistance = pointToSegmentDistanceKm(point, { lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });

    if (segmentDistance <= thresholdKm) {
      return true;
    }
  }

  return false;
}

function normalizeIncident(rawIncident, provider = "unknown") {
  const rawLat = rawIncident.latitude ?? rawIncident.location?.lat ?? null;
  const rawLon = rawIncident.longitude ?? rawIncident.location?.lon ?? null;

  const lat = Number(rawLat);
  const lon = Number(rawLon);

  const hasValidLocation =
    rawLat !== null && rawLon !== null &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  const location = hasValidLocation ? { lat, lon } : null;

  const rawType = rawIncident.type || rawIncident.description || rawIncident.event_type || "";
  const category = normalizeType(rawType, rawIncident.description);
  const severity = String(rawIncident.severity || rawIncident.impact || rawIncident.priority || "unknown").toLowerCase();

  const id = rawIncident.id || rawIncident.incident_id ||
    `${provider}-${hashString(rawIncident.description || rawType || "unknown")}`;

  return {
    id,
    provider,
    category,
    type: rawType || "unknown",
    description: rawIncident.description || rawIncident.summary || rawIncident.event || "Live incident reported near route",
    severity,
    location,
    reported_at: rawIncident.reported_at || rawIncident.timestamp || null,
    raw: rawIncident,
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function fetchOpen511Incidents(bbox) {
  const baseUrl = process.env.OPEN511_BASE_URL;
  if (!baseUrl) {
    return [];
  }

  const bboxParam = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].join(",");
  const url = `${baseUrl.replace(/\/$/, "")}/events?bbox=${encodeURIComponent(bboxParam)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Open511 request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const events = payload.events || payload.features || [];

  return events.map((event) => ({
    id: event.id || event.properties?.id,
    provider: "open511",
    severity: event.properties?.severity || event.properties?.status || "unknown",
    description: event.properties?.description || event.properties?.title || event.description,
    type: event.properties?.type || event.properties?.event_type || event.properties?.subtype || event.type,
    latitude: event.geometry?.coordinates?.[1],
    longitude: event.geometry?.coordinates?.[0],
    reported_at: event.properties?.updated_at || event.properties?.created_at,
  }));
}

async function fetchTomTomIncidents(bbox) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const bboxParam = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].join(",");
  const url = `https://api.tomtom.com/traffic/services/4/incidentDetails?key=${encodeURIComponent(apiKey)}&bbox=${encodeURIComponent(bboxParam)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`TomTom traffic request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const incidents = payload.incidents || [];
  return incidents.map((incident) => ({
    id: incident.id,
    provider: "tomtom",
    severity: incident.impact || incident.severity || "unknown",
    description: incident.description || incident.eventDescription || incident.eventCode,
    type: incident.eventType || incident.roadClosureType || incident.incidentType,
    latitude: incident.latitude,
    longitude: incident.longitude,
    reported_at: incident.startTime || incident.creationTime,
  }));
}

async function extractLocationFromNewsArticle(article) {
  const titleResult = await forwardGeocode(article.title);
  if (titleResult) {
    return { lat: titleResult.lat, lon: titleResult.lon };
  }

  if (article.description) {
    const descResult = await forwardGeocode(article.description.slice(0, 80));
    if (descResult) {
      return { lat: descResult.lat, lon: descResult.lon };
    }
  }

  return null;
}

function isRelevantNewsArticle(title, description) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const relevantTerms = [
    "traffic", "accident", "crash", "collision", "road", "highway", "interstate",
    "closure", "closed", "blocked", "construction", "repair", "maintenance",
    "storm", "flood", "weather", "rain", "snow", "ice", "fog", "wind",
    "fire", "wildfire", "earthquake", "landslide", "hurricane", "tornado",
    "delay", "congestion", "jam", "backup", "standstill",
    "bridge", "tunnel", "detour", "diversion", "lane", "pileup",
  ];
  return relevantTerms.some((term) => text.includes(term));
}

async function fetchNewsIncidents(route) {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return [];
  }

  const lats = route.geometry.coordinates.map(([lon, lat]) => lat);
  const lons = route.geometry.coordinates.map(([lon, lat]) => lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

  const disruptionQueries = [
    "traffic accident",
    "road closure",
    "highway construction",
    "bridge repair",
    "flood",
    "earthquake",
    "wildfire",
    "storm",
    "traffic jam",
  ];

  const allArticles = [];

  for (const query of disruptionQueries) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${apiKey}&pageSize=5&language=en`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.warn(`NewsAPI request failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.articles) {
        allArticles.push(...data.articles);
      }
    } catch (error) {
      console.warn("NewsAPI fetch error:", error.message);
    }
  }

  const seenUrls = new Set();
  const uniqueArticles = allArticles.filter((article) => {
    if (!article.url || seenUrls.has(article.url)) {
      return false;
    }
    seenUrls.add(article.url);
    return true;
  });

  const relevantArticles = uniqueArticles.filter((article) =>
    isRelevantNewsArticle(article.title, article.description)
  );

  let locatedCount = 0;
  let unlocatedCount = 0;
  const incidents = [];
  for (const article of relevantArticles) {
    const extractedLocation = await extractLocationFromNewsArticle(article);

    if (extractedLocation) {
      locatedCount++;
      const stableId = `news-${hashString(article.url || article.title)}`;
      incidents.push({
        id: stableId,
        type: article.title,
        description: article.description || article.title,
        latitude: extractedLocation.lat,
        longitude: extractedLocation.lon,
        reported_at: article.publishedAt,
        severity: "medium",
        provider: "news",
      });
    } else {
      unlocatedCount++;
    }
  }

  console.log(`NewsAPI: ${allArticles.length} raw, ${relevantArticles.length} relevant, ${locatedCount} geocoded, ${unlocatedCount} skipped`);
  return incidents;
}

export async function fetchLiveIncidentsForRoute(route) {
  if (!route?.geometry?.coordinates || route.geometry.coordinates.length === 0) {
    return [];
  }

  const bbox = buildBoundingBox(route.geometry, 50);
  const providers = [];
  const activeSources = [];

  if (process.env.OPEN511_BASE_URL) {
    providers.push(fetchOpen511Incidents(bbox));
    activeSources.push("open511");
  }
  if (process.env.TOMTOM_API_KEY) {
    providers.push(fetchTomTomIncidents(bbox));
    activeSources.push("tomtom");
  }
  if (process.env.NEWSAPI_KEY) {
    providers.push(fetchNewsIncidents(route));
    activeSources.push("newsapi");
  }

  if (providers.length === 0) {
    console.log("No disruption sources configured");
    return [];
  }

  console.log(`Fetching disruptions from: ${activeSources.join(", ")}`);

  const rawResults = await Promise.allSettled(providers);

  let totalRaw = 0;
  const incidents = rawResults.flatMap((result, idx) => {
    if (result.status === "fulfilled") {
      totalRaw += result.value.length;
      return result.value;
    }
    console.warn(`${activeSources[idx]} failed:`, result.reason?.message);
    return [];
  });

  const normalized = incidents.map((incident) =>
    normalizeIncident(incident, incident.provider || "news")
  );

  const withLocation = normalized.filter((incident) =>
    incident.location &&
    Number.isFinite(incident.location.lat) &&
    Number.isFinite(incident.location.lon)
  );
  const missingLocation = normalized.length - withLocation.length;

  const routeBbox = buildRouteBoundingBox(route.geometry);

  const nearRoute = withLocation.filter((incident) =>
    incidentIsNearRoute(incident, route.geometry, 50, routeBbox)
  );
  const filteredOut = withLocation.length - nearRoute.length;

  console.log(`Pipeline: ${totalRaw} raw -> ${normalized.length} normalized -> ${withLocation.length} located -> ${nearRoute.length} near route`);

  return nearRoute.sort((a, b) => a.category.localeCompare(b.category));
}

export const ROUTE_DISRUPTION_TYPES = Object.values(DISRUPTION_CATEGORIES);
