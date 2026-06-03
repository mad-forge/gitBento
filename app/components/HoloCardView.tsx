"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { GitFork, Sparkles, Star, TrendingUp, Users } from "lucide-react";
import type { GitBentoData } from "./types";

export function HoloCardView({ data }: { data: GitBentoData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), {
    stiffness: 180,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), {
    stiffness: 180,
    damping: 20,
  });
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);
  const totalContributions = data.contributionCalendar?.totalContributions ?? 0;
  const heatmapDays =
    data.contributionCalendar?.weeks.flatMap((week) => week.contributionDays).slice(-182) ?? [];

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    mouseY.set((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotateY: -12 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.92, rotateY: 12 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex w-full justify-center py-8 [perspective:1200px]"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-[780px] w-full max-w-[560px] cursor-pointer rounded-[36px]"
      >
        <div className="absolute -inset-1 rounded-[38px] bg-gradient-to-br from-cyan-300 via-fuchsia-400 to-lime-300 opacity-55 blur-xl" />
        <div className="absolute inset-0 overflow-hidden rounded-[36px] border border-white/18 bg-[#090b14] shadow-[0_50px_150px_rgba(0,0,0,0.62)]">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:9px_9px]" />
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: isHovered ? 1 : 0.45 }}
            style={{
              background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(94,234,212,0.34), rgba(217,70,239,0.18) 26%, transparent 58%)`,
            }}
          />
          <div className="relative z-10 flex h-full flex-col p-9">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-300 opacity-35 blur-2xl" />
                  <img
                    src={data.profile.avatar}
                    alt={data.profile.username}
                    className="relative size-24 rounded-full border-4 border-white/18"
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-black leading-none text-white">
                    {data.profile.name}
                  </h2>
                  <p className="mt-2 font-semibold text-cyan-200">@{data.profile.username}</p>
                </div>
              </div>
              <span className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-2 text-xs font-black text-fuchsia-100">
                HOLO
              </span>
            </div>

            <p className="mt-8 text-sm leading-7 text-white/62">
              {data.profile.bio ?? "No bio added yet."}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: Star, label: "Stars", value: data.totals.stars },
                { icon: GitFork, label: "Forks", value: data.totals.forks },
                { icon: Users, label: "Followers", value: data.profile.followers },
                { icon: TrendingUp, label: "Contributions", value: totalContributions },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <Icon className="size-5 text-cyan-200" />
                    <div className="mt-3 text-2xl font-black text-white">
                      {stat.value.toLocaleString()}
                    </div>
                    <div className="text-xs font-semibold text-white/42">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/52">
                <Sparkles className="size-4 text-fuchsia-200" />
                Top Languages
              </div>
              <div className="space-y-3">
                {data.topLanguages.slice(0, 5).map((language) => {
                  const max = Math.max(...data.topLanguages.map((item) => item.count), 1);
                  return (
                    <div key={language.name} className="flex items-center gap-3">
                      <span className="w-24 truncate text-sm font-semibold text-white/74">
                        {language.name}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max((language.count / max) * 100, 12)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto">
              <div className="mb-3 text-sm font-bold text-white/52">Activity Heatmap</div>
              <div className="flex flex-wrap gap-1">
                {heatmapDays.map((day) => (
                  <span
                    key={day.date}
                    className="size-2.5 rounded-[3px]"
                    style={{
                      backgroundColor: day.contributionCount
                        ? day.color
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
