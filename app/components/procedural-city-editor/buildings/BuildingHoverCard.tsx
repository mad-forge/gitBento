"use client";

import { Html } from "@react-three/drei";

import type { Cell } from "../types";

export function BuildingHoverCard({ cell }: { cell: Cell }) {
  return (
    <Html position={[0, cell.height / 2 + 1.1, 0]} center distanceFactor={10} occlude>
      <div className="w-56 rounded-2xl border border-white/12 bg-[rgba(7,10,16,0.94)] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">Repo Tower</div>
        <div className="mt-1 text-sm font-black text-white">{cell.repo.name}</div>
        <div className="mt-1 text-xs text-white/68">{cell.date}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Activity</div>
            <div className="mt-1 font-bold text-white">{cell.contributionCount}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Language</div>
            <div className="mt-1 font-bold text-white">{cell.repo.language ?? "Mixed"}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Stars</div>
            <div className="mt-1 font-bold text-white">{cell.stars}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Forks</div>
            <div className="mt-1 font-bold text-white">{cell.forks}</div>
          </div>
        </div>
        {cell.repo.description ? (
          <div className="mt-2 line-clamp-3 text-[11px] leading-4 text-white/58">
            {cell.repo.description}
          </div>
        ) : null}
      </div>
    </Html>
  );
}
