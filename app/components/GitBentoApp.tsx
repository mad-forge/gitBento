"use client";

import { FormEvent, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AnimatePresence, motion } from "motion/react";
import {
  Blocks,
  CreditCard,
  Download,
  GitPullRequest,
  Grid3x3,
  LoaderCircle,
  Search,
  Terminal,
} from "lucide-react";
import { BentoGrid } from "./BentoGrid";
import { GitCity } from "./GitCity";
import { HoloCardView } from "./HoloCardView";
import { TerminalView } from "./TerminalView";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { GitBentoData } from "./types";

type ViewMode = "bento" | "city" | "holo-card" | "terminal";

function toCityData(data: GitBentoData) {
  return (
    data.contributionCalendar?.weeks
      .flatMap((week) => week.contributionDays)
      .slice(-365)
      .map((day) => ({ count: day.contributionCount })) ?? []
  );
}

export function GitBentoApp() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState<GitBentoData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("bento");
  const exportRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Enter a GitHub username first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(
        `/api/github?username=${encodeURIComponent(trimmedUsername)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Something went wrong.");
        return;
      }

      setData(payload);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload() {
    if (!exportRef.current) return;

    const dataUrl = await toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#09090b",
    });

    const link = document.createElement("a");
    link.download = `${data?.profile.username ?? "gitbento"}-${viewMode}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(168,85,247,0.2),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(34,211,238,0.18),transparent_24%),linear-gradient(180deg,#09090b_0%,#050507_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-7 px-5 py-7 sm:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 shadow-[0_0_34px_rgba(34,211,238,0.18)]">
              <GitPullRequest className="size-6 text-cyan-200" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-normal text-white">GitBento</h1>
              <p className="text-xs font-semibold text-white/42">
                Ultra-premium GitHub profile analytics
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[460px] lg:flex-row"
          >
            <label className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4">
              <Search className="size-4 shrink-0 text-white/38" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter GitHub username..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
              />
            </label>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : null}
              Generate
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="glass"
                  size="icon"
                  onClick={handleDownload}
                  disabled={!data}
                  aria-label="Download current view as PNG"
                >
                  <Download className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download current view as PNG</TooltipContent>
            </Tooltip>
          </form>
        </motion.header>

        <div className="flex items-center justify-center">
          <div
            role="tablist"
            aria-label="GitBento view"
            className="inline-flex w-fit items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.045] p-1.5 backdrop-blur-xl"
          >
            {[
              { id: "bento", icon: Grid3x3, label: "Bento" },
              { id: "city", icon: Blocks, label: "City" },
              { id: "holo-card", icon: CreditCard, label: "Card" },
              { id: "terminal", icon: Terminal, label: "Terminal" },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white/38 transition hover:text-white/70 aria-selected:bg-gradient-to-r aria-selected:from-cyan-500 aria-selected:to-fuchsia-500 aria-selected:text-white"
                >
                  <Icon className="size-4" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!data && !isLoading ? (
          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/58">
              Generate once, switch between three export-ready visual formats
            </p>
            <h2 className="text-5xl font-black leading-none tracking-normal text-white sm:text-7xl">
              GitHub profile, but with taste.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-white/52">
              Pull live profile, repositories, languages, activity, contribution
              signals, orgs, and stats into premium visual templates.
            </p>
          </section>
        ) : null}

        {error ? (
          <p className="mx-auto rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        {isLoading ? <GridSkeleton /> : null}
        {data ? (
          <div ref={exportRef}>
            <AnimatePresence mode="wait">
              {viewMode === "bento" ? <BentoGrid key="bento" data={data} /> : null}
              {viewMode === "city" ? (
                <motion.div
                  key="city"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                      GitCity
                    </p>
                    <h2 className="mt-2 text-4xl font-black leading-none text-white">
                      {data.contributionCalendar?.totalContributions.toLocaleString() ?? "0"} commits
                      shaped into a neon skyline
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/54">
                      Every building is one day, and height maps directly to contribution count.
                      Rotate, zoom, and inspect your year like a cyberpunk city block.
                    </p>
                  </div>
                  <GitCity data={toCityData(data)} className="h-[720px] w-full rounded-[30px] border border-emerald-400/18" />
                </motion.div>
              ) : null}
              {viewMode === "holo-card" ? (
                <HoloCardView key="holo-card" data={data} />
              ) : null}
              {viewMode === "terminal" ? <TerminalView key="terminal" data={data} /> : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function GridSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 pb-12 md:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-56 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.06] backdrop-blur-xl md:first:col-span-2 md:first:row-span-2"
        >
          <div className="m-5 h-5 w-28 rounded-full bg-white/10" />
          <div className="mx-5 mt-20 h-8 w-3/4 rounded-full bg-white/10" />
          <div className="mx-5 mt-4 h-4 w-1/2 rounded-full bg-white/10" />
        </div>
      ))}
    </section>
  );
}
