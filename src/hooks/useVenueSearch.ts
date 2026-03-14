import { useState, useCallback, useRef } from 'react';

export interface VenueResult {
  displayName: string;
  shortName: string;
  lat: string;
  lon: string;
}

export function useVenueSearch() {
  const [results, setResults] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string, cityBias?: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const q = cityBias ? `${query}, ${cityBias}` : query;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'EchoMatch/1.0' },
        });
        const data = await res.json();
        const venues: VenueResult[] = data.map((item: any) => {
          const addr = item.address || {};
          const name =
            item.name ||
            addr.amenity ||
            addr.building ||
            addr.road ||
            item.display_name.split(',')[0];
          const road = addr.road || '';
          const city = addr.city || addr.town || addr.village || '';
          const parts = [road, city].filter(Boolean);
          return {
            displayName: item.display_name,
            shortName: parts.length > 0 ? `${name} — ${parts.join(', ')}` : name,
            lat: item.lat,
            lon: item.lon,
          };
        });
        setResults(venues);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clear };
}
