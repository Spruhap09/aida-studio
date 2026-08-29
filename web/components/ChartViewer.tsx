"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Pattern } from "@/lib/types";

export function ChartViewer({ pattern }: { pattern: Pattern }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(8);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = zoom;
    canvas.width = pattern.width * cell;
    canvas.height = pattern.height * cell;
    for (let y = 0; y < pattern.height; y += 1) {
      for (let x = 0; x < pattern.width; x += 1) {
        const idx = pattern.grid[y][x];
        ctx.fillStyle = pattern.palette[idx]?.hex ?? "#ffffff";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    ctx.strokeStyle = "rgba(42,33,24,0.18)";
    for (let x = 0; x <= pattern.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, pattern.height * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(pattern.width * cell, y * cell + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(42,33,24,0.45)";
    for (let x = 0; x <= pattern.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, pattern.height * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(pattern.width * cell, y * cell + 0.5);
      ctx.stroke();
    }
  }, [pattern, zoom]);

  function onMove(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoom);
    const y = Math.floor((event.clientY - rect.top) / zoom);
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
            min={4}
            max={16}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="overflow-auto rounded-2xl border border-ink/10 bg-white p-3 shadow-card">
        <canvas ref={canvasRef} className="max-w-none cursor-crosshair" onMouseMove={onMove} />
      </div>
    </div>
  );
}
