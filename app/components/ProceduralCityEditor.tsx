"use client";
import { toPng } from "html-to-image";
import { Html, MeshReflectorMaterial, OrbitControls, Sphere, Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
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
  isDecorative: boolean;
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

const CAR_MODEL_PATH = "/car.glb";
const TREE_MODEL_PATH = "/tree.glb";
const HAS_CAR_MODEL = false;
const HAS_TREE_MODEL = false;

const TOKYO_NIGHT = {
  background: "#0a0514",
  fog: "#140a2a",
  ground: "#03050d",
  road: "#050711",
  water: "#030712",
  body: "#070a13",
  bodyTrim: "#0d1220",
  neonPurple: "#a855f7",
  neonMagenta: "#ec4899",
  neonCyan: "#06b6d4",
  moon: "#f5f3ff",
  moonGlow: "#d8b4fe",
  ambientBlue: "#60a5fa",
  rimPurple: "#c084fc",
} as const;

const INITIAL_STATE: EditorState = {
  citySize: 28,
  cityDensity: 66,
  blockSize: 5,
  streetPattern: "grid",
  commercial: 32,
  residential: 40,
  industrial: 28,
  averageHeight: 52,
  heightVariance: 34,
  cityStyle: "tokyo-dense",
  riverProbability: 58,
  parksPercent: 4,
  terrainRoughness: 20,
  terrainStyle: "coastline",
  viewPreset: "cinematic",
  preset: "balanced-core",
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
    skyTop: "#0a0514",
    skyBottom: "#190a37",
    fog: "#140a2a",
    ground: "#050814",
    road: "#070a12",
    roadGlow: "#a855f7",
    water: "#060a15",
    park: "#0d1a17",
    commercialBase: "#070b14",
    commercialGlow: "#ec4899",
    residentialBase: "#070b14",
    residentialGlow: "#a855f7",
    industrialBase: "#070b14",
    industrialGlow: "#06b6d4",
    accent: "#c4b5fd",
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

function generateWindowTexture(seed: number, width: number, height: number) {
  const canvas = document.createElement("canvas");
  const cols = clamp(Math.round(width * 2.8), 4, 12);
  const rows = clamp(Math.round(height / 4.2), 8, 28);
  const cellWidth = 22;
  const cellHeight = 22;

  canvas.width = cols * cellWidth;
  canvas.height = rows * cellHeight;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  if (!context) return texture;

  const litChance = clamp(0.42 + seededNoise(seed, 4.2, 1.1) * 0.28, 0.38, 0.72);
  const windowColors = ["#ffffff", "#f9f1ff", "#ffeaff", "#e9fbff"];

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const frameInsetX = 4 + Math.floor(seededNoise(seed + 17, row, col) * 2);
      const frameInsetY = 4 + Math.floor(seededNoise(seed + 31, col, row) * 2);
      const windowWidth = cellWidth - (frameInsetX * 2);
      const windowHeight = cellHeight - (frameInsetY * 2);
      const litNoise = seededNoise(seed, col + 1, row + 1);
      const tintNoise = seededNoise(seed + 91, row + 1, col + 1);
      const isLit = litNoise < litChance && seededNoise(seed + 211, row, col) > 0.16;

      if (isLit) {
        context.fillStyle = windowColors[Math.floor(tintNoise * windowColors.length)];
        context.fillRect(x + frameInsetX, y + frameInsetY, windowWidth, windowHeight);
        context.fillStyle = "rgba(255,255,255,0.34)";
        context.fillRect(x + frameInsetX, y + frameInsetY, windowWidth, Math.max(1, Math.floor(windowHeight * 0.18)));
      }
    }
  }

  for (let row = 1; row < rows; row += 1) {
    context.fillStyle = "rgba(255,255,255,0)";
    context.fillRect(0, row * cellHeight, canvas.width, 1);
  }

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function generateDecorativeFacadeTexture(seed: number, width: number, height: number, baseColor: string, glowColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  if (!context) return texture;

  const base = new THREE.Color(baseColor);
  const facadeShade = `#${base.clone().multiplyScalar(0.86).getHexString()}`;
  const trimShade = `#${base.clone().multiplyScalar(1.06).getHexString()}`;
  const storefrontGlow = new THREE.Color(glowColor).multiplyScalar(1.25);
  const upperWindowColor = seededNoise(seed, width, height) > 0.5 ? "#d8efff" : "#ffd793";

  context.fillStyle = facadeShade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = trimShade;
  context.fillRect(0, 0, canvas.width, 10);
  context.fillRect(0, 104, canvas.width, 8);

  context.fillStyle = "#0a1119";
  context.fillRect(0, 112, canvas.width, 56);

  const bayCount = clamp(Math.round(width * 0.75), 2, 4);
  const bayWidth = Math.floor(canvas.width / bayCount);
  for (let index = 0; index < bayCount; index += 1) {
    const x = index * bayWidth;
    context.globalAlpha = 0.18 + seededNoise(seed + 17, index, 1) * 0.06;
    context.fillStyle = `#${storefrontGlow.getHexString()}`;
    context.fillRect(x + 8, 118, bayWidth - 16, 40);
    context.globalAlpha = 1;
    context.fillStyle = "#0c1620";
    context.fillRect(x + 14, 124, bayWidth - 28, 28);
  }

  const upperWindowCount = clamp(Math.round(height - 1), 1, 2);
  for (let index = 0; index < upperWindowCount; index += 1) {
    const lit = seededNoise(seed + 29, index, 1) > 0.34;
    context.fillStyle = lit ? upperWindowColor : "#111720";
    context.fillRect(32 + index * 70, 42, 28, 16);
  }

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
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

function languageGlowColor(language: string | null, score: number) {
  const normalized = language?.toLowerCase() ?? "";
  if (/(typescript|javascript|tsx|jsx|react|vue|svelte)/.test(normalized)) return TOKYO_NIGHT.neonPurple;
  if (/(python|ruby|html|css|scss|swift|kotlin)/.test(normalized)) return TOKYO_NIGHT.neonMagenta;
  if (/(go|rust|java|c|c\+\+|c#|shell|docker|sql)/.test(normalized)) return TOKYO_NIGHT.neonCyan;
  return score > 0.58 ? TOKYO_NIGHT.neonMagenta : score > 0.32 ? TOKYO_NIGHT.neonPurple : TOKYO_NIGHT.neonCyan;
}

function activityGlowIntensity(score: number, isDecorative: boolean) {
  return isDecorative ? 0.72 : THREE.MathUtils.lerp(2, 5, clamp(score, 0, 1));
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

  return {
    citySize: clamp(18 + Math.round(repos / 5), 18, 36),
    cityDensity: clamp(68 + Math.round(consistency * 0.08), 64, 86),
    blockSize: 4,
    streetPattern: "grid",
    commercial: clamp(24 + Math.round(impact * 0.08), 22, 40),
    residential: clamp(32 + Math.round(diversity * 0.08), 28, 44),
    industrial: clamp(18 + Math.round((100 - consistency) * 0.08), 16, 34),
    averageHeight: clamp(38 + Math.round(contributions / 42), 38, 72),
    heightVariance: clamp(22 + Math.round(stars / 28), 22, 44),
    cityStyle: "tokyo-dense",
    riverProbability: clamp(42 + Math.round(diversity * 0.12), 36, 84),
    parksPercent: clamp(3 + Math.round((100 - impact) * 0.03), 2, 8),
    terrainRoughness: clamp(16 + Math.round(diversity * 0.04), 12, 28),
    terrainStyle: "coastline",
    viewPreset: "cinematic",
    preset: "balanced-core",
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
    const prestigeBoost = activityStrength > 0.68 || scoreStrength > 0.74
      ? THREE.MathUtils.lerp(1.12, 1.32, Math.max(activityStrength, scoreStrength))
      : 1;
    const height = clamp((zoneBaseHeight + (activityStrength * 14) + (scoreStrength * 8.5) + varianceNoise) * averageHeightFactor * prestigeBoost, 4.8, 42);
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
      isDecorative: false,
    });
  });

  const decorativeRepo: RepoHint = {
    name: "Ambient Block",
    url: "#",
    language: null,
    description: "Decorative low-rise block completing the city perimeter.",
  };
  const occupiedPositions = cells.map((cell) => ({
    x: cell.worldX,
    z: cell.worldZ,
    width: cell.width,
    depth: cell.depth,
  }));

  const intersectsRoad = (worldX: number, worldZ: number, width: number, depth: number) => roads.some((road) => (
    Math.abs(road.position[0] - worldX) < (road.size[0] / 2) + (width / 2) + 0.36 &&
    Math.abs(road.position[2] - worldZ) < (road.size[2] / 2) + (depth / 2) + 0.36
  ));

  const canPlaceDecorative = (worldX: number, worldZ: number, width: number, depth: number) => {
    const paddingX = 0.24;
    const paddingZ = 0.24;

    const overlapsCell = occupiedPositions.some((occupied) => (
      Math.abs(occupied.x - worldX) < ((occupied.width + width) / 2) + paddingX &&
      Math.abs(occupied.z - worldZ) < ((occupied.depth + depth) / 2) + paddingZ
    ));

    if (overlapsCell) return false;
    if (intersectsRoad(worldX, worldZ, width, depth)) return false;

    const overlapsPark = parks.some((park) => (
      Math.abs(park.position[0] - worldX) < (park.size[0] / 2) + (width / 2) + 0.8 &&
      Math.abs(park.position[2] - worldZ) < (park.size[2] / 2) + (depth / 2) + 0.8
    ));

    if (overlapsPark) return false;

    const overlapsWater = water.some((strip) => (
      Math.abs(strip.position[0] - worldX) < (strip.size[0] / 2) + (width / 2) + 0.6 &&
      Math.abs(strip.position[2] - worldZ) < (strip.size[2] / 2) + (depth / 2) + 0.6
    ));

    return !overlapsWater;
  };

  const mainCells = cells.filter((cell) => !cell.isDecorative);
  const minClusterX = Math.min(...mainCells.map((cell) => cell.worldX));
  const maxClusterX = Math.max(...mainCells.map((cell) => cell.worldX));
  const minClusterZ = Math.min(...mainCells.map((cell) => cell.worldZ));
  const maxClusterZ = Math.max(...mainCells.map((cell) => cell.worldZ));
  const decorativeStepX = 3.8;
  const decorativeStepZ = 4.2;
  const xSlots = Array.from(new Set(
    mainCells
      .map((cell) => Math.round(cell.worldX / decorativeStepX) * decorativeStepX)
      .filter((value) => value > minClusterX - 3.4 && value < maxClusterX + 3.4),
  )).sort((a, b) => a - b);
  const zSlots = Array.from(new Set(
    mainCells
      .map((cell) => Math.round(cell.worldZ / decorativeStepZ) * decorativeStepZ)
      .filter((value) => value > minClusterZ - 4.2 && value < maxClusterZ + 4.2),
  )).sort((a, b) => a - b);
  const decorativeSlots: Array<{ worldX: number; worldZ: number; zone: ZoneType }> = [];

  zSlots.forEach((worldZ) => {
    decorativeSlots.push({ worldX: minClusterX - 3.6, worldZ, zone: "commercial" });
    decorativeSlots.push({ worldX: maxClusterX + 3.6, worldZ, zone: "industrial" });
  });

  xSlots.forEach((worldX) => {
    decorativeSlots.push({ worldX, worldZ: minClusterZ - 4.1, zone: "commercial" });
    decorativeSlots.push({ worldX, worldZ: maxClusterZ + 4.1, zone: "residential" });
  });

  decorativeSlots.forEach((slot, index) => {
    const zone = slot.zone;
    const width = zone === "industrial" ? 3.6 : zone === "residential" ? 3.2 : 3.35;
    const depth = zone === "industrial" ? 2.55 : 2.25;
    const height = 1.5 + seededNoise(1203, index, 1) * 2;
    const worldX = clamp(slot.worldX, -halfWidth + 5.2, halfWidth - 5.2);
    const worldZ = clamp(slot.worldZ, -halfDepth + 5.6, halfDepth - 5.6);

    if (!canPlaceDecorative(worldX, worldZ, width, depth)) return;

    const decorativeCell: Cell = {
      x: buildingCount + index,
      z: index,
      worldX,
      worldZ,
      road: false,
      water: false,
      park: false,
      zone,
      height,
      width,
      depth,
      tower: false,
      seed: (buildingCount + index + 1) * 1499,
      contributionCount: 0,
      lightBands: clamp(Math.round(3 + seededNoise(1206, index, 1) * 4), 3, 6),
      lightStrength: clamp(0.2 + seededNoise(1207, index, 1) * 0.22, 0.18, 0.42),
      repo: decorativeRepo,
      date: "Ambient district",
      stars: 0,
      forks: 0,
      activityScore: 0.08,
      isDecorative: true,
    };

    cells.push(decorativeCell);
    occupiedPositions.push({
      x: decorativeCell.worldX,
      z: decorativeCell.worldZ,
      width: decorativeCell.width,
      depth: decorativeCell.depth,
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
      target.current.set(0, cameraSpan * 0.13, -Math.min(bounds.depth * 0.08, 8));
      nextPosition.set(cameraSpan * 0.14, cameraSpan * 0.14, cameraSpan * 0.25);
      if (perspectiveCamera) perspectiveCamera.fov = 34;
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
  const span = Math.max(bounds.width, bounds.depth);
  const groundRadius = span * 4.8;
  const plinthRadius = span * 0.66;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[groundRadius, 128]} />
        <MeshReflectorMaterial
          color="#01030a"
          blur={[700, 180]}
          mixBlur={1}
          mixStrength={1.35}
          roughness={0.24}
          metalness={0.92}
          mirror={0.62}
          resolution={1024}
          depthScale={0.34}
          minDepthThreshold={0.88}
          maxDepthThreshold={1.32}
        />
      </mesh>

      <mesh position={[0, -0.48, 0]} scale={[1.18, 1, 0.72]} receiveShadow>
        <cylinderGeometry args={[plinthRadius, plinthRadius * 1.06, 0.78, 96]} />
        <meshStandardMaterial
          color="#030511"
          emissive={theme.roadGlow}
          emissiveIntensity={0.018}
          roughness={0.34}
          metalness={0.72}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <ringGeometry args={[plinthRadius * 0.64, plinthRadius * 0.67, 128]} />
        <meshBasicMaterial
          color={new THREE.Color(theme.roadGlow).multiplyScalar(1.4)}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function TokyoStarField({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
  const span = Math.max(bounds.width, bounds.depth);
  const starTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    if (!context) return texture;

    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.28, "rgba(255,245,255,0.82)");
    gradient.addColorStop(0.62, "rgba(190,150,255,0.2)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const softStars = useMemo(() => {
    const count = 760;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      positions[i] = (seededNoise(441, index, 1) - 0.5) * span * 5.2;
      positions[i + 1] = 26 + seededNoise(442, index, 2) * 56;
      positions[i + 2] = -bounds.depth * 0.75 - seededNoise(443, index, 3) * span * 2.6;
    }

    return positions;
  }, [bounds.depth, span]);

  const brightStars = useMemo(() => {
    const count = 96;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      positions[i] = (seededNoise(551, index, 1) - 0.5) * span * 4.4;
      positions[i + 1] = 32 + seededNoise(552, index, 2) * 46;
      positions[i + 2] = -bounds.depth * 0.86 - seededNoise(553, index, 3) * span * 2.1;
    }

    return positions;
  }, [bounds.depth, span]);

  const accentStars = useMemo(() => {
    const count = 38;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      positions[i] = (seededNoise(661, index, 1) - 0.5) * span * 4.2;
      positions[i + 1] = 30 + seededNoise(662, index, 2) * 48;
      positions[i + 2] = -bounds.depth * 0.82 - seededNoise(663, index, 3) * span * 2.1;
    }

    return positions;
  }, [bounds.depth, span]);

  useEffect(() => {
    return () => starTexture.dispose();
  }, [starTexture]);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[softStars, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#f7e8ff"
          map={starTexture}
          alphaTest={0.02}
          size={1.9}
          sizeAttenuation={false}
          transparent
          opacity={0.64}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[brightStars, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          map={starTexture}
          alphaTest={0.02}
          size={2.45}
          sizeAttenuation={false}
          transparent
          opacity={0.82}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[accentStars, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={theme.roadGlow}
          map={starTexture}
          alphaTest={0.02}
          size={2.15}
          sizeAttenuation={false}
          transparent
          opacity={0.54}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function DistantSkyline({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
  const span = Math.max(bounds.width, bounds.depth);
  const towers = useMemo(() => (
    Array.from({ length: 58 }, (_, index) => {
      const band = index % 2;
      const x = -span * 1.42 + (index / 57) * span * 2.84 + (seededNoise(781, index, 1) - 0.5) * 2.4;
      const height = 1.8 + seededNoise(782, index, 2) * (band === 0 ? 7.5 : 4.8);
      const width = 0.8 + seededNoise(783, index, 3) * 1.5;
      const depth = 0.55 + seededNoise(784, index, 4) * 0.8;
      const z = -bounds.depth * 0.72 - band * 4.8 - seededNoise(785, index, 5) * 4.2;
      const glow = seededNoise(786, index, 6) > 0.58 ? TOKYO_NIGHT.neonCyan : theme.roadGlow;

      return { x, z, width, depth, height, glow, seed: index };
    })
  ), [bounds.depth, span, theme.roadGlow]);

  return (
    <group>
      {towers.map((tower) => (
        <group key={`distant-${tower.seed}`} position={[tower.x, tower.height / 2 - 0.04, tower.z]}>
          <mesh>
            <boxGeometry args={[tower.width, tower.height, tower.depth]} />
            <meshStandardMaterial
              color="#050713"
              emissive="#100724"
              emissiveIntensity={0.12}
              roughness={0.38}
              metalness={0.68}
            />
          </mesh>
          {Array.from({ length: clamp(Math.round(tower.height / 2), 1, 4) }, (_, row) => (
            <mesh
              key={`distant-window-${row}`}
              position={[
                (seededNoise(791, tower.seed, row) - 0.5) * tower.width * 0.3,
                -tower.height * 0.34 + row * Math.max(0.55, tower.height * 0.16),
                (tower.depth / 2) + 0.012,
              ]}
            >
              <boxGeometry args={[tower.width * 0.42, 0.07, 0.025]} />
              <meshBasicMaterial
                color={tower.glow}
                transparent
                opacity={0.42}
                toneMapped={false}
              />
            </mesh>
          ))}
          {seededNoise(792, tower.seed, 1) > 0.68 ? (
            <mesh position={[0, tower.height / 2 + 0.28, 0]}>
              <cylinderGeometry args={[0.012, 0.018, 0.58, 5]} />
              <meshBasicMaterial color={tower.glow} transparent opacity={0.48} toneMapped={false} />
            </mesh>
          ) : null}
        </group>
      ))}
      <mesh position={[0, 1.15, -bounds.depth * 0.84]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span * 3.25, span * 0.34]} />
        <meshBasicMaterial
          color="#140828"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          toneMapped={false}
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
    if (lightRef.current?.material instanceof THREE.MeshStandardMaterial) {
      lightRef.current.material.emissive.set(activeColor);
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
        <meshStandardMaterial color="#1a1d22" emissive={theme.roadGlow} emissiveIntensity={2.2} toneMapped={false} />
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
  const glyphColor = useMemo(() => new THREE.Color(theme.roadGlow).multiplyScalar(2.4), [theme.roadGlow]);
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
          <meshBasicMaterial color={glyphColor} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
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
        <boxGeometry args={[car.length * 1.28, 0.03, car.width * 1.82]} />
        <meshStandardMaterial color="#10151d" emissive={car.glowColor} emissiveIntensity={1.8} transparent opacity={0.24} />
      </mesh>
      {HAS_CAR_MODEL ? <CarModel car={car} /> : <PrimitiveCar car={car} />}
    </group>
  );
}

function ParkTree({
  position,
  scale = 0.52,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  if (!HAS_TREE_MODEL) {
    return (
      <group position={position} scale={[scale, scale, scale]}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.34, 8]} />
          <meshStandardMaterial color="#4a3424" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color="#587f45" emissive="#294120" emissiveIntensity={0.08} roughness={0.92} />
        </mesh>
      </group>
    );
  }

  return <TreeModel position={position} scale={scale} />;
}

function CarModel({
  car,
}: {
  car: CarInstance;
}) {
  const { scene } = useGLTF(CAR_MODEL_PATH);
  const carModel = useMemo(() => {
    const instance = scene.clone(true);
    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z, 0.001);
    const scaleFactor = car.length / footprint;

    instance.position.sub(center);
    instance.position.y += size.y / 2;
    instance.scale.setScalar(scaleFactor);
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return instance;
  }, [car.length, scene]);

  return <primitive object={carModel} />;
}

function PrimitiveCar({
  car,
}: {
  car: CarInstance;
}) {
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[car.length, 0.18, car.width]} />
        <meshStandardMaterial color={car.bodyColor} emissive={car.bodyColor} emissiveIntensity={1.2} roughness={0.42} metalness={0.24} />
      </mesh>
      <mesh position={[-0.02, 0.16, 0]} castShadow>
        <boxGeometry args={[car.length * 0.56, 0.16, car.width * 0.82]} />
        <meshStandardMaterial color="#e8eef7" emissive="#f4f8ff" emissiveIntensity={1.35} roughness={0.18} metalness={0.3} />
      </mesh>
      <mesh position={[car.length * 0.48, 0.01, car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#14181f" emissive={car.glowColor} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[car.length * 0.48, 0.01, -car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#14181f" emissive={car.glowColor} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[-car.length * 0.48, 0.01, car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#191313" emissive="#ff6a5f" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[-car.length * 0.48, 0.01, -car.width * 0.19]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
        <meshStandardMaterial color="#191313" emissive="#ff6a5f" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {[-car.length * 0.28, car.length * 0.28].map((wheelX) => (
        [-car.width * 0.36, car.width * 0.36].map((wheelZ) => (
          <mesh key={`${wheelX}-${wheelZ}`} position={[wheelX, -0.12, wheelZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="#0f1115" />
          </mesh>
        ))
      ))}
    </>
  );
}

function TreeModel({
  position,
  scale = 0.52,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF(TREE_MODEL_PATH);
  const treeModel = useMemo(() => {
    const instance = scene.clone(true);
    const box = new THREE.Box3().setFromObject(instance);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const height = Math.max(size.y, 0.001);
    const scaleFactor = scale / height;

    instance.position.sub(center);
    instance.position.y += size.y / 2;
    instance.scale.setScalar(scaleFactor);
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return instance;
  }, [scale, scene]);

  return (
    <group position={position}>
      <primitive object={treeModel} />
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
  const isDecorative = cell.isDecorative;
  const isResidential = cell.zone === "residential";
  const lotColor = isDecorative
    ? "#0b1018"
    : isResidential ? "#06120f" : cell.zone === "industrial" ? "#090b12" : "#080c15";
  const stripColor = isDecorative ? "#111827" : isResidential ? "#092018" : "#0c1724";
  const curbColor = isDecorative ? theme.accent : index % 2 === 0 ? theme.roadGlow : TOKYO_NIGHT.neonMagenta;
  const sidewalkColor = isDecorative ? "#111827" : "#0d1320";

  return (
    <group position={[cell.worldX, 0.005, cell.worldZ]}>
      <mesh receiveShadow>
        <boxGeometry args={[lotWidth, 0.04, lotDepth]} />
        <meshStandardMaterial
          color={lotColor}
          emissive={lotColor}
          emissiveIntensity={isDecorative ? 0.02 : 0.06}
          roughness={0.62}
          metalness={isResidential ? 0.08 : 0.34}
        />
      </mesh>
      {isDecorative ? (
        <>
          <group position={[0, 0.038, lotDepth * 0.38]}>
            <mesh receiveShadow>
              <boxGeometry args={[lotWidth * 0.94, 0.05, 0.54]} />
              <meshStandardMaterial color={sidewalkColor} roughness={0.9} metalness={0.04} />
            </mesh>
          </group>
          {[-0.34, 0.34].map((offsetX, treeIndex) => (
            <group key={`decor-tree-${treeIndex}`} position={[lotWidth * offsetX, 0.04, lotDepth * 0.22]}>
              <ParkTree position={[0, 0, 0]} scale={0.34 + treeIndex * 0.04} />
            </group>
          ))}
          <group position={[0, 0.038, -lotDepth * 0.34]}>
            <mesh receiveShadow>
              <boxGeometry args={[lotWidth * 0.88, 0.045, 0.28]} />
              <meshStandardMaterial color="#111827" roughness={0.62} metalness={0.46} />
            </mesh>
          </group>
        </>
      ) : null}
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
            color={isDecorative ? sidewalkColor : "#0d1320"}
            emissive={curbColor}
            emissiveIntensity={isDecorative ? 0.04 : curbIndex < 2 ? 0.12 : 0.06}
            roughness={0.24}
            metalness={0.7}
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

function BuildingShell({
  cell,
  baseColor,
  glowColor,
}: {
  cell: Cell;
  baseColor: string;
  glowColor: string;
}) {
  const facadeTexture = useMemo(
    () => cell.isDecorative
      ? generateDecorativeFacadeTexture(cell.seed, cell.width, cell.height, baseColor, glowColor)
      : generateWindowTexture(cell.seed, Math.max(cell.width, cell.depth), cell.height),
    [baseColor, cell.depth, cell.height, cell.isDecorative, cell.seed, cell.width, glowColor],
  );

  const emissiveColor = useMemo(
    () => new THREE.Color(cell.isDecorative ? glowColor : languageGlowColor(cell.repo.language, cell.activityScore)),
    [cell.activityScore, cell.isDecorative, cell.repo.language, glowColor],
  );

  const emissiveIntensity = useMemo(
    () => activityGlowIntensity(cell.activityScore, cell.isDecorative),
    [cell.activityScore, cell.isDecorative],
  );
  const isPrestigeTower = !cell.isDecorative && (cell.activityScore > 0.62 || cell.contributionCount > 8);
  const silhouette = useMemo(() => {
    const variant = Math.floor(seededNoise(cell.seed, 2.7, 8.9) * 4);
    const lowerHeight = cell.height * (variant === 0 ? 0.62 : variant === 1 ? 0.54 : 0.5);
    const middleHeight = cell.height * (variant === 2 ? 0.34 : 0.28);
    const crownHeight = Math.max(0.32, cell.height - lowerHeight - middleHeight);
    const topScale = variant === 3 ? 0.54 : variant === 1 ? 0.66 : 0.76;
    const middleScale = variant === 0 ? 0.88 : 0.78;

    return {
      variant,
      lowerHeight,
      middleHeight,
      crownHeight,
      middleScale,
      topScale,
      sideFinHeight: cell.height * (0.46 + seededNoise(cell.seed, 11, 2) * 0.22),
    };
  }, [cell.height, cell.seed]);

  const buildingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#02030a",
      emissiveMap: facadeTexture,
      emissive: emissiveColor,
      emissiveIntensity,
      roughness: 0.32,
      metalness: 0.86,
      envMapIntensity: 0.55,
      toneMapped: false,
    });
  }, [emissiveColor, emissiveIntensity, facadeTexture]);

  useEffect(() => {
    return () => buildingMaterial.dispose();
  }, [buildingMaterial]);

  useEffect(() => {
    return () => facadeTexture.dispose();
  }, [facadeTexture]);

  return (
    <group>
      {cell.isDecorative ? (
        <mesh castShadow receiveShadow material={buildingMaterial}>
          <boxGeometry args={[cell.width, cell.height, cell.depth]} />
        </mesh>
      ) : (
        <>
          <mesh
            castShadow
            receiveShadow
            material={buildingMaterial}
            position={[0, (-cell.height / 2) + (silhouette.lowerHeight / 2), 0]}
          >
            <boxGeometry args={[cell.width, silhouette.lowerHeight, cell.depth]} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            material={buildingMaterial}
            position={[
              cell.width * (silhouette.variant === 1 ? 0.08 : silhouette.variant === 2 ? -0.06 : 0),
              (-cell.height / 2) + silhouette.lowerHeight + (silhouette.middleHeight / 2),
              cell.depth * (silhouette.variant === 3 ? 0.08 : 0),
            ]}
          >
            <boxGeometry args={[cell.width * silhouette.middleScale, silhouette.middleHeight, cell.depth * (silhouette.middleScale + 0.04)]} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            material={buildingMaterial}
            position={[
              cell.width * (silhouette.variant === 1 ? -0.05 : 0.04),
              (cell.height / 2) - (silhouette.crownHeight / 2),
              cell.depth * (silhouette.variant === 2 ? -0.07 : 0.02),
            ]}
          >
            <boxGeometry args={[cell.width * silhouette.topScale, silhouette.crownHeight, cell.depth * Math.max(0.5, silhouette.topScale - 0.02)]} />
          </mesh>

          {[1, -1].map((side) => (
            <mesh
              key={`fin-x-${side}`}
              position={[
                side * cell.width * 0.56,
                (-cell.height / 2) + (silhouette.sideFinHeight / 2) + cell.height * 0.08,
                cell.depth * 0.02,
              ]}
              castShadow
            >
              <boxGeometry args={[0.08, silhouette.sideFinHeight, cell.depth * 0.74]} />
              <meshStandardMaterial
                color={TOKYO_NIGHT.bodyTrim}
                emissive="#02030a"
                emissiveIntensity={0.08}
                metalness={0.94}
                roughness={0.14}
              />
            </mesh>
          ))}

          {[
            [-(cell.width / 2) - 0.015, 0, (cell.depth / 2) + 0.018, 0.034, cell.height * 0.92, 0.034],
            [(cell.width / 2) + 0.015, 0, (cell.depth / 2) + 0.018, 0.034, cell.height * 0.92, 0.034],
            [0, (cell.height / 2) - 0.035, (cell.depth / 2) + 0.02, cell.width * 0.86, 0.045, 0.035],
            [0, (-cell.height / 2) + 0.2, (cell.depth / 2) + 0.02, cell.width * 0.92, 0.045, 0.035],
            [-(cell.width / 2) - 0.012, 0, -(cell.depth / 2) - 0.012, 0.025, cell.height * 0.72, 0.025],
            [(cell.width / 2) + 0.012, 0, -(cell.depth / 2) - 0.012, 0.025, cell.height * 0.72, 0.025],
          ].map(([x, y, z, width, height, depth], edgeIndex) => (
            <mesh key={`edge-${edgeIndex}`} position={[x, y, z]}>
              <boxGeometry args={[width, height, depth]} />
              <meshBasicMaterial
                color={emissiveColor}
                transparent
                opacity={edgeIndex < 4 ? (isPrestigeTower ? 0.74 : 0.48) : 0.24}
                toneMapped={false}
              />
            </mesh>
          ))}

          {[0.22, 0.52, 0.78].map((heightRatio, beltIndex) => (
            <mesh
              key={`neon-belt-${beltIndex}`}
              position={[0, (-cell.height / 2) + (cell.height * heightRatio), (cell.depth / 2) + 0.012]}
            >
              <boxGeometry args={[cell.width * (0.46 + beltIndex * 0.1), 0.032, 0.028]} />
              <meshBasicMaterial color={emissiveColor} transparent opacity={0.62} toneMapped={false} />
            </mesh>
          ))}

          <mesh position={[0, cell.height / 2 + 0.04, 0]} castShadow>
            <boxGeometry args={[cell.width * 0.76, 0.08, cell.depth * 0.76]} />
            <meshStandardMaterial
              color="#03040c"
              emissive="#050615"
              emissiveIntensity={0.12}
              metalness={0.92}
              roughness={0.16}
            />
          </mesh>
          <mesh position={[0, cell.height / 2 + 0.1, (cell.depth * 0.38)]}>
            <boxGeometry args={[cell.width * 0.62, 0.035, 0.04]} />
            <meshBasicMaterial color={emissiveColor} transparent opacity={0.72} toneMapped={false} />
          </mesh>

          {cell.tower || silhouette.variant > 1 ? (
            <mesh position={[cell.width * 0.18, cell.height / 2 + 0.5, cell.depth * -0.12]}>
              <cylinderGeometry args={[0.025, 0.04, 0.96, 6]} />
              <meshStandardMaterial
                color={TOKYO_NIGHT.bodyTrim}
                emissive={emissiveColor}
                emissiveIntensity={Math.max(1.6, emissiveIntensity * 0.55)}
                metalness={0.9}
                roughness={0.18}
                toneMapped={false}
              />
            </mesh>
          ) : null}
          {isPrestigeTower ? (
            <group position={[0, cell.height / 2 + 0.46, 0]}>
              <mesh>
                <boxGeometry args={[cell.width * 0.48, 0.11, cell.depth * 0.48]} />
                <meshStandardMaterial
                  color="#03040b"
                  emissive="#050615"
                  emissiveIntensity={0.1}
                  roughness={0.14}
                  metalness={0.94}
                />
              </mesh>
              <mesh position={[0, 0.08, cell.depth * 0.26]}>
                <boxGeometry args={[cell.width * 0.44, 0.035, 0.035]} />
                <meshBasicMaterial color={emissiveColor} transparent opacity={0.86} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0.62, -cell.depth * 0.04]}>
                <cylinderGeometry args={[0.018, 0.032, 1.04, 6]} />
                <meshBasicMaterial color={emissiveColor} transparent opacity={0.8} toneMapped={false} />
              </mesh>
            </group>
          ) : null}
        </>
      )}
    </group>
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
      <color attach="background" args={[TOKYO_NIGHT.background]} />
      <fog attach="fog" args={[TOKYO_NIGHT.fog, 28, 170]} />

      <CameraDirector viewPreset={state.viewPreset} bounds={model.bounds} controlsRef={controlsRef} />

      <Stars radius={190} depth={100} count={1400} factor={2.2} saturation={0.18} fade speed={0.12} />
      <TokyoStarField bounds={model.bounds} theme={theme} />
      <ambientLight intensity={0.08} color={TOKYO_NIGHT.ambientBlue} />
      <directionalLight position={[22, 28, 12]} intensity={0.24} color={TOKYO_NIGHT.rimPurple} castShadow />
      <Sphere args={[1.45, 48, 48]} position={[model.bounds.width * 0.34, 24, -model.bounds.depth * 0.48]}>
        <meshStandardMaterial color={TOKYO_NIGHT.moon} emissive={TOKYO_NIGHT.moonGlow} emissiveIntensity={2.8} toneMapped={false} />
      </Sphere>
      <DistantSkyline bounds={model.bounds} theme={theme} />

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
        <mesh
          key={`water-${index}`}
          position={[strip.position[0], strip.position[1] + 0.03, strip.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[strip.size[0], strip.size[2]]} />
          <MeshReflectorMaterial
            color={TOKYO_NIGHT.water}
            blur={[500, 100]}
            mixBlur={1}
            mixStrength={1.5}
            roughness={0.2}
            metalness={0.86}
            mirror={0.88}
            resolution={1024}
            depthScale={0.45}
            minDepthThreshold={0.82}
            maxDepthThreshold={1.2}
          />
        </mesh>
      ))}

      {model.parks.map((park, index) => (
        <group key={`park-${index}`} position={park.position}>
          <mesh receiveShadow>
            <boxGeometry args={park.size} />
            <meshStandardMaterial color={theme.park} emissive={theme.park} emissiveIntensity={0.06} />
          </mesh>
          {[-0.32, 0.24].map((offsetX, treeIndex) => (
            <ParkTree
              key={`${offsetX}-${treeIndex}`}
              position={[offsetX, 0.02, 0.12]}
              scale={0.62 + treeIndex * 0.06}
            />
          ))}
        </group>
      ))}

      {model.cells.map((cell, index) => (
        <BuildingLot key={`lot-${cell.x}-${cell.z}`} cell={cell} index={index} theme={theme} />
      ))}

      {model.roads.map((road, index) => (
        <group key={`road-${index}`} position={road.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
            <planeGeometry args={[road.size[0], road.size[2]]} />
            <MeshReflectorMaterial
              color={TOKYO_NIGHT.road}
              blur={[500, 100]}
              mixBlur={1}
              mixStrength={1.5}
              roughness={0.2}
              metalness={0.92}
              mirror={0.5}
              resolution={1024}
              depthScale={0.35}
              minDepthThreshold={0.8}
              maxDepthThreshold={1.2}
            />
          </mesh>
          {road.axis !== "junction" ? (
            <>
              <mesh position={[0, 0.028, 0]} receiveShadow>
                <boxGeometry args={[road.axis === "x" ? road.size[0] : road.size[0] * 0.28, 0.012, road.axis === "x" ? road.size[2] * 0.28 : road.size[2]]} />
                <meshStandardMaterial color="#04060c" roughness={0.28} metalness={0.82} />
              </mesh>
              <RoadGlyphs road={road} theme={theme} />
            </>
          ) : (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.036, 0]}>
                <ringGeometry args={[road.size[0] * 0.08, road.size[0] * 0.18, 18]} />
                <meshBasicMaterial
                  color={new THREE.Color(theme.roadGlow).multiplyScalar(2.1)}
                  transparent
                  opacity={0.24}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
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
            <BuildingShell
              cell={cell}
              baseColor={baseColor}
              glowColor={glowColor}
            />
            <mesh position={[0, -cell.height / 2 + 0.28, 0]} castShadow receiveShadow>
              <boxGeometry args={[cell.width * 1.08, 0.56, cell.depth * 1.08]} />
              <meshStandardMaterial
                color="#080c14"
                emissive="#070a12"
                emissiveIntensity={0.04}
                roughness={0.24}
                metalness={0.78}
              />
            </mesh>
            <mesh position={[0, cell.height / 2 - 0.08, 0]} castShadow>
              <boxGeometry args={[cell.width * 1.02, 0.12, cell.depth * 1.02]} />
              <meshStandardMaterial
                color="#03040b"
                emissive="#050615"
                emissiveIntensity={0.08}
                roughness={0.18}
                metalness={0.88}
              />
            </mesh>
            {cell.tower ? (
              <mesh position={[0, cell.height / 2 + 0.34, 0]} castShadow>
                <boxGeometry args={[cell.width * 0.72, 0.52, cell.depth * 0.72]} />
                <meshStandardMaterial
                  color="#03040b"
                  emissive="#050615"
                  emissiveIntensity={0.08}
                  roughness={0.18}
                  metalness={0.9}
                />
              </mesh>
            ) : null}
            {!cell.isDecorative && state.cityStyle !== "cyberpunk" && hoveredCell === cellId ? <BuildingHoverCard cell={cell} /> : null}
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
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
      </EffectComposer>
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

if (HAS_CAR_MODEL) {
  useGLTF.preload(CAR_MODEL_PATH);
}

if (HAS_TREE_MODEL) {
  useGLTF.preload(TREE_MODEL_PATH);
}
