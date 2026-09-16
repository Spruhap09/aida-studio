"use client";

import { useState } from "react";

export function LessonVideo({
  youtubeId,
  title,
  credit,
  heading,
}: {
  youtubeId: string;
  title: string;
  credit?: string;
  heading?: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={heading === null ? "" : "mt-4"}>
      {heading !== null && (
        <p className="text-sm font-medium text-ink">{heading ?? "Watch someone do this"}</p>
      )}
      <div className="relative mt-2 overflow-hidden rounded-xl bg-ink/10">
        {playing ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
          />
        ) : (
          <button
            className="group relative block w-full text-left"
            onClick={() => setPlaying(true)}
            type="button"
          >
            <img
              alt=""
              className="aspect-video w-full object-cover"
              src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            />
            <span className="absolute inset-0 bg-ink/25 transition group-hover:bg-ink/15" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-ink shadow-card">
                <span className="ml-0.5 text-lg" aria-hidden>
                  ▶
                </span>
              </span>
            </span>
            <span className="sr-only">Play video: {title}</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-ink/70">{title}</p>
      {credit && (
        <p className="text-xs text-ink/50">
          Video by {credit}.{" "}
          <a
            className="underline underline-offset-2"
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open on YouTube
          </a>
        </p>
      )}
    </div>
  );
}
