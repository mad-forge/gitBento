"use client";

import { motion } from "motion/react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export interface RPGStats {
  consistency: number;
  impact: number;
  diversity: number;
  nightOwl: number;
  loneWolf: number;
}

export function RPGRadarChart({
  stats,
  color = "#8b5cf6",
}: {
  stats: RPGStats;
  color?: string;
}) {
  const data = [
    { skill: "Consistency", value: stats.consistency, fullMark: 100 },
    { skill: "Impact", value: stats.impact, fullMark: 100 },
    { skill: "Diversity", value: stats.diversity, fullMark: 100 },
    { skill: "Night Owl", value: stats.nightOwl, fullMark: 100 },
    { skill: "Lone Wolf", value: stats.loneWolf, fullMark: 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="relative h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.78} />
              <stop offset="100%" stopColor={color} stopOpacity={0.2} />
            </linearGradient>
            <filter id="radarGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <PolarGrid stroke="#ffffff20" strokeWidth={1} />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "#ffffff", fontSize: 11, fontWeight: 700 }}
            stroke="#ffffff30"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#ffffff55", fontSize: 10 }}
            stroke="#ffffff18"
          />
          <Radar
            name="Stats"
            dataKey="value"
            stroke={color}
            fill="url(#radarGradient)"
            fillOpacity={0.7}
            strokeWidth={3}
            filter="url(#radarGlow)"
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${color}40, transparent)` }}
        />
      </div>
    </motion.div>
  );
}
