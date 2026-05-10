"use client";

import { useState } from "react";

type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export default function ServiceAreaMapEditor({
  initialAddress,
  initialPlaceId,
  initialLat,
  initialLng,
  initialRadiusKm,
  initialSuburbs
}: {
  initialAddress: string;
  initialPlaceId: string;
  initialLat: number | null;
  initialLng: number | null;
  initialRadiusKm: number | null;
  initialSuburbs: string[];
}) {
  const [address, setAddress] = useState(initialAddress || initialSuburbs[0] || "");
  const [placeId, setPlaceId] = useState(initialPlaceId);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm ?? 25);
  const [suburbs, setSuburbs] = useState(initialSuburbs.join(", "));
  const [previewUrl, setPreviewUrl] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [error, setError] = useState("");

  async function search(value: string) {
    setAddress(value);
    setPlaceId("");
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/tenant/maps/autocomplete?q=${encodeURIComponent(value)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { suggestions?: PlaceSuggestion[] };
    setSuggestions(data.suggestions ?? []);
  }

  async function confirm(nextPlaceId?: string) {
    const res = await fetch("/api/tenant/maps/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: nextPlaceId || placeId || undefined,
        address: nextPlaceId ? undefined : address,
        radiusKm,
        manualSuburbs: suburbs.split(",").map((item) => item.trim()).filter(Boolean)
      })
    });
    if (!res.ok) {
      setError("Could not confirm that service area. Manual suburbs will still be saved.");
      return;
    }
    const data = (await res.json()) as {
      place: { placeId: string; formattedAddress: string; lat: number; lng: number };
      suggestedSuburbs: string[];
      previewUrl: string | null;
    };
    setAddress(data.place.formattedAddress);
    setPlaceId(data.place.placeId);
    setLat(data.place.lat);
    setLng(data.place.lng);
    setSuburbs(data.suggestedSuburbs.join(", "));
    setPreviewUrl(data.previewUrl ?? "");
    setSuggestions([]);
    setError("");
  }

  return (
    <div className="space-y-4 is-full">
      <input type="hidden" name="serviceBaseAddress" value={address} />
      <input type="hidden" name="serviceBasePlaceId" value={placeId} />
      <input type="hidden" name="serviceBaseLat" value={lat ?? ""} />
      <input type="hidden" name="serviceBaseLng" value={lng ?? ""} />
      <input type="hidden" name="serviceRadiusKm" value={radiusKm} />
      <label className="space-y-1 text-sm">
        <span>Service base or suburb</span>
        <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={address} onChange={(event) => void search(event.target.value)} placeholder="Start typing a suburb or business base" />
      </label>
      {suggestions.length > 0 ? (
        <div className="rounded-lg border bg-card/60 p-2" style={{ display: "grid", gap: 6 }}>
          {suggestions.map((item) => (
            <button key={item.placeId} type="button" className="rounded-lg border bg-secondary/40 px-3 py-2 text-left text-sm" onClick={() => void confirm(item.placeId)}>
              <strong>{item.mainText}</strong>
              <span className="text-muted-foreground"> {item.secondaryText}</span>
            </button>
          ))}
        </div>
      ) : null}
      <label className="space-y-1 text-sm">
        <span>Service radius ({radiusKm} km)</span>
        <input className="w-full" type="range" min="5" max="80" step="5" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Service suburbs</span>
        <input id="serviceAreaSuburbs" name="serviceAreaSuburbs" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={suburbs} onChange={(event) => setSuburbs(event.target.value)} placeholder="e.g. 15 km around Carlton, Fitzroy, Brunswick" />
      </label>
      <button type="button" className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" onClick={() => void confirm()}>
        Confirm on map
      </button>
      {error ? <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p> : null}
      {previewUrl ? (
        <div
          aria-label="Service area map preview"
          className="rounded-lg border"
          role="img"
          style={{ width: "100%", height: 220, backgroundImage: `url(${previewUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      ) : null}
    </div>
  );
}
