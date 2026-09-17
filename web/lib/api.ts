import type { CatalogItem, Lesson, Pattern, Profile } from "./types";

const API = "/backend";

export async function convertPattern(file: File, stitchWidth: number, maxColors: number, aidaCount: number): Promise<Pattern> {
  const body = new FormData();
  body.append("image", file);
  body.append("stitch_width", String(stitchWidth));
  body.append("max_colors", String(maxColors));
  body.append("aida_count", String(aidaCount));
  const res = await fetch(`${API}/pattern/convert`, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Convert failed");
  }
  return res.json();
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${API}/catalog`);
  if (!res.ok) throw new Error("Catalog unavailable");
  return res.json();
}

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch(`${API}/clay/lessons`);
  if (!res.ok) throw new Error("Lessons unavailable");
  return res.json();
}

export async function fetchProfile(): Promise<Profile> {
  const res = await fetch(`${API}/profile`);
  if (!res.ok) throw new Error("Profile unavailable");
  return res.json();
}

export async function fetchHealth(): Promise<{ ok: boolean; agents: boolean; floss_colors: number }> {
  const res = await fetch(`${API}/health`);
  if (!res.ok) throw new Error("API offline");
  return res.json();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
