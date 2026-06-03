"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GitBentoData } from "./types";

export function TerminalView({ data }: { data: GitBentoData }) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const totalContributions = data.contributionCalendar?.totalContributions ?? 0;

  const terminalLines = useMemo(
    () => [
      "> initializing GitBento scanner...",
      "> connecting to github public api...",
      "> pulling profile, repos, events, languages, orgs...",
      "",
      "+------------------------------------------------------------+",
      "| USER PROFILE                                               |",
      "+------------------------------------------------------------+",
      `| Username:      ${data.profile.username.padEnd(43)} |`,
      `| Name:          ${data.profile.name.slice(0, 43).padEnd(43)} |`,
      `| Location:      ${(data.profile.location ?? "Unknown").slice(0, 43).padEnd(43)} |`,
      "+------------------------------------------------------------+",
      "",
      "+------------------------------------------------------------+",
      "| STATISTICS                                                 |",
      "+------------------------------------------------------------+",
      `| Stars:         ${String(data.totals.stars).padStart(8)}                         |`,
      `| Forks:         ${String(data.totals.forks).padStart(8)}                         |`,
      `| Repositories:  ${String(data.totals.publicRepos).padStart(8)}                         |`,
      `| Followers:     ${String(data.profile.followers).padStart(8)}                         |`,
      `| Contributions:${String(totalContributions).padStart(9)} in the last year          |`,
      "+------------------------------------------------------------+",
      "",
      "+------------------------------------------------------------+",
      "| TOP LANGUAGES                                              |",
      "+------------------------------------------------------------+",
      ...data.topLanguages.map((language) => {
        const max = Math.max(...data.topLanguages.map((item) => item.count), 1);
        const filled = Math.max(Math.round((language.count / max) * 28), 2);
        return `| ${language.name.padEnd(14)} ${"█".repeat(filled)}${"░".repeat(
          28 - filled,
        )} ${String(language.count).padStart(3)} repos |`;
      }),
      "+------------------------------------------------------------+",
      "",
      "[ok] scan complete",
      "[ok] visualization ready",
      "> _",
    ],
    [data, totalContributions],
  );

  useEffect(() => {
    setDisplayedLines([]);
    setCurrentLineIndex(0);
  }, [terminalLines]);

  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) return;

    const timer = window.setTimeout(() => {
      setDisplayedLines((prev) => [...prev, terminalLines[currentLineIndex]]);
      setCurrentLineIndex((prev) => prev + 1);
    }, 42);

    return () => window.clearTimeout(timer);
  }, [currentLineIndex, terminalLines]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl py-8"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-300/25 bg-black shadow-[0_0_42px_rgba(57,211,83,0.24)]">
        <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(57,211,83,0.25)_1px,transparent_1px)] [background-size:100%_4px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(57,211,83,0.18),transparent_30%)]" />
        <div className="relative border-b border-emerald-300/16 p-5">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-full bg-emerald-300/70" />
            <span className="size-3 rounded-full bg-emerald-600/50" />
            <span className="size-3 rounded-full bg-emerald-900/70" />
            <span className="ml-auto font-mono text-xs tracking-[0.22em] text-emerald-200/70">
              GITBENTO_TERMINAL
            </span>
          </div>
        </div>
        <div className="min-h-[620px] p-7 font-mono text-[13px] leading-6 text-emerald-300 sm:text-[15px]">
          <AnimatePresence mode="popLayout">
            {displayedLines.map((line, index) => (
              <motion.div
                key={`${line}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-pre"
                style={{
                  textShadow: "0 0 12px rgba(57, 211, 83, 0.7)",
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
