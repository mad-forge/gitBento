"use client";
import { toPng } from "html-to-image";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
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
type PresetName = "balanced-core" | "industrial-belt" | "residential-area" | "river-port";
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

type Cell = {
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  road: boolean;
  water: boolean;
  park: boolean;
  zone: ZoneType;
  height: number;
  width: number;
  depth: number;
  tower: boolean;
  seed: number;
  contributionCount: number;
  lightBands: number;
  lightStrength: number;
  repo: RepoHint | null;
  date: string;
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

type ContributionSignal = {
  date: string;
  count: number;
  repo: RepoHint | null;
};

type RepoHint = {
  name: string;
  url: string;
  language: string | null;
  description: string | null;
};

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
  cityStyle: "tokyo-dense",
  riverProbability: 34,
  parksPercent: 12,
  terrainRoughness: 24,
  terrainStyle: "coastline",
  viewPreset: "orbit",
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
    skyTop: "#0b1220",
    skyBottom: "#202d45",
    fog: "#212a3f",
    ground: "#161d2a",
    road: "#0d131c",
    roadGlow: "#5b8db8",
    water: "#173652",
    park: "#223628",
    commercialBase: "#2d4268",
    commercialGlow: "#8fd3ff",
    residentialBase: "#39465c",
    residentialGlow: "#ffe6a8",
    industrialBase: "#2f3442",
    industrialGlow: "#ffb06f",
    accent: "#f3f5ff",
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

const PRESET_PATCHES: Record<PresetName, Partial<EditorState>> = {
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
    cityStyle: "tokyo-dense",
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
    return seededNoise(cell.seed + 301, rowIndex, colIndex) > 0.45 ? "#9ed8ff" : "#d7ecff";
  }

  if (cell.zone === "industrial") {
    return seededNoise(cell.seed + 302, rowIndex, colIndex) > 0.5 ? "#ffb978" : "#ffdca6";
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

function buildContributionSignals(data: GitBentoData): ContributionSignal[] {
  const repoDirectory = new Map<string, RepoHint>();

  data.topRepositories.forEach((repo) => {
    repoDirectory.set(repo.name.toLowerCase(), {
      name: repo.name,
      url: repo.url,
      language: repo.language,
      description: repo.description,
    });
  });

  data.recentlyUpdated.forEach((repo) => {
    const key = repo.name.toLowerCase();
    if (!repoDirectory.has(key)) {
      repoDirectory.set(key, {
        name: repo.name,
        url: `https://github.com/${data.profile.username}/${repo.name}`,
        language: repo.language,
        description: null,
      });
    }
  });

  const activityByDate = new Map<string, RepoHint[]>();
  data.recentActivity.forEach((activity) => {
    const date = activity.createdAt.slice(0, 10);
    const repoName = activity.repo.split("/").pop() ?? activity.repo;
    const key = repoName.toLowerCase();
    const repoHint = repoDirectory.get(key) ?? {
      name: repoName,
      url: `https://github.com/${activity.repo}`,
      language: null,
      description: null,
    };

    const list = activityByDate.get(date) ?? [];
    list.push(repoHint);
    activityByDate.set(date, list);
  });

  const fallbackRepos = Array.from(repoDirectory.values());

  return data.contributionCalendar?.weeks
    .flatMap((week) =>
      week.contributionDays.map((day, index) => {
        const dateRepos = activityByDate.get(day.date);
        const fallbackRepo = fallbackRepos.length > 0 ? fallbackRepos[index % fallbackRepos.length] : null;
        return {
          date: day.date,
          count: day.contributionCount,
          repo: dateRepos?.[0] ?? fallbackRepo,
        };
      }),
    )
    .slice(-365) ?? [];
}

function patchStateFromProfile(data: GitBentoData): Partial<EditorState> {
  const contributions = data.contributionCalendar?.totalContributions ?? data.rpg.totalSignals;
  const stars = data.totals.stars;
  const repos = data.totals.publicRepos;
  const impact = data.rpg.stats.impact;
  const diversity = data.rpg.stats.diversity;
  const consistency = data.rpg.stats.consistency;
  const nightSignals = data.rpg.nightSignals;
  const topLanguage = data.topLanguages[0]?.name?.toLowerCase() ?? "";

  return {
    citySize: clamp(18 + Math.round(repos / 4), 18, 40),
    cityDensity: clamp(38 + Math.round(consistency * 0.55), 35, 96),
    blockSize: clamp(3 + Math.round(diversity / 30), 2, 7),
    streetPattern: diversity > 58 ? "organic" : consistency > 78 ? "grid" : "radial",
    commercial: clamp(20 + Math.round(impact * 0.32), 10, 70),
    residential: clamp(26 + Math.round(consistency * 0.28), 10, 70),
    industrial: clamp(16 + Math.round((repos + stars) / 25), 8, 64),
    averageHeight: clamp(22 + Math.round(contributions / 26), 24, 94),
    heightVariance: clamp(10 + Math.round((nightSignals + stars) / 18), 8, 68),
    cityStyle: "tokyo-dense",
    riverProbability: clamp(18 + Math.round(diversity * 0.22), 0, 92),
    parksPercent: clamp(8 + Math.round((100 - impact) * 0.12), 4, 28),
    terrainRoughness: clamp(12 + Math.round(diversity * 0.18), 4, 76),
    terrainStyle: data.profile.location ? "coastline" : "mountains",
  };
}

function buildCityModel(state: EditorState, contributions: ContributionSignal[]) {
  const size = state.citySize;
  const spacing = 1.72;
  const stride = clamp(Math.round(state.blockSize), 2, 7) + 1;
  const density = state.cityDensity / 100;
  const riverChance = state.riverProbability / 100;
  const parkChance = state.parksPercent / 100;
  const roughness = state.terrainRoughness / 100;
  const balances = normalizeBalances(state);
  const roads: RoadSegment[] = [];
  const cars: CarInstance[] = [];
  const parks: ParkPatch[] = [];
  const water: WaterStrip[] = [];
  const ridges: TerrainRidge[] = [];
  const cells: Cell[] = [];
  const half = ((size - 1) * spacing) / 2;
  const bounds = { width: size * spacing, depth: size * spacing };
  const riverEnabled = state.terrainStyle === "coastline" || riverChance > 0.18;
  const waterSeed = size * 97 + state.averageHeight;
  const riverAmplitude = 1.5 + (riverChance * 4);
  const riverWidth = 0.68 + (riverChance * 1.2);
  const radialRoadRadius = Math.max(4, Math.round(size * 0.22));
  const edgeRoadInset = 1;
  const activeSignals = contributions.filter((entry) => entry.count > 0);
  const contributionFeed = activeSignals.length > 0 ? activeSignals : contributions;
  const maxContribution = Math.max(1, ...contributionFeed.map((entry) => entry.count));
  let contributionIndex = 0;

  const isRoadCell = (x: number, z: number) => {
    if (x === edgeRoadInset || z === edgeRoadInset || x === size - edgeRoadInset - 1 || z === size - edgeRoadInset - 1) {
      return true;
    }

    if (state.streetPattern === "grid") {
      return x % stride === 0 || z % stride === 0;
    }

    if (state.streetPattern === "organic") {
      const organicMask = fbm(31, x * 0.18, z * 0.18, 3);
      return x % stride === 0 || z % stride === 0 || organicMask > 0.78;
    }

    const cx = x - (size / 2);
    const cz = z - (size / 2);
    const angle = Math.atan2(cz, cx);
    const distance = Math.sqrt((cx * cx) + (cz * cz));
    const ring = Math.abs(distance - radialRoadRadius) < 1 || Math.abs(distance - (radialRoadRadius * 1.75)) < 1;
    const spoke = Math.abs(Math.sin(angle * 3)) < 0.12 || Math.abs(Math.cos(angle * 2)) < 0.12;
    return ring || spoke || x % (stride + 1) === 0;
  };

  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const worldX = (x * spacing) - half;
      const worldZ = (z * spacing) - half;
      const centerX = x - (size / 2);
      const centerZ = z - (size / 2);
      const centerDistance = Math.sqrt((centerX * centerX) + (centerZ * centerZ)) / (size / 1.9);
      const road = isRoadCell(x, z);
      const riverLine = riverEnabled
        ? Math.sin((x / size) * Math.PI * 2 + (waterSeed * 0.01)) * riverAmplitude
        : 1000;
      const waterHere = riverEnabled && Math.abs(centerZ - riverLine) < riverWidth && fbm(waterSeed, x * 0.17, z * 0.17, 2) > (0.38 - riverChance * 0.12);

      if (road) {
        const horizontalRoad = isRoadCell(Math.max(0, x - 1), z) || isRoadCell(Math.min(size - 1, x + 1), z);
        const verticalRoad = isRoadCell(x, Math.max(0, z - 1)) || isRoadCell(x, Math.min(size - 1, z + 1));
        const axis: RoadAxis = horizontalRoad && !verticalRoad ? "x" : verticalRoad && !horizontalRoad ? "z" : "junction";
        roads.push({
          axis,
          position: [worldX, 0.02, worldZ],
          size: [spacing * 0.92, 0.05, spacing * 0.92],
        });

        const trafficNoise = fbm(1601, x * 0.27, z * 0.27, 2);
        const isRingRoad =
          x === edgeRoadInset ||
          z === edgeRoadInset ||
          x === size - edgeRoadInset - 1 ||
          z === size - edgeRoadInset - 1;
        if (axis !== "junction" && isRingRoad && trafficNoise > 0.74 && centerDistance < 1.1 && cars.length < 8) {
          const laneOffset = spacing * 0.16 * (seededNoise(1602, x, z) > 0.5 ? 1 : -1);
          const { bodyColor, glowColor } = pickCarPalette(state.cityStyle, (x * 31) + (z * 17) + size);
          const travelSpan = axis === "x" ? bounds.width - (spacing * 3.4) : bounds.depth - (spacing * 3.4);
          cars.push({
            axis,
            position: axis === "x" ? [worldX, 0.26, worldZ + laneOffset] : [worldX + laneOffset, 0.26, worldZ],
            bodyColor,
            glowColor,
            direction: seededNoise(1603, x, z) > 0.5 ? 1 : -1,
            length: spacing * 0.52,
            width: spacing * 0.26,
            speed: 1.4 + seededNoise(1604, x, z) * 1.6,
            phase: seededNoise(1605, x, z) * Math.PI * 2,
            travelSpan,
          });
        }
        continue;
      }

      if (waterHere) {
        water.push({
          position: [worldX, -0.02, worldZ],
          size: [spacing * 0.96, 0.06, spacing * 0.96],
        });
        continue;
      }

      const parkNoise = fbm(401, x * 0.29, z * 0.29, 3);
      const park = parkNoise > (0.84 - parkChance * 0.45) && centerDistance > 0.2;
      if (park) {
        parks.push({
          position: [worldX, 0.03, worldZ],
          size: [spacing * 0.9, 0.1, spacing * 0.9],
        });
        continue;
      }

      const occupancy = fbm(509, x * 0.33, z * 0.33, 4);
      if (occupancy > density + 0.15) continue;

      const zoneRoll = fbm(911, x * 0.12, z * 0.12, 3);
      const contribution = contributionFeed.length > 0
        ? contributionFeed[contributionIndex % contributionFeed.length]
        : { date: `${x}-${z}`, count: 0, repo: null };
      contributionIndex += 1;
      const contributionStrength = contribution.count / maxContribution;
      let zone: ZoneType = "residential";
      const commercialBias = balances.commercial + (1 - centerDistance) * 0.24;
      const industrialBias = balances.industrial + roughness * 0.18 + (state.terrainStyle === "mountains" ? 0.1 : 0);
      if (zoneRoll < commercialBias * 0.62) {
        zone = "commercial";
      } else if (zoneRoll > 1 - industrialBias * 0.7) {
        zone = "industrial";
      }

      const baseHeight =
        zone === "commercial"
          ? state.averageHeight * (1.15 + (1 - centerDistance))
          : zone === "industrial"
            ? state.averageHeight * 0.7
            : state.averageHeight * 0.56;
      const variance = ((fbm(1201, x * 0.24, z * 0.24, 4) - 0.5) * 2) * state.heightVariance;
      const commitLift = contributionStrength * (state.averageHeight * 0.95);
      const height = clamp((baseHeight + variance + commitLift) / 10, 0.8, 24);
      const footprintNoise = fbm(721, x * 0.4, z * 0.4, 3);
      const width = spacing * (0.44 + footprintNoise * 0.38);
      const depth = spacing * (0.44 + fbm(722, x * 0.4, z * 0.4, 3) * 0.38);
      const organicOffsetX = state.streetPattern === "grid" ? 0 : (seededNoise(731, x, z) - 0.5) * spacing * 0.22;
      const organicOffsetZ = state.streetPattern === "grid" ? 0 : (seededNoise(732, x, z) - 0.5) * spacing * 0.22;
      const tower = zone === "commercial" && height > (state.averageHeight / 8);
      const lightBands = clamp(Math.round(2 + contributionStrength * 8), 2, 10);
      const lightStrength = clamp(0.16 + contributionStrength * 0.72, 0.18, 0.9);

      cells.push({
        x,
        z,
        worldX: worldX + organicOffsetX,
        worldZ: worldZ + organicOffsetZ,
        road: false,
        water: false,
        park: false,
        zone,
        height,
        width,
        depth,
        tower,
        seed: x * 1000 + z * 7 + size,
        contributionCount: contribution.count,
        lightBands,
        lightStrength,
        repo: contribution.repo,
        date: contribution.date,
      });
    }
  }

  if (state.terrainStyle === "mountains") {
    const ridgeCount = 5;
    for (let index = 0; index < ridgeCount; index += 1) {
      ridges.push({
        position: [-half + index * 8, 0, -half - 14 - index * 5],
        radius: 6 + index * 1.8,
        height: 4 + (roughness * 10) + index * 1.2,
      });
    }
  }

  if (state.terrainStyle === "coastline") {
    for (let strip = 0; strip < 12; strip += 1) {
      water.push({
        position: [half + 8, -0.05, -half + strip * 4.4],
        size: [18, 0.08, 4.8],
      });
    }
  }

  if (cars.length < 8) {
    const templates: Array<Pick<CarInstance, "axis" | "position" | "direction">> = [
      { axis: "x", position: [0, 0.26, -half + spacing], direction: 1 },
      { axis: "x", position: [0, 0.26, half - spacing], direction: -1 },
      { axis: "z", position: [-half + spacing, 0.26, 0], direction: 1 },
      { axis: "z", position: [half - spacing, 0.26, 0], direction: -1 },
      { axis: "x", position: [0, 0.26, -half + spacing * 3], direction: -1 },
      { axis: "x", position: [0, 0.26, half - spacing * 3], direction: 1 },
      { axis: "z", position: [-half + spacing * 3, 0.26, 0], direction: -1 },
      { axis: "z", position: [half - spacing * 3, 0.26, 0], direction: 1 },
    ];

    templates.slice(0, 8 - cars.length).forEach((template, index) => {
      const { bodyColor, glowColor } = pickCarPalette(state.cityStyle, index + size);
      const laneOffset = spacing * 0.16 * (index % 2 === 0 ? 1 : -1);
      cars.push({
        ...template,
        position:
          template.axis === "x"
            ? [template.position[0], template.position[1], template.position[2] + laneOffset]
            : [template.position[0] + laneOffset, template.position[1], template.position[2]],
        bodyColor,
        glowColor,
        length: spacing * 0.52,
        width: spacing * 0.26,
        speed: 1.2 + (index % 4) * 0.18,
        phase: index * 0.72,
        travelSpan: (template.axis === "x" ? bounds.width : bounds.depth) - (spacing * 3.4),
      });
    });
  }

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
    const controls = controlsRef.current;
    const perspectiveCamera = camera instanceof THREE.PerspectiveCamera ? camera : null;

    let nextPosition = new THREE.Vector3(0, span * 0.82, 0.01);
    if (viewPreset === "overhead") {
      target.current.set(0, 0, 0);
      nextPosition.set(0, span * 0.82, 0.01);
      if (perspectiveCamera) perspectiveCamera.fov = 28;
    } else if (viewPreset === "cinematic") {
      target.current.set(0, span * 0.08, -bounds.depth * 0.08);
      nextPosition.set(span * 0.24, span * 0.16, span * 0.42);
      if (perspectiveCamera) perspectiveCamera.fov = 34;
    } else {
      target.current.set(0, span * 0.06, 0);
      nextPosition.set(0, span * 0.22, span * 0.34);
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
      <planeGeometry args={[bounds.width + 42, bounds.depth + 42]} />
      <meshStandardMaterial
        color={theme.ground}
        emissive={theme.ground}
        emissiveIntensity={0.08}
        roughness={0.96}
        metalness={0.02}
      />
    </mesh>
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

function BuildingHoverCard({ cell }: { cell: Cell }) {
  return (
    <Html position={[0, cell.height / 2 + 1.1, 0]} center distanceFactor={10} occlude>
      <div className="w-56 rounded-2xl border border-white/12 bg-[rgba(7,10,16,0.94)] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">Commit Block</div>
        <div className="mt-1 text-sm font-black text-white">{cell.repo?.name ?? "Unmapped Repo"}</div>
        <div className="mt-1 text-xs text-white/68">{cell.date}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Commits</div>
            <div className="mt-1 font-bold text-white">{cell.contributionCount}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-2 py-1.5">
            <div className="text-white/45">Language</div>
            <div className="mt-1 font-bold text-white">{cell.repo?.language ?? "Mixed"}</div>
          </div>
        </div>
        {cell.repo?.description ? (
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
  contributions: ContributionSignal[];
}) {
  const theme = STYLE_THEMES[state.cityStyle];
  const model = useMemo(() => buildCityModel(state, contributions), [contributions, state]);
  const controlsRef = useRef<any>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <>
      <color attach="background" args={[theme.skyTop]} />
      <fog attach="fog" args={[theme.fog, 44, 170]} />

      <CameraDirector viewPreset={state.viewPreset} bounds={model.bounds} controlsRef={controlsRef} />

      <ambientLight intensity={0.54} color={theme.accent} />
      <directionalLight position={[36, 48, 24]} intensity={1.1} color={theme.accent} castShadow />
      <pointLight position={[0, 18, 0]} intensity={0.9} color={theme.roadGlow} />

      <Terrain bounds={model.bounds} theme={theme} />

      <mesh position={[0, 28, -model.bounds.depth * 0.92]}>
        <planeGeometry args={[model.bounds.width * 2.8, 72]} />
        <meshBasicMaterial color={theme.skyBottom} fog={false} transparent opacity={0.56} />
      </mesh>

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

      {model.roads.map((road, index) => (
        <group key={`road-${index}`} position={road.position}>
          <mesh receiveShadow>
            <boxGeometry args={road.size} />
            <meshStandardMaterial
              color={theme.road}
              emissive={theme.roadGlow}
              emissiveIntensity={state.cityStyle === "cyberpunk" ? 0.18 : 0.06}
              roughness={0.96}
              metalness={0.05}
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
                  <planeGeometry args={[road.size[0] * 0.82, 0.02]} />
                  <meshBasicMaterial color="#d8dde6" transparent opacity={0.2} />
                </mesh>
              ))}
              {[-0.24, -0.08, 0.08, 0.24].map((offset) => (
                <mesh
                  key={`dash-${offset}`}
                  position={road.axis === "x" ? [offset * road.size[0], 0.036, 0] : [0, 0.036, offset * road.size[2]]}
                  rotation={road.axis === "x" ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, Math.PI / 2, 0]}
                >
                  <planeGeometry args={[0.18, 0.03]} />
                  <meshBasicMaterial color="#f8e28a" transparent opacity={0.75} />
                </mesh>
              ))}
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
        const windowRows = clamp(cell.lightBands, 2, 9);
        const windowCols = clamp(Math.round((cell.width / 0.18) * 0.7), 2, 4);
        const sideWindowCols = clamp(Math.round((cell.depth / 0.18) * 0.7), 2, 4);
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
                emissiveIntensity={state.cityStyle === "cyberpunk" ? 0.15 : 0.05}
                roughness={state.cityStyle === "modern-glass" ? 0.28 : 0.72}
                metalness={state.cityStyle === "modern-glass" ? 0.78 : 0.18}
              />
            </mesh>

            {Array.from({ length: windowRows }, (_, rowIndex) => {
              const y = -cell.height / 2 + ((rowIndex + 1) / (windowRows + 1)) * cell.height;
              return Array.from({ length: windowCols }, (_, colIndex) => {
                const x = ((colIndex + 1) / (windowCols + 1) - 0.5) * cell.width * 0.72;
                const lit = seededNoise(cell.seed, rowIndex + 1, colIndex + 1) < clamp(0.24 + (cell.contributionCount / Math.max(1, cell.contributionCount + 4)), 0.2, 0.92);
                return (
                  <mesh key={`front-${rowIndex}-${colIndex}`} position={[x, y, cell.depth / 2 + 0.01]}>
                    <planeGeometry args={[cell.width * 0.12, Math.max(0.1, cell.height / (windowRows * 5.4))]} />
                    <meshBasicMaterial
                      color={pickWindowColor(theme, cell, rowIndex, colIndex)}
                      transparent
                      opacity={lit ? cell.lightStrength : 0.06}
                    />
                  </mesh>
                );
              });
            })}

            {Array.from({ length: windowRows - 1 }, (_, rowIndex) => {
              const y = -cell.height / 2 + ((rowIndex + 1) / windowRows) * cell.height;
              return Array.from({ length: sideWindowCols }, (_, colIndex) => {
                const z = ((colIndex + 1) / (sideWindowCols + 1) - 0.5) * cell.depth * 0.72;
                const lit = seededNoise(cell.seed + 17, rowIndex + 1, colIndex + 1) < clamp(0.18 + (cell.contributionCount / Math.max(1, cell.contributionCount + 5)), 0.16, 0.84);
                return (
                  <mesh key={`side-${rowIndex}-${colIndex}`} position={[cell.width / 2 + 0.01, y, z]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[cell.depth * 0.12, Math.max(0.09, cell.height / (windowRows * 5.8))]} />
                    <meshBasicMaterial
                      color={pickWindowColor(theme, cell, rowIndex, colIndex)}
                      transparent
                      opacity={lit ? cell.lightStrength * 0.86 : 0.05}
                    />
                  </mesh>
                );
              });
            })}

            {state.cityStyle === "tokyo-dense" && cell.zone === "commercial" ? (
              <mesh position={[cell.width / 2 + 0.04, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[cell.height * 0.42, cell.height * 0.22]} />
                <meshBasicMaterial color="#92d9ff" transparent opacity={0.26} />
              </mesh>
            ) : null}

            {hoveredCell === cellId ? <BuildingHoverCard cell={cell} /> : null}
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
                ? "rounded-2xl border border-emerald-300/25 bg-emerald-300/14 px-3 py-2 text-sm font-semibold text-emerald-50"
                : "rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.05]"
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
    contributions: buildContributionSignals(data),
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
  const [contributions, setContributions] = useState<ContributionSignal[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const deferredState = useDeferredValue(state);
  const theme = STYLE_THEMES[state.cityStyle];
  const captureRef = useRef<HTMLDivElement>(null);

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
        : "absolute left-6 right-[22rem] top-24 bottom-28 overflow-hidden rounded-[34px] border border-white/10 bg-black/18 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"}
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

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className={embedded
            ? "pointer-events-auto absolute right-6 top-6 z-10 max-h-[calc(100%-3rem)] w-[300px] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.84),rgba(6,10,14,0.52))] p-5 backdrop-blur-2xl"
            : "pointer-events-auto absolute right-6 top-24 z-10 max-h-[calc(100vh-8rem)] w-[320px] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.84),rgba(6,10,14,0.52))] p-5 backdrop-blur-2xl"}
        >
          <div className="grid gap-4">
            <Section icon={Palette} title="Style">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-cyan-100/68">Theme</div>
                <div className="mt-1 text-sm font-black text-white">Tokyo Dense</div>
                <div className="mt-1 text-xs leading-5 text-white/54">
                  Locked showcase mode with moody avenues, mixed warm-cool window glow, and dense high-rise composition.
                </div>
              </div>
              <Segmented
                label="Preset"
                value={state.preset}
                options={[
                  { value: "balanced-core", label: "Balanced Core" },
                  { value: "industrial-belt", label: "Industrial Belt" },
                  { value: "residential-area", label: "Residential Area" },
                  { value: "river-port", label: "River Port" },
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className={embedded
            ? "pointer-events-auto absolute bottom-6 left-6 right-[20rem] z-10"
            : "pointer-events-auto absolute bottom-6 left-6 right-[22rem] z-10"}
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
