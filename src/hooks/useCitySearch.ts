import { useState, useCallback, useRef } from 'react';

export interface CityResult {
  name: string;
  displayName: string;
  lat: string;
  lon: string;
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

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'EchoMatch/1.0' },
        });
        const data = await res.json();
        const cities: CityResult[] = data
          .filter((item: any) =>
            item.type === 'city' ||
            item.type === 'town' ||
            item.type === 'village' ||
            item.class === 'place'
          )
          .map((item: any) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || item.name;
            const state = addr.state || addr.region || '';
            const country = addr.country || '';
            const parts = [city, state, country].filter(Boolean);
            return {
              name: city,
              displayName: parts.join(', '),
              lat: item.lat,
              lon: item.lon,
            };
          });
        setResults(cities);
      } catch {
        setResults([]);
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
