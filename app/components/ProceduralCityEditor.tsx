"use client";
import { toPng } from "html-to-image";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
  Aperture,
  Building2,
  Camera,
  Download,
  Factory,
  LoaderCircle,
  Landmark,
  Mountain,
  Orbit,
  Palette,
  Play,
  Search,
  SlidersHorizontal,
  Trees,
  Waves,
} from "lucide-react";
import * as THREE from "three";
import type { GitBentoData } from "./types";

type StreetPattern = "grid" | "organic" | "radial";
type CityStyle = "modern-glass" | "european" | "tokyo-dense" | "cyberpunk" | "brutalist";
type TerrainStyle = "coastline" | "mountains" | "plains";
type ViewPreset = "orbit" | "overhead" | "cinematic";
type PresetName = "neon-megacity" | "balanced-core" | "industrial-belt" | "residential-area" | "river-port";
type ZoneType = "commercial" | "residential" | "industrial";

type EditorState = {
  citySize: number;
  cityDensity: number;
  blockSize: number;
  streetPattern: StreetPattern;
  commercial: number;
  residential: number;
  industrial: number;
  averageHeight: number;
  heightVariance: number;
  cityStyle: CityStyle;
  riverProbability: number;
  parksPercent: number;
  terrainRoughness: number;
  terrainStyle: TerrainStyle;
  viewPreset: ViewPreset;
  preset: PresetName;
};

type StyleTheme = {
  skyTop: string;
  skyBottom: string;
  fog: string;
  ground: string;
  road: string;
  roadGlow: string;
  water: string;
  park: string;
  commercialBase: string;
  commercialGlow: string;
  residentialBase: string;
  residentialGlow: string;
  industrialBase: string;
  industrialGlow: string;
  accent: string;
};

type ThemeMeta = {
  label: string;
  description: string;
};

type Cell = {
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  road: false;
  water: false;
  park: false;
  zone: ZoneType;
  height: number;
  width: number;
  depth: number;
  tower: boolean;
  seed: number;
  contributionCount: number;
  lightBands: number;
  lightStrength: number;
  repo: RepoHint;
  date: string;
  stars: number;
  forks: number;
  activityScore: number;
};

type RoadAxis = "x" | "z" | "junction";

type RoadSegment = {
  axis: RoadAxis;
  position: [number, number, number];
  size: [number, number, number];
};

type CarInstance = {
  axis: Exclude<RoadAxis, "junction">;
  position: [number, number, number];
  bodyColor: string;
  glowColor: string;
  direction: 1 | -1;
  length: number;
  width: number;
  speed: number;
  phase: number;
  travelSpan: number;
};

type ParkPatch = {
  position: [number, number, number];
  size: [number, number, number];
};

type WaterStrip = {
  position: [number, number, number];
  size: [number, number, number];
};

type TerrainRidge = {
  position: [number, number, number];
  radius: number;
  height: number;
};

type CityModel = {
  cells: Cell[];
  roads: RoadSegment[];
  cars: CarInstance[];
  parks: ParkPatch[];
  water: WaterStrip[];
  ridges: TerrainRidge[];
  bounds: { width: number; depth: number };
};

type ProfileSnapshot = {
  username: string;
  name: string;
  totalContributions: number;
  publicRepos: number;
  stars: number;
  longestStreak: number;
  topLanguage: string;
};

type RepoHint = {
  name: string;
  url: string;
  language: string | null;
  description: string | null;
};

type RepoSignal = {
  repo: RepoHint;
  activityCount: number;
  stars: number;
  forks: number;
  score: number;
  updatedAt: string | null;
  index: number;
};

const ROAD_SVG_SOURCE = `<?xml version="1.0" encoding="utf-8"?>
<svg width="800px" height="800px" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <path d="M14.0729979,0 L9.03234845,5.5313194e-08 L9.03234845,1.04200006 L7.958,1.042 L7.958,0 L3.083,0 L1.083,16 L16.005493,16 L14.0729979,0 Z M9,15 L8,15 L8,12 L9,12 L9,15 L9,15 Z M9,10.042 L8,10.042 L8,7 L9,7 L9,10.042 L9,10.042 Z M7.958,4.959 L7.958,2.959 L8.958,2.959 L8.958,4.959 L7.958,4.959 Z" fill="#434343"></path>
  </g>
</svg>`;

const INITIAL_STATE: EditorState = {
  citySize: 28,
  cityDensity: 72,
  blockSize: 4,
  streetPattern: "organic",
  commercial: 42,
  residential: 36,
  industrial: 22,
  averageHeight: 62,
  heightVariance: 38,
  cityStyle: "cyberpunk",
  riverProbability: 58,
  parksPercent: 8,
  terrainRoughness: 24,
  terrainStyle: "coastline",
  viewPreset: "cinematic",
  preset: "neon-megacity",
};

const STYLE_THEMES: Record<CityStyle, StyleTheme> = {
  "modern-glass": {
    skyTop: "#b8d2ea",
    skyBottom: "#dae4ef",
    fog: "#dfe8f1",
    ground: "#a8b7c5",
    road: "#7f8c99",
    roadGlow: "#d4ebff",
    water: "#8ac6f9",
    park: "#9dcf99",
    commercialBase: "#8fa7c0",
    commercialGlow: "#d9f1ff",
    residentialBase: "#b7c4d2",
    residentialGlow: "#f5f9ff",
    industrialBase: "#8d969f",
    industrialGlow: "#d2dce6",
    accent: "#ffffff",
  },
  european: {
    skyTop: "#7d8aa0",
    skyBottom: "#d4c5b5",
    fog: "#c4b8aa",
    ground: "#8d7c6a",
    road: "#6b6158",
    roadGlow: "#d8c1a5",
    water: "#708ca3",
    park: "#7da36a",
    commercialBase: "#a78063",
    commercialGlow: "#f1d6be",
    residentialBase: "#bb9a7f",
    residentialGlow: "#ffe2cb",
    industrialBase: "#7a7068",
    industrialGlow: "#cabfb8",
    accent: "#f3d19b",
  },
  "tokyo-dense": {
    skyTop: "#04110b",
    skyBottom: "#0a2a18",
    fog: "#0c2a18",
    ground: "#0a1610",
    road: "#101814",
    roadGlow: "#5cff7a",
    water: "#0b2f22",
    park: "#112817",
    commercialBase: "#1a241d",
    commercialGlow: "#f5ffb0",
    residentialBase: "#152019",
    residentialGlow: "#8dff72",
    industrialBase: "#1c1915",
    industrialGlow: "#ffb45f",
    accent: "#c9ffd4",
  },
  cyberpunk: {
    skyTop: "#060812",
    skyBottom: "#111a2f",
    fog: "#101827",
    ground: "#0c1018",
    road: "#090d14",
    roadGlow: "#2bf4ff",
    water: "#111c33",
    park: "#18311c",
    commercialBase: "#18253d",
    commercialGlow: "#48f0ff",
    residentialBase: "#1a2133",
    residentialGlow: "#ff7ae7",
    industrialBase: "#231d25",
    industrialGlow: "#ffd25f",
    accent: "#c4f84e",
  },
  brutalist: {
    skyTop: "#525964",
    skyBottom: "#8f95a1",
    fog: "#858c97",
    ground: "#626872",
    road: "#4c5158",
    roadGlow: "#b9c1cc",
    water: "#566a78",
    park: "#62715a",
    commercialBase: "#6b7481",
    commercialGlow: "#d3d9df",
    residentialBase: "#737c89",
    residentialGlow: "#f0f3f6",
    industrialBase: "#5a6068",
    industrialGlow: "#c4c9cf",
    accent: "#ffffff",
  },
};

const STYLE_THEME_META: Record<CityStyle, ThemeMeta> = {
  "modern-glass": {
    label: "Modern Glass",
    description: "Bright waterfront skyline with reflective towers, airy avenues, and cool harbor glow.",
  },
  european: {
    label: "European",
    description: "Warm residential blocks with softer streets, civic plazas, and old-city rhythm.",
  },
  "tokyo-dense": {
    label: "Tokyo Dense",
    description: "Moody avenues, dense high-rise composition, and mixed warm-cool window glow.",
  },
  cyberpunk: {
    label: "Cyberpunk",
    description: "Electric neon corridors with saturated contrast and high-energy night traffic.",
  },
  brutalist: {
    label: "Brutalist",
    description: "Heavy industrial massing with colder materials, rigid blocks, and steel-gray depth.",
  },
};

const PRESET_PATCHES: Record<PresetName, Partial<EditorState>> = {
  "neon-megacity": {
    cityDensity: 88,
    blockSize: 3,
    streetPattern: "grid",
    commercial: 52,
    residential: 28,
    industrial: 20,
    averageHeight: 82,
    heightVariance: 46,
    cityStyle: "cyberpunk",
    riverProbability: 64,
    parksPercent: 6,
    terrainRoughness: 22,
    terrainStyle: "coastline",
    viewPreset: "cinematic",
  },
  "balanced-core": {
    cityDensity: 72,
    blockSize: 4,
    streetPattern: "organic",
    commercial: 42,
    residential: 36,
    industrial: 22,
    averageHeight: 62,
    heightVariance: 38,
    cityStyle: "tokyo-dense",
    riverProbability: 34,
    parksPercent: 12,
    terrainRoughness: 24,
    terrainStyle: "coastline",
  },
  "industrial-belt": {
    cityDensity: 66,
    blockSize: 5,
    streetPattern: "grid",
    commercial: 18,
    residential: 24,
    industrial: 58,
    averageHeight: 44,
    heightVariance: 24,
    cityStyle: "brutalist",
    riverProbability: 18,
    parksPercent: 6,
    terrainRoughness: 42,
    terrainStyle: "plains",
  },
  "residential-area": {
    cityDensity: 58,
    blockSize: 5,
    streetPattern: "organic",
    commercial: 18,
    residential: 64,
    industrial: 18,
    averageHeight: 32,
    heightVariance: 18,
    cityStyle: "european",
    riverProbability: 20,
    parksPercent: 24,
    terrainRoughness: 18,
    terrainStyle: "plains",
  },
  "river-port": {
    cityDensity: 74,
    blockSize: 4,
    streetPattern: "radial",
    commercial: 26,
    residential: 30,
    industrial: 44,
    averageHeight: 56,
    heightVariance: 36,
    cityStyle: "modern-glass",
    riverProbability: 74,
    parksPercent: 10,
    terrainRoughness: 28,
    terrainStyle: "coastline",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededNoise(seed: number, x: number, y: number) {
  const value = Math.sin((x * 127.1) + (y * 311.7) + (seed * 91.1)) * 43758.5453123;
  return value - Math.floor(value);
}

function fbm(seed: number, x: number, y: number, octaves = 4) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;

  for (let i = 0; i < octaves; i += 1) {
    total += seededNoise(seed + i, x * frequency, y * frequency) * amplitude;
    sum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return sum > 0 ? total / sum : 0;
}

function zoneColor(theme: StyleTheme, zone: ZoneType) {
  if (zone === "commercial") return [theme.commercialBase, theme.commercialGlow] as const;
  if (zone === "industrial") return [theme.industrialBase, theme.industrialGlow] as const;
  return [theme.residentialBase, theme.residentialGlow] as const;
}

function pickWindowColor(theme: StyleTheme, cell: Cell, rowIndex: number, colIndex: number) {
  if (cell.zone === "commercial") {
    if (theme.skyTop === "#04110b") {
      return seededNoise(cell.seed + 301, rowIndex, colIndex) > 0.38 ? "#f9ffb6" : "#d6ff76";
    }
    return seededNoise(cell.seed + 301, rowIndex, colIndex) > 0.45 ? "#9ed8ff" : "#d7ecff";
  }

  if (cell.zone === "industrial") {
    if (theme.skyTop === "#04110b") {
      return seededNoise(cell.seed + 302, rowIndex, colIndex) > 0.46 ? "#ffb15e" : "#ffe48e";
    }
    return seededNoise(cell.seed + 302, rowIndex, colIndex) > 0.5 ? "#ffb978" : "#ffdca6";
  }

  if (theme.skyTop === "#04110b") {
    return seededNoise(cell.seed + 303, rowIndex, colIndex) > 0.48 ? "#63ff6f" : "#bfff7d";
  }
  return seededNoise(cell.seed + 303, rowIndex, colIndex) > 0.52 ? "#ffd88a" : "#fff1c7";
}

function pickCarPalette(style: CityStyle, seed: number) {
  const palettes: Record<CityStyle, { body: string[]; glow: string }> = {
    "modern-glass": {
      body: ["#d8e4ee", "#b8cad8", "#94a9ba", "#e9f3fb"],
      glow: "#d8f3ff",
    },
    european: {
      body: ["#b44f3f", "#6a7d8b", "#c9b07d", "#efe6da"],
      glow: "#ffe4b8",
    },
    "tokyo-dense": {
      body: ["#f6d160", "#9cc4ff", "#d9667b", "#d9e4f4"],
      glow: "#99ecff",
    },
    cyberpunk: {
      body: ["#ff4fd8", "#45f0ff", "#f8ff78", "#9b7dff"],
      glow: "#c9ff6a",
    },
    brutalist: {
      body: ["#9da6b0", "#6a727d", "#d0d5da", "#7d858e"],
      glow: "#f4f7fb",
    },
  };

  const palette = palettes[style];
  return {
    bodyColor: palette.body[seed % palette.body.length],
    glowColor: palette.glow,
  };
}

function normalizeBalances(state: EditorState) {
  const total = state.commercial + state.residential + state.industrial;
  if (total <= 0) return { commercial: 0.34, residential: 0.33, industrial: 0.33 };
  return {
    commercial: state.commercial / total,
    residential: state.residential / total,
    industrial: state.industrial / total,
  };
}

function deriveProfileSnapshot(data: GitBentoData): ProfileSnapshot {
  return {
    username: data.profile.username,
    name: data.profile.name || data.profile.username,
    totalContributions: data.contributionCalendar?.totalContributions ?? data.rpg.totalSignals,
    publicRepos: data.totals.publicRepos,
    stars: data.totals.stars,
    longestStreak: data.rpg.longestStreak,
    topLanguage: data.topLanguages[0]?.name ?? "Mixed",
  };
}

function buildRepoSignals(data: GitBentoData): RepoSignal[] {
  const repos = new Map<string, RepoSignal>();

  const ensureRepo = (name: string, partial?: (Partial<Omit<RepoSignal, "repo">> & { repo?: Partial<RepoHint> })) => {
    const key = name.toLowerCase();
    const current = repos.get(key);
    const nextRepo: RepoHint = {
      name,
      url: partial?.repo?.url ?? current?.repo.url ?? `https://github.com/${data.profile.username}/${name}`,
      language: partial?.repo?.language ?? current?.repo.language ?? null,
      description: partial?.repo?.description ?? current?.repo.description ?? null,
    };

    const next: RepoSignal = {
      repo: nextRepo,
      activityCount: partial?.activityCount ?? current?.activityCount ?? 0,
      stars: partial?.stars ?? current?.stars ?? 0,
      forks: partial?.forks ?? current?.forks ?? 0,
      score: partial?.score ?? current?.score ?? 0,
      updatedAt: partial?.updatedAt ?? current?.updatedAt ?? null,
      index: partial?.index ?? current?.index ?? repos.size,
    };

    repos.set(key, next);
    return next;
  };

  data.allRepositories.forEach((repo, index) => {
    ensureRepo(repo.name, {
      stars: repo.stars,
      forks: repo.forks,
      index,
      updatedAt: repo.pushedAt ?? repo.updatedAt,
      repo: {
        url: repo.url,
        language: repo.language,
        description: repo.description,
      },
    });
  });

  data.recentlyUpdated.forEach((repo, index) => {
    const existing = ensureRepo(repo.name, {
      updatedAt: repo.updatedAt,
      index: index + data.allRepositories.length,
      repo: {
        language: repo.language,
      },
    });
    if (!existing.updatedAt) existing.updatedAt = repo.updatedAt;
  });

  data.recentActivity.forEach((activity) => {
    const repoName = activity.repo.split("/").pop() ?? activity.repo;
    const current = ensureRepo(repoName, {
      repo: {
        url: `https://github.com/${activity.repo}`,
      },
    });
    current.activityCount += 1;
    if (!current.updatedAt || activity.createdAt > current.updatedAt) {
      current.updatedAt = activity.createdAt;
    }
  });

  const repoSignals = Array.from(repos.values());
  const maxActivity = Math.max(1, ...repoSignals.map((repo) => repo.activityCount));
  const maxStars = Math.max(1, ...repoSignals.map((repo) => repo.stars));
  const maxForks = Math.max(1, ...repoSignals.map((repo) => repo.forks));

  repoSignals.forEach((repo) => {
    const activityWeight = repo.activityCount / maxActivity;
    const starsWeight = repo.stars / maxStars;
    const forksWeight = repo.forks / maxForks;
    repo.score = (activityWeight * 0.72) + (starsWeight * 0.2) + (forksWeight * 0.08);
  });

  return repoSignals.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.activityCount !== a.activityCount) return b.activityCount - a.activityCount;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.repo.name.localeCompare(b.repo.name);
  });
}

function patchStateFromProfile(data: GitBentoData): Partial<EditorState> {
  const contributions = data.contributionCalendar?.totalContributions ?? data.rpg.totalSignals;
  const stars = data.totals.stars;
  const repos = data.totals.publicRepos;
  const impact = data.rpg.stats.impact;
  const diversity = data.rpg.stats.diversity;
  const consistency = data.rpg.stats.consistency;
  const nightSignals = data.rpg.nightSignals;

  return {
    citySize: clamp(18 + Math.round(repos / 5), 18, 36),
    cityDensity: clamp(72 + Math.round(consistency * 0.14), 68, 96),
    blockSize: 3,
    streetPattern: "grid",
    commercial: clamp(34 + Math.round(impact * 0.16), 30, 58),
    residential: clamp(22 + Math.round(diversity * 0.12), 20, 42),
    industrial: clamp(18 + Math.round((100 - consistency) * 0.1), 14, 34),
    averageHeight: clamp(42 + Math.round(contributions / 24), 42, 92),
    heightVariance: clamp(24 + Math.round((nightSignals + stars) / 18), 24, 52),
    cityStyle: "cyberpunk",
    riverProbability: clamp(24 + Math.round(diversity * 0.24), 18, 78),
    parksPercent: clamp(4 + Math.round((100 - impact) * 0.05), 3, 12),
    terrainRoughness: clamp(8 + Math.round(diversity * 0.1), 4, 28),
    terrainStyle: "coastline",
    viewPreset: "cinematic",
  };
}

function buildCityModel(state: EditorState, repoSignals: RepoSignal[]) {
  const roads: RoadSegment[] = [];
  const cars: CarInstance[] = [];
  const parks: ParkPatch[] = [];
  const water: WaterStrip[] = [];
  const ridges: TerrainRidge[] = [];
  const cells: Cell[] = [];

  const activeRepos = repoSignals.length > 0 ? repoSignals : [{
    repo: {
      name: "No Repo Data",
      url: "#",
      language: null,
      description: "Generate a profile to build your city skyline.",
    },
    activityCount: 0,
    stars: 0,
    forks: 0,
    score: 0.2,
    updatedAt: null,
    index: 0,
  }];

  const buildingCount = state.cityStyle === "cyberpunk"
    ? Math.max(72, activeRepos.length * 2)
    : activeRepos.length;
  const densityFactor = THREE.MathUtils.lerp(0.82, 1.24, state.cityDensity / 100);
  const blockScale = THREE.MathUtils.lerp(0.9, 1.16, (state.blockSize - 4) / 4);
  const depthBands = Math.max(2, Math.ceil((buildingCount / 6) * blockScale));
  const bounds = {
    width: Math.max(26, 18 + depthBands * 10),
    depth: Math.max(28, 16 + buildingCount * 3.2 * densityFactor),
  };
  const halfWidth = bounds.width / 2;
  const halfDepth = bounds.depth / 2;
  const avenueWidth = 5.8;
  const laneGap = 0.6;
  const roadThickness = 0.05;
  const ringInset = 2.6;
  const balances = normalizeBalances(state);
  const parkCount = clamp(Math.round((state.parksPercent / 100) * 18), 1, 6);

  roads.push(
    {
      axis: "x",
      position: [0, 0.02, -halfDepth + ringInset],
      size: [bounds.width - 2.6, roadThickness, 2.2],
    },
    {
      axis: "x",
      position: [0, 0.02, halfDepth - ringInset],
      size: [bounds.width - 2.6, roadThickness, 2.2],
    },
    {
      axis: "z",
      position: [-halfWidth + ringInset, 0.02, 0],
      size: [2.2, roadThickness, bounds.depth - 2.6],
    },
    {
      axis: "z",
      position: [halfWidth - ringInset, 0.02, 0],
      size: [2.2, roadThickness, bounds.depth - 2.6],
    },
    {
      axis: "z",
      position: [0, 0.02, 0],
      size: [avenueWidth, roadThickness, bounds.depth - 6.2],
    },
  );

  const connectorCount = Math.max(2, Math.ceil(buildingCount / 5));
  if (state.streetPattern === "grid") {
    for (let index = 0; index < connectorCount + 2; index += 1) {
      const z = -halfDepth + 7.2 + (index * ((bounds.depth - 14.4) / Math.max(1, connectorCount + 1)));
      roads.push({
        axis: "x",
        position: [0, 0.02, z],
        size: [bounds.width - 8.4, roadThickness, 1.4],
      });
    }

    for (let index = 0; index < 4; index += 1) {
      const x = -halfWidth + 8 + index * ((bounds.width - 16) / 3);
      roads.push({
        axis: "z",
        position: [x, 0.02, 0],
        size: [1.6, roadThickness, bounds.depth - 8.4],
      });
    }
  } else if (state.streetPattern === "radial") {
    for (let index = 0; index < connectorCount; index += 1) {
      const z = -halfDepth + 8 + (index * ((bounds.depth - 16) / Math.max(1, connectorCount - 1)));
      roads.push({
        axis: "x",
        position: [0, 0.02, z],
        size: [bounds.width - 8.4, roadThickness, 1.2],
      });
    }

    roads.push(
      {
        axis: "junction",
        position: [0, 0.02, 0],
        size: [7.2, roadThickness, 7.2],
      },
      {
        axis: "junction",
        position: [-halfWidth * 0.24, 0.02, halfDepth * 0.18],
        size: [4.2, roadThickness, 4.2],
      },
      {
        axis: "junction",
        position: [halfWidth * 0.22, 0.02, -halfDepth * 0.2],
        size: [4.2, roadThickness, 4.2],
      },
    );
  } else {
    for (let index = 0; index < connectorCount; index += 1) {
      const z = -halfDepth + 8 + (index * ((bounds.depth - 16) / Math.max(1, connectorCount - 1)));
      roads.push({
        axis: "x",
        position: [0, 0.02, z],
        size: [bounds.width - 8.4, roadThickness, 1.4],
      });
    }
  }

  if (state.terrainStyle === "coastline") {
    const stripCount = clamp(Math.round(3 + state.riverProbability / 16), 3, 8);
    const riverWidth = THREE.MathUtils.lerp(5.5, 13, state.riverProbability / 100);
    const riverX = state.streetPattern === "radial" ? 0 : halfWidth + 4.6;
    for (let strip = 0; strip < stripCount; strip += 1) {
      const zOffset = state.streetPattern === "radial"
        ? -halfDepth + 4 + strip * ((bounds.depth - 8) / Math.max(1, stripCount - 1))
        : -halfDepth + 5 + strip * 5.2;
      water.push({
        position: [riverX, -0.04, zOffset],
        size: state.streetPattern === "radial"
          ? [riverWidth, 0.08, 5.4]
          : [riverWidth, 0.08, 4.2],
      });
    }
  }

  for (let index = 0; index < parkCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const z = -halfDepth + 9 + index * ((bounds.depth - 18) / Math.max(1, parkCount - 1));
    parks.push({
      position: [side * (halfWidth - 6.2), 0.03, z],
      size: [3.4, 0.1, 3.4],
    });
  }

  const maxActivity = Math.max(1, ...activeRepos.map((repo) => repo.activityCount));
  const maxScore = Math.max(0.2, ...activeRepos.map((repo) => repo.score));
  const clusterSeeds = state.streetPattern === "grid"
    ? [
        { x: -8.4, z: -8.2 },
        { x: 0, z: -8.2 },
        { x: 8.4, z: -8.2 },
        { x: -8.4, z: 7.8 },
        { x: 8.4, z: 7.8 },
      ]
    : state.streetPattern === "radial"
      ? [
          { x: 0, z: 0 },
          { x: -7.2, z: -2.2 },
          { x: 7.2, z: 2.2 },
          { x: -3.2, z: 8.6 },
          { x: 3.2, z: -8.6 },
        ]
      : [
          { x: -6.6, z: -8.4 },
          { x: 6.2, z: -6.1 },
          { x: -7.4, z: 6.8 },
          { x: 7.1, z: 8.3 },
          { x: 0, z: 0 },
        ];
  const clusterCounts = new Array(clusterSeeds.length).fill(0);
  const commercialCutoff = Math.max(1, Math.round(buildingCount * balances.commercial));
  const residentialCutoff = Math.max(commercialCutoff + 1, Math.round(buildingCount * (balances.commercial + balances.residential)));
  const averageHeightFactor = THREE.MathUtils.lerp(0.74, 1.48, state.averageHeight / 100);
  const varianceFactor = THREE.MathUtils.lerp(0.25, 1.5, state.heightVariance / 100);

  Array.from({ length: buildingCount }, (_, index) => {
    const baseSignal = activeRepos[index % activeRepos.length];
    const isAmbientTower = index >= activeRepos.length;
    const signal: RepoSignal = isAmbientTower
      ? {
          ...baseSignal,
          activityCount: Math.max(1, Math.round(baseSignal.activityCount * (0.35 + seededNoise(930, index, 1) * 0.45))),
          score: Math.max(0.12, baseSignal.score * (0.28 + seededNoise(931, index, 1) * 0.42)),
          repo: {
            ...baseSignal.repo,
            name: `District ${String(index - activeRepos.length + 1).padStart(2, "0")}`,
            description: "Procedural background tower filling the living city grid.",
          },
        }
      : baseSignal;
    const clusterIndex = index % clusterSeeds.length;
    const cluster = clusterSeeds[clusterIndex];
    const slotIndex = clusterCounts[clusterIndex];
    clusterCounts[clusterIndex] += 1;
    const ring = Math.floor(slotIndex / 3);
    const spoke = slotIndex % 3;
    const angle = (spoke / 3) * Math.PI * 2 + (ring * 0.65) + (clusterIndex * 0.33);
    const radius = state.streetPattern === "radial"
      ? 1.2 + (ring * 2.1) + seededNoise(803, index, clusterIndex) * 0.8
      : 1.8 + (ring * 1.55) + seededNoise(803, index, clusterIndex) * 0.9;
    const activityStrength = signal.activityCount / maxActivity;
    const scoreStrength = signal.score / maxScore;
    const zone: ZoneType = index < commercialCutoff
      ? "commercial"
      : index < residentialCutoff
        ? "residential"
        : "industrial";
    const zoneBaseHeight = zone === "commercial" ? 8.5 : zone === "industrial" ? 5.8 : 6.8;
    const width = (zone === "commercial" ? 1.8 : zone === "industrial" ? 2.2 : 1.95) * (isAmbientTower ? 0.9 : 1);
    const depth = (zone === "commercial" ? 1.8 : zone === "industrial" ? 2.4 : 2.05) * (isAmbientTower ? 0.9 : 1);
    const varianceNoise = (seededNoise(912, index, slotIndex) - 0.5) * 12 * varianceFactor;
    const height = clamp((zoneBaseHeight + (activityStrength * 12) + (scoreStrength * 7) + varianceNoise) * averageHeightFactor, 4.6, 34);
    const avenuePush = Math.abs(cluster.x) < 1 ? (seededNoise(804, index, slotIndex) > 0.5 ? 1 : -1) * 4.8 : 0;
    const worldX = state.streetPattern === "grid"
      ? clamp(
        cluster.x + ((slotIndex % 2 === 0 ? -1 : 1) * (1.6 + ring * 1.1)) + (seededNoise(801, index, slotIndex) - 0.5) * 0.7,
        -halfWidth + 5.8,
        halfWidth - 5.8,
      )
      : clamp(
        cluster.x + avenuePush + Math.cos(angle) * radius + (seededNoise(801, index, slotIndex) - 0.5) * 1.2,
        -halfWidth + 5.8,
        halfWidth - 5.8,
      );
    const worldZ = state.streetPattern === "grid"
      ? clamp(
        cluster.z + ((Math.floor(slotIndex / 2) % 3) - 1) * (2.4 + ring * 1.2) + (seededNoise(802, index, slotIndex) - 0.5) * 0.8,
        -halfDepth + 6.2,
        halfDepth - 6.2,
      )
      : clamp(
        cluster.z + Math.sin(angle) * radius + (seededNoise(802, index, slotIndex) - 0.5) * 1.4,
        -halfDepth + 6.2,
        halfDepth - 6.2,
      );
    const lightBands = clamp(Math.round(4 + activityStrength * 7 + scoreStrength * 3), 4, 12);
    const lightStrength = clamp(0.28 + activityStrength * 0.56, 0.24, 0.92);

    cells.push({
      x: index,
      z: slotIndex,
      worldX,
      worldZ,
      road: false,
      water: false,
      park: false,
      zone,
      height,
      width,
      depth,
      tower: zone === "commercial" || scoreStrength > 0.72,
      seed: (index + 1) * 997,
      contributionCount: signal.activityCount,
      lightBands,
      lightStrength,
      repo: signal.repo,
      date: signal.updatedAt?.slice(0, 10) ?? "Recent activity",
      stars: signal.stars,
      forks: signal.forks,
      activityScore: signal.score,
    });
  });

  const templates: Array<Pick<CarInstance, "axis" | "position" | "direction">> = [
    { axis: "x", position: [0, 0.26, -halfDepth + ringInset + laneGap], direction: 1 },
    { axis: "x", position: [0, 0.26, halfDepth - ringInset - laneGap], direction: -1 },
    { axis: "z", position: [-halfWidth + ringInset + laneGap, 0.26, 0], direction: 1 },
    { axis: "z", position: [halfWidth - ringInset - laneGap, 0.26, 0], direction: -1 },
    { axis: "z", position: [-laneGap, 0.26, 0], direction: 1 },
    { axis: "z", position: [laneGap, 0.26, 0], direction: -1 },
  ];

  templates.slice(0, Math.min(6, templates.length)).forEach((template, index) => {
    const { bodyColor, glowColor } = pickCarPalette(state.cityStyle, index + buildingCount);
    cars.push({
      ...template,
      bodyColor,
      glowColor,
      length: 1.12,
      width: 0.46,
      speed: 1.15 + (index % 3) * 0.16,
      phase: index * 1.3,
      travelSpan: template.axis === "x" ? bounds.width - 6.4 : bounds.depth - 6.4,
    });
  });

  return { cells, roads, cars, parks, water, ridges, bounds };
}

function CameraDirector({
  viewPreset,
  bounds,
  controlsRef,
}: {
  viewPreset: ViewPreset;
  bounds: CityModel["bounds"];
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const span = Math.max(bounds.width, bounds.depth);
    const cameraSpan = clamp(span, 42, 78);
    const controls = controlsRef.current;
    const perspectiveCamera = camera instanceof THREE.PerspectiveCamera ? camera : null;

    let nextPosition = new THREE.Vector3(0, cameraSpan * 0.82, 0.01);
    if (viewPreset === "overhead") {
      target.current.set(0, 0, 0);
      nextPosition.set(0, cameraSpan * 0.82, 0.01);
      if (perspectiveCamera) perspectiveCamera.fov = 28;
    } else if (viewPreset === "cinematic") {
      target.current.set(0, cameraSpan * 0.09, -Math.min(bounds.depth * 0.1, 9));
      nextPosition.set(cameraSpan * 0.18, cameraSpan * 0.15, cameraSpan * 0.34);
      if (perspectiveCamera) perspectiveCamera.fov = 42;
    } else {
      target.current.set(0, cameraSpan * 0.06, 0);
      nextPosition.set(0, cameraSpan * 0.22, cameraSpan * 0.34);
      if (perspectiveCamera) perspectiveCamera.fov = 36;
    }

    camera.near = 0.1;
    camera.far = Math.max(260, span * 8);
    camera.position.copy(nextPosition);
    if (perspectiveCamera) perspectiveCamera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(target.current);
      controls.update();
    } else {
      camera.lookAt(target.current);
    }
  }, [bounds.depth, bounds.width, camera, controlsRef, viewPreset]);

  return null;
}

function Terrain({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[bounds.width + 42, bounds.depth + 42]} />
        <meshStandardMaterial
          color={theme.ground}
          emissive={theme.ground}
          emissiveIntensity={0.08}
          roughness={0.82}
          metalness={0.14}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <planeGeometry args={[bounds.width + 30, bounds.depth + 30]} />
        <meshStandardMaterial
          color="#0a1220"
          emissive="#14233f"
          emissiveIntensity={0.08}
          transparent
          opacity={0.18}
          roughness={0.16}
          metalness={0.84}
        />
      </mesh>
    </group>
  );
}

function TrafficSignal({
  position,
  theme,
  phase,
}: {
  position: [number, number, number];
  theme: StyleTheme;
  phase: number;
}) {
  const lightRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const cycle = (clock.getElapsedTime() * 0.8 + phase) % 6;
    const activeColor = cycle < 3 ? "#ff4d4d" : "#6dff7a";
    if (lightRef.current?.material instanceof THREE.MeshBasicMaterial) {
      lightRef.current.material.color.set(activeColor);
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.06, 1.2, 0.06]} />
        <meshStandardMaterial color="#505761" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.16, 0.32, 0.16]} />
        <meshStandardMaterial color="#171b22" />
      </mesh>
      <mesh ref={lightRef} position={[0, 1.22, 0.09]}>
        <boxGeometry args={[0.07, 0.07, 0.03]} />
        <meshBasicMaterial color={theme.roadGlow} />
      </mesh>
    </group>
  );
}

function RoadGlyphs({
  road,
  theme,
}: {
  road: RoadSegment;
  theme: StyleTheme;
}) {
  const glyphGeometry = useMemo(() => {
    const loader = new SVGLoader();
    const data = loader.parse(ROAD_SVG_SOURCE);
    const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box) {
      const width = box.max.x - box.min.x || 1;
      const height = box.max.y - box.min.y || 1;
      const scale = 0.22 / Math.max(width, height);
      geometry.translate(-(box.min.x + width / 2), -(box.min.y + height / 2), 0);
      geometry.scale(scale, scale, 1);
    }
    return geometry;
  }, []);
  const span = road.axis === "x" ? road.size[0] : road.size[2];
  const count = clamp(Math.floor(span / 2.6), 2, 14);
  const marks = useMemo(
    () => Array.from({ length: count }, (_, index) => -span / 2 + ((index + 0.5) * span) / count),
    [count, span],
  );

  return (
    <>
      {marks.map((offset) => (
        <mesh
          key={offset}
          position={road.axis === "x" ? [offset, 0.038, 0] : [0, 0.038, offset]}
          rotation={road.axis === "x" ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, Math.PI / 2, 0]}
        >
          <primitive object={glyphGeometry} attach="geometry" />
          <meshBasicMaterial color={theme.roadGlow} transparent opacity={0.42} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function AnimatedCar({
  car,
}: {
  car: CarInstance;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const start = useMemo(() => new THREE.Vector3(...car.position), [car.position]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const travel = ((clock.getElapsedTime() * car.speed) + car.phase) % car.travelSpan;
    const offset = travel - (car.travelSpan / 2);

    if (car.axis === "x") {
      groupRef.current.position.set(start.x + (offset * car.direction), start.y, start.z);
    } else {
      groupRef.current.position.set(start.x, start.y, start.z + (offset * car.direction));
    }
  });

  return (
    <group
      ref={groupRef}
      position={car.position}
      rotation={[0, car.axis === "x" ? (car.direction > 0 ? 0 : Math.PI) : (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2), 0]}
    >
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[car.length * 1.24, 0.03, car.width * 1.7]} />
        <meshBasicMaterial color={car.glowColor} transparent opacity={0.18} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[car.length, 0.18, car.width]} />
        <meshStandardMaterial color={car.bodyColor} emissive={car.bodyColor} emissiveIntensity={0.28} roughness={0.42} metalness={0.24} />
      </mesh>
      <mesh position={[-0.02, 0.16, 0]} castShadow>
        <boxGeometry args={[car.length * 0.56, 0.16, car.width * 0.82]} />
        <meshStandardMaterial color="#e8eef7" emissive="#f4f8ff" emissiveIntensity={0.2} roughness={0.18} metalness={0.3} />
      </mesh>
      <mesh position={[car.length * 0.48, 0.01, car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshBasicMaterial color={car.glowColor} />
      </mesh>
      <mesh position={[car.length * 0.48, 0.01, -car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshBasicMaterial color={car.glowColor} />
      </mesh>
      <mesh position={[-car.length * 0.48, 0.01, car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshBasicMaterial color="#ff6a5f" />
      </mesh>
      <mesh position={[-car.length * 0.48, 0.01, -car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshBasicMaterial color="#ff6a5f" />
      </mesh>
      {[-car.length * 0.28, car.length * 0.28].map((wheelX) => (
        [-car.width * 0.36, car.width * 0.36].map((wheelZ) => (
          <mesh key={`${wheelX}-${wheelZ}`} position={[wheelX, -0.12, wheelZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#0f1115" />
          </mesh>
        ))
      ))}
    </group>
  );
}

function GrassStrip({
  width,
  depth,
  seed,
  density = 180,
}: {
  width: number;
  depth: number;
  seed: number;
  density?: number;
}) {
  const bladeCount = clamp(Math.round(width * depth * density), 45, 180);
  const grassGeometry = useMemo(() => {
    const firstBlade = new THREE.PlaneGeometry(0.065, 0.28);
    firstBlade.translate(0, 0.14, 0);
    const secondBlade = firstBlade.clone();
    secondBlade.rotateY(Math.PI / 2);
    const geometry = new THREE.BufferGeometry();
    const firstPosition = firstBlade.getAttribute("position");
    const secondPosition = secondBlade.getAttribute("position");
    const firstUv = firstBlade.getAttribute("uv");
    const secondUv = secondBlade.getAttribute("uv");
    const positions = new Float32Array(firstPosition.count * 3 + secondPosition.count * 3);
    const uvs = new Float32Array(firstUv.count * 2 + secondUv.count * 2);
    positions.set(firstPosition.array as Float32Array, 0);
    positions.set(secondPosition.array as Float32Array, firstPosition.count * 3);
    uvs.set(firstUv.array as Float32Array, 0);
    uvs.set(secondUv.array as Float32Array, firstUv.count * 2);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
    firstBlade.dispose();
    secondBlade.dispose();
    return geometry;
  }, []);
  const grassMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    }),
    [],
  );
  const matrices = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    return Array.from({ length: bladeCount }, (_, index) => {
      position.set(
        (seededNoise(seed, index, 1) - 0.5) * width,
        0,
        (seededNoise(seed, index, 2) - 0.5) * depth,
      );
      rotation.set(
        (seededNoise(seed, index, 3) - 0.5) * 0.36,
        seededNoise(seed, index, 4) * Math.PI,
        (seededNoise(seed, index, 5) - 0.5) * 0.42,
      );
      const bladeScale = 1 + seededNoise(seed, index, 6) * 1.15;
      scale.set(1.35 + seededNoise(seed, index, 7) * 0.9, bladeScale, 1);
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      return matrix.clone();
    });
  }, [bladeCount, depth, seed, width]);
  const colors = useMemo(() => {
    const palette = ["#66c85a", "#7adf68", "#8eea78", "#a4f08a"];
    return Array.from({ length: bladeCount }, (_, index) => {
      const color = new THREE.Color(palette[Math.floor(seededNoise(seed, index, 8) * palette.length)]);
      color.multiplyScalar(0.9 + seededNoise(seed, index, 9) * 0.3);
      return color;
    });
  }, [bladeCount, seed]);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    matrices.forEach((matrix, index) => {
      meshRef.current?.setMatrixAt(index, matrix);
      meshRef.current?.setColorAt(index, colors[index]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [colors, matrices]);

  return (
    <instancedMesh ref={meshRef} args={[grassGeometry, grassMaterial, bladeCount]} />
  );
}

function BuildingLot({
  cell,
  index,
  theme,
}: {
  cell: Cell;
  index: number;
  theme: StyleTheme;
}) {
  const lotWidth = cell.width + 1.25;
  const lotDepth = cell.depth + 1.35;
  const isResidential = cell.zone === "residential";
  const lotColor = isResidential ? "#142018" : cell.zone === "industrial" ? "#17191c" : "#151b22";
  const stripColor = isResidential ? "#4f9f46" : "#5fae54";
  const curbColor = index % 2 === 0 ? theme.roadGlow : "#ff73e8";

  return (
    <group position={[cell.worldX, 0.005, cell.worldZ]}>
      <mesh receiveShadow>
        <boxGeometry args={[lotWidth, 0.04, lotDepth]} />
        <meshStandardMaterial
          color={lotColor}
          emissive={lotColor}
          emissiveIntensity={0.06}
          roughness={0.62}
          metalness={isResidential ? 0.08 : 0.34}
        />
      </mesh>
      <group position={[0, 0.035, lotDepth * 0.42]}>
        <mesh receiveShadow>
          <boxGeometry args={[lotWidth * 0.86, 0.035, 0.32]} />
          <meshStandardMaterial color={stripColor} emissive={stripColor} emissiveIntensity={0.22} roughness={0.82} />
        </mesh>
        <group position={[0, 0.04, 0]}>
          <GrassStrip width={lotWidth * 0.8} depth={0.32} seed={cell.seed + 411} density={280} />
        </group>
      </group>
      <group position={[0, 0.035, -lotDepth * 0.42]}>
        <mesh receiveShadow>
          <boxGeometry args={[lotWidth * 0.86, 0.035, 0.32]} />
          <meshStandardMaterial color={stripColor} emissive={stripColor} emissiveIntensity={0.22} roughness={0.82} />
        </mesh>
        <group position={[0, 0.04, 0]}>
          <GrassStrip width={lotWidth * 0.8} depth={0.32} seed={cell.seed + 733} density={280} />
        </group>
      </group>
      <group position={[lotWidth * 0.42, 0.035, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.28, 0.035, lotDepth * 0.72]} />
          <meshStandardMaterial color={stripColor} emissive={stripColor} emissiveIntensity={0.22} roughness={0.82} />
        </mesh>
        <group position={[0, 0.04, 0]}>
          <GrassStrip width={0.28} depth={lotDepth * 0.68} seed={cell.seed + 977} density={300} />
        </group>
      </group>
      <group position={[-lotWidth * 0.42, 0.035, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.28, 0.035, lotDepth * 0.72]} />
          <meshStandardMaterial color={stripColor} emissive={stripColor} emissiveIntensity={0.22} roughness={0.82} />
        </mesh>
        <group position={[0, 0.04, 0]}>
          <GrassStrip width={0.28} depth={lotDepth * 0.68} seed={cell.seed + 1229} density={300} />
        </group>
      </group>
      {[
        [0, lotDepth / 2, lotWidth, 0.06],
        [0, -lotDepth / 2, lotWidth, 0.06],
        [lotWidth / 2, 0, 0.06, lotDepth],
        [-lotWidth / 2, 0, 0.06, lotDepth],
      ].map(([x, z, width, depth], curbIndex) => (
        <mesh key={`curb-${curbIndex}`} position={[x, 0.055, z]}>
          <boxGeometry args={[width, 0.05, depth]} />
          <meshStandardMaterial
            color="#303846"
            emissive={curbColor}
            emissiveIntensity={curbIndex < 2 ? 0.12 : 0.06}
            roughness={0.34}
            metalness={0.38}
          />
        </mesh>
      ))}
    </group>
  );
}

function BuildingHoverCard({ cell }: { cell: Cell }) {
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

function CityScene({
  state,
  contributions,
}: {
  state: EditorState;
  contributions: RepoSignal[];
}) {
  const theme = STYLE_THEMES[state.cityStyle];
  const model = useMemo(() => buildCityModel(state, contributions), [contributions, state]);
  const controlsRef = useRef<any>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <>
      <color attach="background" args={[theme.skyTop]} />
      <fog attach="fog" args={[theme.fog, 24, 190]} />

      <CameraDirector viewPreset={state.viewPreset} bounds={model.bounds} controlsRef={controlsRef} />

      <ambientLight intensity={0.48} color={theme.accent} />
      <directionalLight position={[28, 42, 18]} intensity={0.72} color="#d8dde6" castShadow />
      <pointLight position={[0, 12, 0]} intensity={0.5} color={theme.roadGlow} />

      <Terrain bounds={model.bounds} theme={theme} />

      {model.ridges.map((ridge) => (
        <mesh
          key={`${ridge.position[0]}-${ridge.position[2]}`}
          position={[ridge.position[0], ridge.height / 2, ridge.position[2]]}
          castShadow
        >
          <cylinderGeometry args={[ridge.radius * 0.36, ridge.radius, ridge.height, 7]} />
          <meshStandardMaterial color="#364136" roughness={0.92} />
        </mesh>
      ))}

      {model.water.map((strip, index) => (
        <mesh key={`water-${index}`} position={strip.position} receiveShadow>
          <boxGeometry args={strip.size} />
          <meshStandardMaterial
            color={theme.water}
            emissive={theme.water}
            emissiveIntensity={state.cityStyle === "cyberpunk" ? 0.34 : 0.12}
            transparent
            opacity={0.92}
            roughness={0.26}
            metalness={0.42}
          />
        </mesh>
      ))}

      {model.parks.map((park, index) => (
        <group key={`park-${index}`} position={park.position}>
          <mesh receiveShadow>
            <boxGeometry args={park.size} />
            <meshStandardMaterial color={theme.park} emissive={theme.park} emissiveIntensity={0.06} />
          </mesh>
          {[-0.32, 0.24].map((offsetX) => (
            <mesh key={offsetX} position={[offsetX, 0.3, 0.12]} castShadow>
              <coneGeometry args={[0.22, 0.58, 6]} />
              <meshStandardMaterial color="#3b6d3a" />
            </mesh>
          ))}
        </group>
      ))}

      {model.cells.map((cell, index) => (
        <BuildingLot key={`lot-${cell.x}-${cell.z}`} cell={cell} index={index} theme={theme} />
      ))}

      {model.roads.map((road, index) => (
        <group key={`road-${index}`} position={road.position}>
          <mesh receiveShadow>
            <boxGeometry args={road.size} />
            <meshStandardMaterial
              color={theme.road}
              emissive={theme.roadGlow}
              emissiveIntensity={state.cityStyle === "cyberpunk" ? 0.045 : state.cityStyle === "tokyo-dense" ? 0.12 : 0.06}
              roughness={state.cityStyle === "cyberpunk" ? 0.24 : 0.96}
              metalness={state.cityStyle === "cyberpunk" ? 0.56 : 0.05}
            />
          </mesh>
          {road.axis !== "junction" ? (
            <>
              <mesh position={[0, 0.028, 0]} receiveShadow>
                <boxGeometry args={[road.axis === "x" ? road.size[0] : road.size[0] * 0.28, 0.012, road.axis === "x" ? road.size[2] * 0.28 : road.size[2]]} />
                <meshStandardMaterial color="#0b0e14" roughness={1} />
              </mesh>
              {[-0.18, 0.18].map((offset) => (
                <mesh
                  key={offset}
                  position={road.axis === "x" ? [0, 0.035, offset] : [offset, 0.035, 0]}
                  rotation={road.axis === "x" ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, Math.PI / 2, 0]}
                >
                  <planeGeometry args={[road.axis === "x" ? road.size[0] * 0.72 : road.size[2] * 0.72, 0.018]} />
                  <meshBasicMaterial color={theme.roadGlow} transparent opacity={state.cityStyle === "cyberpunk" ? 0.32 : 0.2} />
                </mesh>
              ))}
              <RoadGlyphs road={road} theme={theme} />
            </>
          ) : (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.036, 0]}>
                <ringGeometry args={[road.size[0] * 0.08, road.size[0] * 0.18, 18]} />
                <meshBasicMaterial color={theme.roadGlow} transparent opacity={0.18} side={THREE.DoubleSide} />
              </mesh>
              {Math.abs(road.position[0]) > (model.bounds.width / 2) - 4 &&
              Math.abs(road.position[2]) > (model.bounds.depth / 2) - 4
                ? [
                    [road.size[0] * 0.28, 0, road.size[2] * 0.28],
                    [-road.size[0] * 0.28, 0, -road.size[2] * 0.28],
                  ].map((position, lightIndex) => (
                    <TrafficSignal
                      key={`signal-${lightIndex}`}
                      position={position as [number, number, number]}
                      theme={theme}
                      phase={lightIndex * 1.6}
                    />
                  ))
                : null}
            </>
          )}
        </group>
      ))}

      {model.cars.map((car, index) => (
        <AnimatedCar key={`car-${index}`} car={car} />
      ))}

      {model.cells.map((cell) => {
        const [baseColor, glowColor] = zoneColor(theme, cell.zone);
        const cellId = `${cell.x}-${cell.z}`;
        const windowRows = clamp(cell.lightBands + (state.cityStyle === "cyberpunk" ? 3 : 0), 4, 14);
        const windowCols = clamp(Math.round((cell.width / 0.18) * (state.cityStyle === "cyberpunk" ? 1.05 : 0.7)), 3, 6);
        const sideWindowCols = clamp(Math.round((cell.depth / 0.18) * (state.cityStyle === "cyberpunk" ? 0.95 : 0.7)), 3, 6);
        return (
          <group
            key={cellId}
            position={[cell.worldX, cell.height / 2, cell.worldZ]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredCell(cellId);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHoveredCell((current) => (current === cellId ? null : current));
            }}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[cell.width, cell.height, cell.depth]} />
              <meshStandardMaterial
                color={baseColor}
                emissive={baseColor}
                emissiveIntensity={state.cityStyle === "cyberpunk" ? 0.08 : state.cityStyle === "tokyo-dense" ? 0.09 : 0.05}
                roughness={state.cityStyle === "cyberpunk" ? 0.42 : state.cityStyle === "modern-glass" ? 0.28 : 0.72}
                metalness={state.cityStyle === "cyberpunk" ? 0.48 : state.cityStyle === "modern-glass" ? 0.78 : 0.18}
              />
            </mesh>
            <mesh position={[0, -cell.height / 2 + 0.28, 0]} castShadow receiveShadow>
              <boxGeometry args={[cell.width * 1.08, 0.56, cell.depth * 1.08]} />
              <meshStandardMaterial
                color="#2e333c"
                emissive="#1a1f28"
                emissiveIntensity={0.05}
                roughness={0.76}
                metalness={0.16}
              />
            </mesh>
            <mesh position={[0, cell.height / 2 - 0.08, 0]} castShadow>
              <boxGeometry args={[cell.width * 1.02, 0.12, cell.depth * 1.02]} />
              <meshStandardMaterial color="#4a505a" roughness={0.64} metalness={0.28} />
            </mesh>
            {cell.tower ? (
              <mesh position={[0, cell.height / 2 + 0.34, 0]} castShadow>
                <boxGeometry args={[cell.width * 0.72, 0.52, cell.depth * 0.72]} />
                <meshStandardMaterial
                  color="#39414d"
                  emissive="#20252f"
                  emissiveIntensity={0.04}
                  roughness={0.6}
                  metalness={0.22}
                />
              </mesh>
            ) : null}
            {[
              [-(cell.width / 2) - 0.012, 0, 0, 0.024, cell.height * 0.96, cell.depth * 1.01],
              [(cell.width / 2) + 0.012, 0, 0, 0.024, cell.height * 0.96, cell.depth * 1.01],
            ].map(([x, y, z, width, height, depth], edgeIndex) => (
              <mesh key={`edge-${edgeIndex}`} position={[x, y, z]}>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color="#5b6470" emissive="#c8d8ff" emissiveIntensity={0.03} roughness={0.42} metalness={0.38} />
              </mesh>
            ))}
            <mesh position={[0, 0, cell.depth / 2 + 0.015]}>
              <planeGeometry args={[cell.width * 1.04, cell.height * 1.02]} />
              <meshBasicMaterial color={glowColor} transparent opacity={state.cityStyle === "cyberpunk" ? 0.045 : 0.04} depthWrite={false} />
            </mesh>
            <mesh position={[0, cell.height / 2 + 0.7, 0]} castShadow>
              <boxGeometry args={[0.07, 1.4, 0.07]} />
              <meshStandardMaterial color="#293244" emissive="#4d5d7d" emissiveIntensity={0.18} />
            </mesh>
            <mesh position={[0, cell.height / 2 + 1.45, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={seededNoise(cell.seed, 90, 1) > 0.5 ? "#ff5d76" : "#6ce7ff"} />
            </mesh>

            {Array.from({ length: windowRows }, (_, rowIndex) => {
              const y = -cell.height / 2 + ((rowIndex + 1) / (windowRows + 1)) * cell.height;
              return Array.from({ length: windowCols }, (_, colIndex) => {
                const x = ((colIndex + 1) / (windowCols + 1) - 0.5) * cell.width * 0.72;
                const lit = seededNoise(cell.seed, rowIndex + 1, colIndex + 1) < clamp(0.48 + (cell.contributionCount / Math.max(1, cell.contributionCount + 6)), 0.42, 0.94);
                return (
                  <mesh key={`front-${rowIndex}-${colIndex}`} position={[x, y, cell.depth / 2 + 0.01]}>
                    <planeGeometry args={[cell.width * 0.12, Math.max(0.1, cell.height / (windowRows * 5.4))]} />
                    <meshBasicMaterial
                      color={pickWindowColor(theme, cell, rowIndex, colIndex)}
                      transparent
                      opacity={lit ? Math.max(cell.lightStrength, 0.52) : 0.08}
                    />
                  </mesh>
                );
              });
            })}

            {Array.from({ length: windowRows - 1 }, (_, rowIndex) => {
              const y = -cell.height / 2 + ((rowIndex + 1) / windowRows) * cell.height;
              return Array.from({ length: sideWindowCols }, (_, colIndex) => {
                const z = ((colIndex + 1) / (sideWindowCols + 1) - 0.5) * cell.depth * 0.72;
                const lit = seededNoise(cell.seed + 17, rowIndex + 1, colIndex + 1) < clamp(0.38 + (cell.contributionCount / Math.max(1, cell.contributionCount + 7)), 0.34, 0.86);
                return (
                  <mesh key={`side-${rowIndex}-${colIndex}`} position={[cell.width / 2 + 0.01, y, z]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[cell.depth * 0.12, Math.max(0.09, cell.height / (windowRows * 5.8))]} />
                    <meshBasicMaterial
                      color={pickWindowColor(theme, cell, rowIndex, colIndex)}
                      transparent
                      opacity={lit ? Math.max(cell.lightStrength * 0.82, 0.4) : 0.06}
                    />
                  </mesh>
                );
              });
            })}

            {state.cityStyle !== "cyberpunk" && hoveredCell === cellId ? <BuildingHoverCard cell={cell} /> : null}
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={160}
        minPolarAngle={0.22}
        maxPolarAngle={Math.PI / 2.02}
      />
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-black/28 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-2 text-emerald-100">
          <Icon className="size-4" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/78">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-white/45">
        <span>{label}</span>
        <span className="font-semibold text-white/82">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-300"
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "rounded-2xl border border-emerald-300/25 bg-emerald-300/14 px-3 py-3 text-sm font-semibold text-emerald-50"
                : "rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/68 transition hover:bg-white/[0.05]"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function syncFromData(data: GitBentoData) {
  return {
    profile: deriveProfileSnapshot(data),
    contributions: buildRepoSignals(data),
    patch: patchStateFromProfile(data),
  };
}

export function ProceduralCityEditor({
  data,
  embedded = false,
}: {
  data?: GitBentoData;
  embedded?: boolean;
}) {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [contributions, setContributions] = useState<RepoSignal[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const deferredState = useDeferredValue(state);
  const theme = STYLE_THEMES[state.cityStyle];
  const themeMeta = STYLE_THEME_META[state.cityStyle];
  const captureRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function patchState(patch: Partial<EditorState>) {
    startTransition(() => {
      setState((current) => ({ ...current, ...patch }));
    });
  }

  function applyPreset(preset: PresetName) {
    patchState({
      ...PRESET_PATCHES[preset],
      preset,
    });
  }

  function applyIncomingData(nextData: GitBentoData) {
    const hydrated = syncFromData(nextData);
    setProfile(hydrated.profile);
    setContributions(hydrated.contributions);
    patchState(hydrated.patch);
  }

  async function handleGenerate(event?: FormEvent<HTMLFormElement>, overrideUsername?: string) {
    event?.preventDefault();
    const trimmed = (overrideUsername ?? username).trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");
    setUsername(trimmed);

    try {
      const response = await fetch(`/api/github?username=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json()) as GitBentoData | { error?: string };

      if (!response.ok || "error" in payload) {
        setError(("error" in payload && payload.error) || "Could not load GitHub profile.");
        return;
      }

      window.localStorage.setItem("gitbento:last-username", trimmed);
      applyIncomingData(payload as GitBentoData);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePosterExport() {
    if (!captureRef.current) return;

    const dataUrl = await toPng(captureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: theme.skyTop,
    });

    const link = document.createElement("a");
    link.download = `${profile?.username ?? "city"}-city-poster.png`;
    link.href = dataUrl;
    link.click();
  }

  async function handleLoopCapture() {
    if (!captureRef.current || isRecording) return;
    const sceneCanvas = captureRef.current.querySelector("canvas");
    if (!(sceneCanvas instanceof HTMLCanvasElement)) return;

    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = sceneCanvas.width;
    overlayCanvas.height = sceneCanvas.height;
    const context = overlayCanvas.getContext("2d");
    if (!context) return;

    const stream = overlayCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    const chunks: Blob[] = [];
    let frameId = 0;
    let stopped = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      stopped = true;
      setIsRecording(false);
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${profile?.username ?? "city"}-loop.webm`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    setIsRecording(true);
    recorder.start();

    const startedAt = performance.now();
    const durationMs = 6000;

    const draw = (now: number) => {
      if (stopped) return;
      context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      context.drawImage(sceneCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);

      const panelWidth = overlayCanvas.width * 0.24;
      context.fillStyle = "rgba(6, 12, 18, 0.78)";
      context.fillRect(40, 40, panelWidth, 168);
      context.strokeStyle = "rgba(114, 255, 193, 0.28)";
      context.lineWidth = 2;
      context.strokeRect(40, 40, panelWidth, 168);
      context.fillStyle = "#dfffe5";
      context.font = "700 26px Arial";
      context.fillText(profile?.name || "Procedural City", 62, 84);
      context.font = "500 16px Arial";
      context.fillStyle = "rgba(223,255,229,0.7)";
      context.fillText(`@${profile?.username || "live"}`, 62, 112);
      context.fillText(`Contributions: ${(profile?.totalContributions ?? 0).toLocaleString()}`, 62, 146);
      context.fillText(`Repos: ${(profile?.publicRepos ?? 0).toLocaleString()}`, 62, 170);
      context.fillText(`Stars: ${(profile?.stars ?? 0).toLocaleString()}`, 62, 194);

      if (now - startedAt < durationMs) {
        frameId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(frameId);
        recorder.stop();
      }
    };

    frameId = requestAnimationFrame(draw);
  }

  useEffect(() => {
    if (data) {
      setUsername(data.profile.username);
      applyIncomingData(data);
      return;
    }

    const queryUsername = new URLSearchParams(window.location.search).get("username")?.trim();
    const storedUsername = typeof window !== "undefined" ? window.localStorage.getItem("gitbento:last-username")?.trim() : "";
    const nextUsername = queryUsername || storedUsername || "";

    if (nextUsername) {
      setUsername(nextUsername);
      void handleGenerate(undefined, nextUsername);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <main
      ref={captureRef}
      className={embedded
        ? "relative h-[calc(100vh-12rem)] min-h-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[#05070b] text-white"
        : "relative min-h-screen overflow-hidden bg-[#05070b] text-white"}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 14% 10%, ${theme.roadGlow}18, transparent 28%),
            radial-gradient(circle at 84% 18%, ${theme.accent}18, transparent 22%),
            linear-gradient(180deg, ${theme.skyTop} 0%, ${theme.skyBottom} 100%)`,
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,0,0,0.22)_100%)]" />

      <div className={embedded
        ? "absolute inset-0 overflow-hidden rounded-[34px] bg-black/18 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"
        : "absolute left-6 right-6 top-24 bottom-28 overflow-hidden rounded-[34px] border border-white/10 bg-black/18 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,rgba(0,0,0,0.18))]" />
        <Canvas
          shadows
          dpr={[1, 2]}
          className="absolute inset-0"
          camera={{ position: [0, 12, 18], fov: 36, near: 0.1, far: 320 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: state.cityStyle === "cyberpunk" ? 1.05 : 0.96,
          }}
        >
          <CityScene state={deferredState} contributions={contributions} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0">
        {!embedded ? (
        <motion.nav
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-auto absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-[linear-gradient(180deg,rgba(4,8,12,0.94),rgba(4,8,12,0.74))] backdrop-blur-2xl"
        >
          <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-7">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/10 p-3">
                <Building2 className="size-5 text-emerald-100" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-200/68">City Showcase</p>
                <h1 className="mt-1 text-xl font-black text-white">GitHub Skyline Generator</h1>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-1 items-center justify-end gap-3">
              <label className="flex h-12 min-w-[260px] max-w-[420px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/28 px-4">
                <Search className="size-4 shrink-0 text-white/36" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter GitHub username"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-300 px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:opacity-60"
              >
                {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Aperture className="size-4" />}
                Generate
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </button>
              <button
                type="button"
                onClick={handlePosterExport}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                <Download className="size-4" />
                Poster
              </button>
              <button
                type="button"
                onClick={handleLoopCapture}
                disabled={isRecording}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-cyan-300/16 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18 disabled:opacity-60"
              >
                {isRecording ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                {isRecording ? "Recording..." : "Loop Capture"}
              </button>
            </form>
          </div>
        </motion.nav>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          className={embedded
            ? "pointer-events-auto absolute left-6 top-6 z-10 w-[320px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.84),rgba(6,10,14,0.52))] p-5 backdrop-blur-2xl"
            : "pointer-events-auto absolute left-10 top-28 z-10 w-[340px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.84),rgba(6,10,14,0.52))] p-5 backdrop-blur-2xl"}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/68">Live Profile City</p>
          <h2 className="mt-3 text-4xl font-black leading-none text-white">
            {profile?.name ?? "Generate your skyline"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Profile activity drives density, skyline rhythm, terrain mood, and district balance. Export a poster or record a looping share clip with your stats.
          </p>
          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
        </motion.div>

        <div
          ref={filterRef}
          className={embedded
            ? "pointer-events-auto absolute right-6 top-6 z-20"
            : "pointer-events-auto absolute right-6 top-24 z-20"}
        >
          {embedded ? (
            <button
              type="button"
              onClick={() => setIsFilterOpen((current) => !current)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.88),rgba(6,10,14,0.72))] px-4 text-sm font-semibold text-white backdrop-blur-2xl transition hover:bg-white/[0.1]"
            >
              <SlidersHorizontal className="size-4" />
              Filter
            </button>
          ) : null}

          {isFilterOpen ? (
            <motion.aside
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22 }}
              className="mt-3 max-h-[calc(100vh-8rem)] w-[320px] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.92),rgba(6,10,14,0.72))] p-5 backdrop-blur-2xl shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
            >
              <div className="grid gap-4">
                <Section icon={Palette} title="Style">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.14em] text-white/45">Theme</div>
                    <button
                      type="button"
                      disabled
                      className="flex w-full items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-black text-white">{themeMeta.label}</div>
                        <div className="mt-1 text-xs leading-5 text-white/54">
                          {themeMeta.description}
                        </div>
                      </div>
                      <span className="rounded-full border border-cyan-200/20 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">
                        Active
                      </span>
                    </button>
                  </div>
                  <Segmented
                    label="Preset"
                    value={state.preset}
                    options={[
                      // { value: "neon-megacity", label: "Neon Megacity" },
                      // { value: "balanced-core", label: "Balanced Core" },
                      { value: "industrial-belt", label: "Industrial Belt" },
                      // { value: "residential-area", label: "Residential Area" },
                      // { value: "river-port", label: "River Port" },
                    ]}
                    onChange={(value) => applyPreset(value)}
                  />
                </Section>

                <Section icon={Camera} title="View">
                  <Segmented
                    label="Camera Preset"
                    value={state.viewPreset}
                    options={[
                      { value: "orbit", label: "Orbit" },
                      { value: "overhead", label: "Overhead" },
                      { value: "cinematic", label: "Cinematic" },
                    ]}
                    onChange={(value) => patchState({ viewPreset: value })}
                  />
                </Section>
              </div>
            </motion.aside>
          ) : null}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className={embedded
            ? "pointer-events-auto absolute bottom-6 left-6 right-6 z-10"
            : "pointer-events-auto absolute bottom-6 left-6 right-6 z-10"}
        >
          <div className="grid max-w-[1100px] grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Username", value: profile?.username ?? "live" },
              { label: "Contributions", value: (profile?.totalContributions ?? 0).toLocaleString() },
              { label: "Repos", value: (profile?.publicRepos ?? 0).toLocaleString() },
              { label: "Stars", value: (profile?.stars ?? 0).toLocaleString() },
              { label: "Top Language", value: profile?.topLanguage ?? "Mixed" },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/30 px-4 py-4 backdrop-blur-2xl">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{item.label}</p>
                <p className="mt-2 text-lg font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
