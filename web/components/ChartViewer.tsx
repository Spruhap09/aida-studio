"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Pattern } from "@/lib/types";

export function ChartViewer({ pattern }: { pattern: Pattern }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(12);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = pattern.width * zoom;
    const cssH = pattern.height * zoom;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < pattern.height; y += 1) {
      for (let x = 0; x < pattern.width; x += 1) {
        const idx = pattern.grid[y][x];
        ctx.fillStyle = pattern.palette[idx]?.hex ?? "#ffffff";
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    ctx.strokeStyle = "rgba(42,33,24,0.18)";
    for (let x = 0; x <= pattern.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * zoom + 0.5, 0);
      ctx.lineTo(x * zoom + 0.5, cssH);
      ctx.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom + 0.5);
      ctx.lineTo(cssW, y * zoom + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(42,33,24,0.45)";
    for (let x = 0; x <= pattern.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x * zoom + 0.5, 0);
      ctx.lineTo(x * zoom + 0.5, cssH);
      ctx.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom + 0.5);
      ctx.lineTo(cssW, y * zoom + 0.5);
      ctx.stroke();
    }
  }, [pattern, zoom]);

  function onMove(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const cell = rect.width / pattern.width;
    const x = Math.floor((event.clientX - rect.left) / cell);
    const y = Math.floor((event.clientY - rect.top) / cell);
    if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return;
    const floss = pattern.palette[pattern.grid[y][x]];
    if (floss) setHover(`${x + 1}, ${y + 1} · DMC ${floss.code} ${floss.name} (${floss.symbol})`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-ink/70">{hover ?? "Hover a square for DMC info"}</p>
        <label className="flex items-center gap-2">
          Zoom
          <input
            type="range"
            min={6}
            max={28}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="overflow-auto rounded-2xl border border-ink/10 bg-white p-3 shadow-card">
        <canvas
          ref={canvasRef}
          className="max-w-none cursor-crosshair"
          style={{ imageRendering: "pixelated" }}
          onMouseMove={onMove}
        />
      </div>
      <p className="text-xs text-ink/50">
        Charts are one color per stitch. Raise stitch width (100–140) for more detail; zoom in to see crisp squares.
      </p>
    </div>
  );
}
