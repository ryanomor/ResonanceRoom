import { useState, useCallback, useRef } from 'react';
import { US_CITIES } from '../data/usCities';

export interface CityResult {
  name: string;
  displayName: string;
  lat: string;
  lon: string;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

function searchStaticList(query: string): CityResult[] {
  const q = query.trim().toLowerCase();
  return US_CITIES.filter(
    (c) =>
      c.name.toLowerCase().startsWith(q) ||
      c.displayName.toLowerCase().includes(q) ||
      c.state.toLowerCase() === q
  )
    .slice(0, 6)
    .map((c) => ({
      name: c.name,
      displayName: c.displayName,
      lat: c.lat,
      lon: c.lon,
    }));
}

async function fetchMapbox(query: string): Promise<CityResult[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?types=place&country=us&limit=6&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.features ?? []).map((f: any) => ({
    name: f.text,
    displayName: f.place_name,
    lat: String(f.center[1]),
    lon: String(f.center[0]),
  }));
}

async function fetchNominatim(query: string): Promise<CityResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&addressdetails=1&limit=6&featuretype=city`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'EchoMatch/1.0' },
  });
  const data = await res.json();
  return data
    .filter(
      (item: any) =>
        item.type === 'city' ||
        item.type === 'town' ||
        item.type === 'village' ||
        item.class === 'place'
    )
    .map((item: any) => {
      const addr = item.address || {};
      const city =
        addr.city || addr.town || addr.village || addr.county || item.name;
      const state = addr.state || addr.region || '';
      const country = addr.country || '';
      return {
        name: city,
        displayName: [city, state, country].filter(Boolean).join(', '),
        lat: item.lat,
        lon: item.lon,
      };
    });
}

async function fetchRemote(query: string): Promise<CityResult[]> {
  try {
    if (MAPBOX_TOKEN) return await fetchMapbox(query);
    return await fetchNominatim(query);
  } catch {
    try {
      return await fetchNominatim(query);
    } catch {
      return [];
    }
  }
}

export function useCitySearch() {
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const staticHits = searchStaticList(query);

    if (staticHits.length >= 4) {
      setResults(staticHits);
      return;
    }

    setResults(staticHits);
    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const remote = await fetchRemote(query);
        const seen = new Set(staticHits.map((c) => c.name.toLowerCase()));
        const merged = [
          ...staticHits,
          ...remote.filter((r) => !seen.has(r.name.toLowerCase())),
        ].slice(0, 6);
        setResults(merged);
      } catch {
        setResults(staticHits);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clear };
}
