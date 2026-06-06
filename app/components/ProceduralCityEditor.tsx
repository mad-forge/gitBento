"use client";
import { toPng } from "html-to-image";
import { Html, OrbitControls, Sphere, Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
    Aperture,
    Building2,
    Download,
    LoaderCircle,
    Maximize2,
    Minimize2,
    Play,
    Search,
} from "lucide-react";
import * as THREE from "three";
import type { GitBentoData } from "./types";
import BuildingAds, { type SkyAd, type AdVehicle } from "./BuildingAds";

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
    isHelipadTop: boolean;
};

type RoadAxis = "x" | "z" | "junction";

type RoadSegment = {
    axis: RoadAxis;
    position: [number, number, number];
    size: [number, number, number];
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
</svg>`;

const TREE_MODEL_PATH = "/tree.glb";
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
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    if (!context) return texture;

    // Background is completely black (no emissive glow)
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 256, 256);

    // Draw bright areas where we want the `glowColor` to shine through.
    // Creating a high-tech "server rack" or "database storage" look.
    const colCount = clamp(Math.round(width * 1.5), 2, 6);
    const colWidth = Math.floor(256 / colCount);

    for (let c = 0; c < colCount; c++) {
        const x = c * colWidth;

      // Vertical server blade slot (very faint background glow)
      context.fillStyle = "#111111";
      context.fillRect(x + 8, 16, colWidth - 16, 224);

      // Blinking data lights
      for (let y = 32; y < 224; y += 24) {
          const isLit = seededNoise(seed + c, y, 1) > 0.4;
          if (isLit) {
              // High intensity -> will glow bright with emissiveColor
              const intensity = 0.5 + seededNoise(seed, c, y) * 0.5;
              const colorVal = Math.floor(intensity * 255);
              context.fillStyle = `rgb(${colorVal}, ${colorVal}, ${colorVal})`;

            // Small indicator light
            context.fillRect(x + 16, y, colWidth * 0.35, 6);
        }
    }

      // Bottom processing unit (constant bright glow)
      context.fillStyle = "#ffffff";
      context.fillRect(x + 12, 210, colWidth - 24, 12);
  }

    // A horizontal glowing ring around the top
    context.fillStyle = "#888888";
    context.fillRect(0, 24, 256, 4);

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
          isHelipadTop: false,
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
          isHelipadTop: false,
      };

      cells.push(decorativeCell);
      occupiedPositions.push({
          x: decorativeCell.worldX,
          z: decorativeCell.worldZ,
          width: decorativeCell.width,
          depth: decorativeCell.depth,
      });
  });

    if (repoSignals.length >= 15) {
        const repoTowers = cells.slice(0, activeRepos.length);
        const helipadTower = repoTowers.reduce<Cell | null>((current, cell) => (
            !current || cell.contributionCount > current.contributionCount ? cell : current
        ), null);

        if (helipadTower) {
            const tallestHeight = Math.max(...repoTowers.map((cell) => cell.height));
            helipadTower.height = Math.min(44, Math.max(helipadTower.height, tallestHeight + 2.5));
            helipadTower.tower = true;
            helipadTower.isHelipadTop = true;
        }
    }

    return { cells, roads, parks, water, ridges, bounds };
}

function CameraDirector({
    viewPreset,
    bounds,
    sceneHeight,
    controlsRef,
    rooftopViewCell,
    isRoofAnimating,
    setIsRoofAnimating,
}: {
        viewPreset: EditorState["viewPreset"];
        bounds: CityModel["bounds"];
        sceneHeight: number;
        controlsRef: React.RefObject<any>;
        rooftopViewCell: Cell | null;
        isRoofAnimating: boolean;
        setIsRoofAnimating: (b: boolean) => void;
}) {
    const { camera } = useThree();
    const defaultTarget = useRef(new THREE.Vector3(0, 0, 0));
    const isFirstLoad = useRef(true);

    useEffect(() => {
        const span = Math.max(bounds.width, bounds.depth);
        const cameraSpan = clamp(span, 42, 78);
        const perspectiveCamera = camera instanceof THREE.PerspectiveCamera ? camera : null;

        let nextPosition = new THREE.Vector3();
        if (viewPreset === "overhead") {
            defaultTarget.current.set(0, 0, 0);
            nextPosition.set(0, Math.max(cameraSpan * 0.82, sceneHeight * 1.8), 0.01);
            if (perspectiveCamera) perspectiveCamera.fov = 28;
        } else if (viewPreset === "cinematic") {
            defaultTarget.current.set(0, Math.max(cameraSpan * 0.1, sceneHeight * 0.3), 0);
            nextPosition.set(
                0,
                Math.max(cameraSpan * 0.16, sceneHeight * 0.36),
                Math.max(cameraSpan * 0.64, sceneHeight * 1.42),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 38;
        } else {
            // Isometric/dynamic angle
            defaultTarget.current.set(0, sceneHeight * 0.45, 0);
            nextPosition.set(
                Math.max(cameraSpan * 0.55, sceneHeight * 1.1),
                Math.max(cameraSpan * 0.5, sceneHeight * 1.0),
                Math.max(cameraSpan * 0.8, sceneHeight * 1.5),
            );
            if (perspectiveCamera) perspectiveCamera.fov = 50;
        }

        camera.near = 0.1;
        camera.far = Math.max(5000, span * 24);
        if (perspectiveCamera) perspectiveCamera.updateProjectionMatrix();

        camera.position.copy(nextPosition);
        if (controlsRef.current) {
            controlsRef.current.target.copy(defaultTarget.current);
            controlsRef.current.update();
        }
        isFirstLoad.current = false;
    }, [bounds.depth, bounds.width, camera, controlsRef, sceneHeight, viewPreset]);

    // Reset target when exiting roof view
    useEffect(() => {
        if (!rooftopViewCell && !isFirstLoad.current && controlsRef.current) {
            controlsRef.current.target.copy(defaultTarget.current);
            controlsRef.current.update();
        }
    }, [rooftopViewCell, controlsRef]);

    useFrame((_, delta) => {
        if (rooftopViewCell && isRoofAnimating) {
            const roofTarget = new THREE.Vector3(rooftopViewCell.worldX, rooftopViewCell.height + 2.2, rooftopViewCell.worldZ + 3.5);
            const avatarPos = new THREE.Vector3(rooftopViewCell.worldX, rooftopViewCell.height + 1.2, rooftopViewCell.worldZ);

        const dist = camera.position.distanceTo(roofTarget);

          if (dist > 0.2) {
              camera.position.lerp(roofTarget, 3.5 * delta);
              if (controlsRef.current) {
                  controlsRef.current.target.lerp(avatarPos, 3.5 * delta);
                  controlsRef.current.update();
              } else {
                  camera.lookAt(avatarPos);
              }
          } else {
              // Arrived at the roof
              setIsRoofAnimating(false);
          }
      }
  });

    return null;
}

function Terrain({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
    const landShape = useMemo(() => {
        const halfWidth = bounds.width * 0.68;
        const halfDepth = bounds.depth * 0.58;
        const corner = Math.min(7, Math.max(3.5, Math.min(halfWidth, halfDepth) * 0.15));
        const shape = new THREE.Shape();

        shape.moveTo(-halfWidth + corner, -halfDepth);
        shape.lineTo(halfWidth - corner, -halfDepth);
        shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + corner);
        shape.lineTo(halfWidth, halfDepth - corner);
        shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - corner, halfDepth);
        shape.lineTo(-halfWidth + corner, halfDepth);
        shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - corner);
        shape.lineTo(-halfWidth, -halfDepth + corner);
        shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + corner, -halfDepth);

        return shape;
    }, [bounds.depth, bounds.width]);

    const edgeColor = useMemo(
        () => new THREE.Color(theme.ground).multiplyScalar(0.38),
        [theme.ground],
    );

    return (
        <group>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
                <extrudeGeometry
                    args={[
                        landShape,
                        {
                            depth: 1.1,
                            bevelEnabled: true,
                            bevelSegments: 4,
                            bevelSize: 0.7,
                            bevelThickness: 0.34,
                            curveSegments: 18,
                        },
                    ]}
                />
                <meshStandardMaterial
                    color={theme.ground}
                    emissive={theme.ground}
                    emissiveIntensity={0.12}
                    roughness={0.94}
                    metalness={0.04}
                />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.16, 0]} scale={[0.96, 0.96, 1]}>
                <extrudeGeometry args={[landShape, { depth: 0.5, bevelEnabled: false, curveSegments: 18 }]} />
                <meshStandardMaterial
                    color={edgeColor}
                    emissive="#010207"
                    emissiveIntensity={0.04}
                    roughness={1}
                    metalness={0}
                />
            </mesh>
        </group>
    );
}

function DistantMountains({ bounds, theme }: { bounds: CityModel["bounds"]; theme: StyleTheme }) {
    const span = Math.max(bounds.width, bounds.depth);
    const radius = span * 3.8;

    const mountains = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const seed = 42 + i;
            const angle = (i / 20) * Math.PI * 2;
            const dist = radius + seededNoise(seed, 1, 1) * span * 0.75;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const h = 45 + seededNoise(seed, 2, 2) * 35;
            const r = 24 + seededNoise(seed, 3, 3) * 20;
            const angularSegments = 18;
            const ringProfile = [
                { y: 0, radius: 1 },
                { y: 0.2, radius: 0.75 },
                { y: 0.4, radius: 0.5 },
                { y: 0.6, radius: 0.3 },
                { y: 0.8, radius: 0.15 },
                { y: 0.95, radius: 0.05 },
            ];
            const positions: number[] = [];
            const indices: number[] = [];
            const peakX = (seededNoise(seed, 11, 8) - 0.5) * r * 0.22;
            const peakZ = (seededNoise(seed, 12, 9) - 0.5) * r * 0.22;

            ringProfile.forEach((ring, ringIndex) => {
                for (let segment = 0; segment < angularSegments; segment += 1) {
                    const segmentAngle = (segment / angularSegments) * Math.PI * 2;
                    const broadVariation = Math.sin((segmentAngle * 3) + seed) * 0.07;
                    const roughVariation = (seededNoise(seed, ringIndex, segment) - 0.5) * 0.35;
                    const ringRadius = r * ring.radius * (1 + broadVariation + roughVariation);
                    const lean = ring.y * ring.y;
                    const unevenRise = (seededNoise(seed + 31, ringIndex, segment) - 0.5) * h * 0.035;

                    positions.push(
                        Math.cos(segmentAngle) * ringRadius + peakX * lean,
                        (ring.y * h) + unevenRise,
                        Math.sin(segmentAngle) * ringRadius + peakZ * lean,
                    );
                }
            });

            for (let ring = 0; ring < ringProfile.length - 1; ring += 1) {
                for (let segment = 0; segment < angularSegments; segment += 1) {
                    const nextSegment = (segment + 1) % angularSegments;
                    const current = (ring * angularSegments) + segment;
                    const currentNext = (ring * angularSegments) + nextSegment;
                    const above = ((ring + 1) * angularSegments) + segment;
                    const aboveNext = ((ring + 1) * angularSegments) + nextSegment;

                    indices.push(current, above, currentNext, currentNext, above, aboveNext);
                }
            }

            const peakIndex = positions.length / 3;
            positions.push(peakX, h, peakZ);
            const topRingStart = (ringProfile.length - 1) * angularSegments;
            for (let segment = 0; segment < angularSegments; segment += 1) {
                indices.push(
                    topRingStart + segment,
                    peakIndex,
                    topRingStart + ((segment + 1) % angularSegments),
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            return {
                x,
                z,
                geometry,
                rotation: seededNoise(seed, 14, 14) * Math.PI,
                shade: seededNoise(seed, 15, 15),
            };
        });
    }, [radius, span]);

    const mountainPalette = useMemo(() => {
        const sky = new THREE.Color(theme.skyBottom);
        const fog = new THREE.Color(theme.fog);

        return [
            fog.clone().lerp(new THREE.Color("#000000"), 0.6),
            fog.clone().lerp(new THREE.Color("#050505"), 0.4),
            fog.clone().lerp(sky, 0.2).multiplyScalar(0.3),
        ];
    }, [theme.fog, theme.skyBottom]);

    return (
        <group>
            {mountains.map((m, i) => (
                <mesh key={i} geometry={m.geometry} position={[m.x, -4, m.z]} rotation={[0, m.rotation, 0]}>
                    <meshStandardMaterial
                        color={mountainPalette[Math.floor(m.shade * mountainPalette.length)]}
                        roughness={0.9}
                        metalness={0.1}
                        flatShading
                    />
                </mesh>
            ))}
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
        const count = 360;
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
        const count = 44;
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
        const count = 18;
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

    const { towerMatrices, windowMatrices, antennaMatrices, windowColors, antennaColors } = useMemo(() => {
        const dummy = new THREE.Object3D();
        const tMatrices: THREE.Matrix4[] = [];
        const wMatrices: THREE.Matrix4[] = [];
        const aMatrices: THREE.Matrix4[] = [];
        
        const wColors: number[] = [];
        const aColors: number[] = [];

        const colorCyan = new THREE.Color(TOKYO_NIGHT.neonCyan);
        const colorRoad = new THREE.Color(theme.roadGlow);

        for (let cluster = 0; cluster < 24; cluster++) {
            const clusterAngle = (cluster / 24) * Math.PI * 2;
            const clusterRadius = span * 1.9;

            for (let i = 0; i < 45; i++) {
                const seed = cluster * 100 + i;
                const localAngle = clusterAngle + (seededNoise(801, seed, 1) - 0.5) * 0.9;
                const localDist = clusterRadius + seededNoise(802, seed, 2) * span * 1.4;

                const x = Math.cos(localAngle) * localDist;
                const z = Math.sin(localAngle) * localDist;

                const height = 10.0 + Math.pow(seededNoise(803, seed, 3), 2) * 50.0;
                const width = 1.8 + seededNoise(804, seed, 4) * 4.0;
                const depth = 1.8 + seededNoise(805, seed, 5) * 4.0;
                const isCyan = seededNoise(806, seed, 6) > 0.5;
                const glowColor = isCyan ? colorCyan : colorRoad;

                // Tower
                dummy.position.set(x, height / 2 - 0.04, z);
                dummy.scale.set(width, height, depth);
                dummy.updateMatrix();
                tMatrices.push(dummy.matrix.clone());

                // Windows
                const numWindows = clamp(Math.round(height / 4), 2, 10);
                for (let row = 0; row < numWindows; row++) {
                    const wx = x + (seededNoise(791, seed, row) - 0.5) * width * 0.4;
                    const wy = (height / 2 - 0.04) - height * 0.34 + row * Math.max(0.8, height * 0.1);
                    const wz = z + (depth / 2) + 0.012;
                    
                    dummy.position.set(wx, wy, wz);
                    dummy.scale.set(width * 0.42, 0.07, 0.025);
                    dummy.updateMatrix();
                    wMatrices.push(dummy.matrix.clone());
                    wColors.push(glowColor.r, glowColor.g, glowColor.b);
                }

                // Antenna
                if (seededNoise(792, seed, 1) > 0.3) {
                    dummy.position.set(x, height - 0.04 + 0.5, z);
                    dummy.scale.set(0.04, 1.0, 0.04);
                    dummy.updateMatrix();
                    aMatrices.push(dummy.matrix.clone());
                    aColors.push(glowColor.r, glowColor.g, glowColor.b);
                }
            }
        }
        
        return { 
            towerMatrices: tMatrices, 
            windowMatrices: wMatrices, 
            antennaMatrices: aMatrices, 
            windowColors: new Float32Array(wColors),
            antennaColors: new Float32Array(aColors)
        };
    }, [span, theme.roadGlow]);

    const tRef = useRef<THREE.InstancedMesh>(null);
    const wRef = useRef<THREE.InstancedMesh>(null);
    const aRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        if (tRef.current) {
            towerMatrices.forEach((mat, i) => tRef.current!.setMatrixAt(i, mat));
            tRef.current.instanceMatrix.needsUpdate = true;
        }
        if (wRef.current) {
            windowMatrices.forEach((mat, i) => wRef.current!.setMatrixAt(i, mat));
            wRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(windowColors, 3));
            wRef.current.instanceMatrix.needsUpdate = true;
        }
        if (aRef.current) {
            antennaMatrices.forEach((mat, i) => aRef.current!.setMatrixAt(i, mat));
            aRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(antennaColors, 3));
            aRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [towerMatrices, windowMatrices, antennaMatrices, windowColors, antennaColors]);

    return (
        <group>
            {towerMatrices.length > 0 && (
                <instancedMesh ref={tRef} args={[null as any, null as any, towerMatrices.length]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#050713" emissive="#100724" emissiveIntensity={0.12} roughness={0.38} metalness={0.68} />
                </instancedMesh>
            )}
            {windowMatrices.length > 0 && (
                <instancedMesh ref={wRef} args={[null as any, null as any, windowMatrices.length]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial vertexColors transparent opacity={0.62} toneMapped={false} />
                </instancedMesh>
            )}
            {antennaMatrices.length > 0 && (
                <instancedMesh ref={aRef} args={[null as any, null as any, antennaMatrices.length]}>
                    <cylinderGeometry args={[1, 1, 1, 5]} />
                    <meshBasicMaterial vertexColors transparent opacity={0.7} toneMapped={false} />
                </instancedMesh>
            )}
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


function ClaimedGlow({ height, width, depth, accentColor }: any) {
    const radius = Math.max(width, depth) * 1.5;
    return (
        <group position={[0, -height / 2 + 0.1, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius * 0.8, radius, 32]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[radius, radius, 1, 32, 1, true]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.1} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
        </group>
    );
}

function FocusBeacon({ height, width, depth, accentColor }: any) {
    return (
        <group position={[0, height / 2, 0]}>
            {/* Core intense beam */}
            <mesh position={[0, 40, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 80, 16, 1, true]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
            </mesh>
            {/* Floating energy rings around the beacon */}
            {Array.from({ length: 3 }).map((_, i) => (
                <mesh key={`ring-${i}`} position={[0, 10 + i * 15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.5 - i * 0.5, 0.1, 8, 32]} />
                    <meshBasicMaterial color={accentColor} transparent opacity={0.8} fog={false} />
                </mesh>
            ))}
        </group>
    );
}

function createVerticalLedTexture(text: string, color: string, bgColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Inner grid lines for tech look
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 16) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2); // Text reads bottom-to-top
  
  ctx.font = 'bold 110px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  
  const cleanText = text.length > 25 ? text.substring(0, 22) + "..." : text;
  const fullText = `${cleanText}   ★   ${cleanText}   ★   ${cleanText}`;
  
  // Render twice for glowing effect
  ctx.fillText(fullText, 0, 0);
  ctx.fillText(fullText, 0, 0);
  ctx.restore();
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return { tex, needsScroll: true };
}

function MegaVerticalAd({ building, color }: { building: Cell; color: string }) {
  const { tex, needsScroll } = useMemo(
    () => createVerticalLedTexture(building.repo.name, color, "#000000"),
    [building.repo.name, color]
  );
  const ledMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        toneMapped: false,
      }),
    [tex]
  );
  useEffect(() => () => {
    tex.dispose();
    ledMat.dispose();
  }, [ledMat, tex]);
  useFrame(({ clock }) => {
    if (needsScroll) tex.offset.y = -(clock.elapsedTime * 0.12) % 1;
  });
  const { width, depth, height } = building;
  const panelW = width * 1.02; // Slightly wider to wrap the edge
  const panelH = height * 0.98; // Cover almost full height
  const y = 0; 
  const zOff = depth / 2 + 0.05;
  return (
    <group position={[0, y, zOff]}>
      {/* Black backing to block out normal windows */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#02030a" />
      </mesh>
      {/* Glowing Ad */}
      <mesh material={ledMat}>
        <planeGeometry args={[panelW, panelH]} />
      </mesh>
    </group>
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
    const buildingShape = useMemo(() => seededNoise(888, cell.worldX, cell.worldZ) > 0.85 ? "cylinder" : "box", [cell.worldX, cell.worldZ]);
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
    const architecturalVariant = useMemo(() => Math.floor(seededNoise(cell.seed, 17.2, 4.6) * 5), [cell.seed]);
    const trimColor = architecturalVariant === 1 || architecturalVariant === 4 ? "#f4e889" : emissiveColor;
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

    if (!cell.isDecorative && (cell.height > 16 || isPrestigeTower)) {
        return (
            <group>
                <mesh castShadow receiveShadow material={buildingMaterial}>
                    <boxGeometry args={[cell.width * 0.95, cell.height, cell.depth * 0.95]} />
                </mesh>
                
                {/* Glowing edge trims */}
                {Array.from({ length: 4 }).map((_, i) => {
                    const x = (i % 2 === 0 ? 1 : -1) * (cell.width * 0.475 + 0.02);
                    const z = (i < 2 ? 1 : -1) * (cell.depth * 0.475 + 0.02);
                    return (
                        <mesh key={`edge-${i}`} position={[x, 0, z]}>
                            <boxGeometry args={[0.06, cell.height * 0.98, 0.06]} />
                            <meshBasicMaterial color={emissiveColor} transparent opacity={0.7} toneMapped={false} />
                        </mesh>
                    );
                })}

                {/* Floating neon rings */}
                {Array.from({ length: Math.max(1, Math.floor(cell.height / 5)) }).map((_, i) => {
                    const numRings = Math.max(1, Math.floor(cell.height / 5));
                    const ringY = -cell.height / 2 + (cell.height / numRings) * (i + 0.5);
                    return (
                        <mesh key={`ring-${i}`} position={[0, ringY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[Math.max(cell.width, cell.depth) * 0.6, 0.04, 8, 32]} />
                            <meshBasicMaterial color={emissiveColor} transparent opacity={0.8} toneMapped={false} />
                        </mesh>
                    );
                })}

                {/* Cyber Spire */}
                <mesh position={[0, cell.height / 2 + 0.8, 0]}>
                    <cylinderGeometry args={[0.04, 0.15, 1.6, 8]} />
                    <meshBasicMaterial color={emissiveColor} toneMapped={false} />
                </mesh>

                {cell.height > 18 && (
                    <MegaVerticalAd building={cell} color={languageGlowColor(cell.repo.language, cell.activityScore)} />
                )}
            </group>
        );
    }

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
                        {buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth)/2, Math.max(cell.width, cell.depth)/2, silhouette.lowerHeight, 16]} /> : <boxGeometry args={[cell.width, silhouette.lowerHeight, cell.depth]} />}
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
                        {buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth) * silhouette.middleScale / 2, Math.max(cell.width, cell.depth) * silhouette.middleScale / 2, silhouette.middleHeight, 16]} /> : <boxGeometry args={[cell.width * silhouette.middleScale, silhouette.middleHeight, cell.depth * (silhouette.middleScale + 0.04)]} />}
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
                        {buildingShape === "cylinder" ? <cylinderGeometry args={[Math.max(cell.width, cell.depth) * silhouette.topScale / 2, Math.max(cell.width, cell.depth) * silhouette.topScale / 2, silhouette.crownHeight, 16]} /> : <boxGeometry args={[cell.width * silhouette.topScale, silhouette.crownHeight, cell.depth * Math.max(0.5, silhouette.topScale - 0.02)]} />}
                    </mesh>

                      {[1, -1].map((side) => ( buildingShape !== "cylinder" && 
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

                      {(architecturalVariant === 0 || architecturalVariant === 3) ? [0.26, 0.58, 0.86].map((heightRatio, slabIndex) => (
                          <mesh
                              key={`overhang-${slabIndex}`}
                              position={[0, (-cell.height / 2) + (cell.height * heightRatio), 0]}
                              castShadow
                          >
                              <boxGeometry args={[
                                  cell.width * (1.28 - slabIndex * 0.12),
                                  0.09,
                                  cell.depth * (1.28 - slabIndex * 0.12),
                              ]} />
                              <meshStandardMaterial
                                  color="#11131a"
                                  emissive={trimColor}
                                  emissiveIntensity={0.8}
                                  roughness={0.22}
                                  metalness={0.86}
                                  toneMapped={false}
                              />
                          </mesh>
                      )) : null}

                      {(architecturalVariant === 1 || architecturalVariant === 4) ? [-1, 1].flatMap((sideX) => [-1, 1].map((sideZ) => (
                          <mesh
                              key={`corner-rail-${sideX}-${sideZ}`}
                              position={[
                                  sideX * cell.width * 0.51,
                                  -cell.height * 0.04,
                                  sideZ * cell.depth * 0.51,
                              ]}
                          >
                              <boxGeometry args={[0.045, cell.height * 0.86, 0.045]} />
                              <meshBasicMaterial color={trimColor} transparent opacity={0.86} toneMapped={false} />
                          </mesh>
                      ))) : null}

                      {architecturalVariant === 2 ? (
                          <>
                              <mesh position={[cell.width * 0.42, cell.height * 0.08, 0]} castShadow receiveShadow material={buildingMaterial}>
                                  <boxGeometry args={[cell.width * 0.38, cell.height * 0.46, cell.depth * 0.78]} />
                              </mesh>
                              <mesh position={[-cell.width * 0.42, -cell.height * 0.12, 0]} castShadow receiveShadow material={buildingMaterial}>
                                  <boxGeometry args={[cell.width * 0.34, cell.height * 0.32, cell.depth * 0.72]} />
                              </mesh>
                          </>
                      ) : null}

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

                      {architecturalVariant === 3 ? (
                          <group position={[0, cell.height / 2 + 0.5, 0]}>
                              <mesh>
                                  <octahedronGeometry args={[0.2, 0]} />
                                  <meshBasicMaterial color={trimColor} toneMapped={false} />
                              </mesh>
                              <mesh position={[0, -0.42, 0]}>
                                  <cylinderGeometry args={[0.018, 0.025, 0.78, 8]} />
                                  <meshStandardMaterial color="#3b414c" metalness={0.8} roughness={0.25} />
                              </mesh>
                          </group>
                      ) : null}

                      {architecturalVariant === 4 ? (
                          <group position={[0, cell.height / 2 + 0.58, 0]}>
                              <mesh position={[-0.22, 0, 0]}>
                                  <boxGeometry args={[0.08, 0.7, 0.08]} />
                                  <meshBasicMaterial color={trimColor} toneMapped={false} />
                              </mesh>
                              <mesh position={[0.22, 0, 0]}>
                                  <boxGeometry args={[0.08, 0.7, 0.08]} />
                                  <meshBasicMaterial color={trimColor} toneMapped={false} />
                              </mesh>
                              <mesh>
                                  <boxGeometry args={[0.5, 0.08, 0.08]} />
                                  <meshBasicMaterial color={trimColor} toneMapped={false} />
                              </mesh>
                          </group>
                      ) : null}

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

function LandmarkBuildingShell({ cell, glowColor, theme }: { cell: Cell; glowColor: string; theme: StyleTheme }) {
    const facadeTexture = useMemo(
        () => generateWindowTexture(cell.seed + 4401, Math.max(cell.width * 2.2, cell.depth * 2.2), cell.height),
        [cell.depth, cell.height, cell.seed, cell.width],
    );
    const facadeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: "#030612",
        map: facadeTexture,
        emissiveMap: facadeTexture,
        emissive: new THREE.Color(glowColor),
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.9,
        toneMapped: false,
    }), [facadeTexture, glowColor]);

    useEffect(() => {
        return () => {
            facadeTexture.dispose();
            facadeMaterial.dispose();
        };
    }, [facadeMaterial, facadeTexture]);

    const baseW = Math.max(cell.width * 2.4, 5.8);
    const baseD = Math.max(cell.depth * 2.4, 5.8);

    return (
        <group>
            {/* Central Monolithic Core */}
            <mesh castShadow receiveShadow material={facadeMaterial}>
                <boxGeometry args={[baseW, cell.height, baseD]} />
            </mesh>
            
            {/* Outer Sci-Fi Shell Framework */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[baseW * 1.05, cell.height * 0.98, baseD * 1.05]} />
                <meshStandardMaterial color="#020305" wireframe opacity={0.15} transparent />
            </mesh>

            {/* Neon Corner Accents */}
            {[
                [-baseW/2, baseD/2], [baseW/2, baseD/2],
                [-baseW/2, -baseD/2], [baseW/2, -baseD/2]
            ].map(([x, z], i) => (
                <mesh key={`corner-${i}`} position={[x, 0, z]}>
                    <cylinderGeometry args={[0.15, 0.15, cell.height, 4]} />
                    <meshBasicMaterial color={glowColor} transparent opacity={0.9} toneMapped={false} />
                </mesh>
            ))}

            {/* Floating Structural Belts */}
            {Array.from({ length: 4 }).map((_, i) => {
                const beltY = -cell.height / 2 + (cell.height / 4) * (i + 0.5);
                return (
                    <mesh key={`belt-${i}`} position={[0, beltY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[Math.max(baseW, baseD) * 0.6, Math.max(baseW, baseD) * 0.75, 4]} />
                        <meshBasicMaterial color={glowColor} transparent opacity={0.25} side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                );
            })}

            {/* Top crown structure */}
            <mesh position={[0, cell.height / 2 + 0.16, 0]} castShadow>
                <cylinderGeometry args={[1.45, 1.7, 0.3, 32]} />
                <meshStandardMaterial color="#070b15" emissive={glowColor} emissiveIntensity={0.18} roughness={0.2} metalness={0.9} />
            </mesh>

            {/* The user's requested components */}
            <ClaimedGlow height={cell.height} width={baseW} depth={baseD} accentColor={theme.accent} />
            <FocusBeacon height={cell.height} width={baseW} depth={baseD} accentColor={theme.accent} />
            <MegaVerticalAd building={{ ...cell, width: baseW, height: cell.height, depth: baseD }} color={theme.accent} />
        </group>
    );
}


function RepoBannerSign({
    cell,
    glowColor,
    faceMounted = false,
}: {
    cell: Cell;
    glowColor: string;
    faceMounted?: boolean;
}) {
    const signRef = useRef<THREE.Group>(null);
    const screenMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        const nextTexture = new THREE.CanvasTexture(canvas);
        nextTexture.anisotropy = 16;
        if (!context) return nextTexture;

        const displayName = cell.repo.name.length > 24 ? `${cell.repo.name.slice(0, 22)}...` : cell.repo.name;
        const tickerText = `  ${displayName.toUpperCase()}  ★  `;
        
        context.fillStyle = "#060913";
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Inner grid lines for tech look
        context.strokeStyle = "rgba(255, 255, 255, 0.05)";
        context.lineWidth = 2;
        for (let i = 0; i < canvas.width; i += 32) {
            context.beginPath(); context.moveTo(i, 0); context.lineTo(i, canvas.height); context.stroke();
        }
        for (let i = 0; i < canvas.height; i += 32) {
            context.beginPath(); context.moveTo(0, i); context.lineTo(canvas.width, i); context.stroke();
        }

        context.font = "bold 110px monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = glowColor;
        context.shadowBlur = 40;
        context.fillStyle = "#ffffff";
        
        // Render repetitions for seamless scrolling
        const textWidth = context.measureText(tickerText).width;
        const step = Math.max(textWidth, 800);
        for (let x = step / 2; x < canvas.width * 2; x += step) {
            context.fillText(tickerText, x, canvas.height / 2 + 10);
            context.fillText(tickerText, x, canvas.height / 2 + 10); // draw twice for stronger glow
        }

        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.wrapS = THREE.RepeatWrapping;
        nextTexture.repeat.set(1, 1);
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [cell.repo.name, glowColor]);
    
    const panelWidth = faceMounted ? Math.max(cell.width * 2.4, 5.8) : Math.max(cell.width * 1.8, 4.4);
    const panelHeight = panelWidth * 0.15;
    const position: [number, number, number] = faceMounted
        ? [0, cell.height * 0.24, Math.max(cell.depth, 2.4)]
        : [0, cell.height / 2 + 1.2 + panelHeight / 2, 0];

    useEffect(() => () => texture.dispose(), [texture]);

    useFrame(({ clock }, delta) => {
        texture.offset.x = (clock.elapsedTime * 0.1) % 1;
        if (!faceMounted && signRef.current) {
            signRef.current.rotation.y += Math.min(delta, 0.05) * 0.22;
        }
        if (screenMaterialRef.current) {
            screenMaterialRef.current.opacity = 0.9 + Math.sin(clock.elapsedTime * 3.0) * 0.1;
        }
    });

    return (
        <group ref={signRef} position={position}>
            {!faceMounted ? (
                <group position={[0, -panelHeight / 2, 0]}>
                    <mesh position={[0, -0.6, 0]}>
                        <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
                        <meshStandardMaterial color="#0f111a" roughness={0.7} metalness={0.8} />
                    </mesh>
                    <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.15, 0.02, 8, 16]} />
                        <meshBasicMaterial color={glowColor} toneMapped={false} />
                    </mesh>
                    <mesh position={[-panelWidth * 0.25, -0.4, 0]} rotation={[0, 0, -0.6]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.0]} />
                        <meshStandardMaterial color="#212636" roughness={0.5} />
                    </mesh>
                    <mesh position={[panelWidth * 0.25, -0.4, 0]} rotation={[0, 0, 0.6]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.0]} />
                        <meshStandardMaterial color="#212636" roughness={0.5} />
                    </mesh>
                </group>
            ) : null}
            
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[panelWidth + 0.15, panelHeight + 0.15, 0.1]} />
                <meshStandardMaterial color="#05070a" roughness={0.5} metalness={0.9} />
            </mesh>
            
            <mesh position={[0, panelHeight / 2 + 0.075, 0]}>
                <boxGeometry args={[panelWidth + 0.15, 0.02, 0.12]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} />
            </mesh>
            <mesh position={[0, -panelHeight / 2 - 0.075, 0]}>
                <boxGeometry args={[panelWidth + 0.15, 0.02, 0.12]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} />
            </mesh>

            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[panelWidth, panelHeight]} />
                <meshBasicMaterial
                    ref={screenMaterialRef}
                    map={texture}
                    transparent
                    opacity={1}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />
            </mesh>
            <pointLight position={[0, 0, 0.6]} color={glowColor} intensity={1.2} distance={8} decay={2} />
        </group>
    );
}
function LandmarkRepoDisplay({ cell, glowColor }: { cell: Cell; glowColor: string }) {
    const scanRef = useRef<THREE.Mesh>(null);
    const displayRef = useRef<THREE.Group>(null);
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 2048;
        const context = canvas.getContext("2d");
        const nextTexture = new THREE.CanvasTexture(canvas);
        if (!context) return nextTexture;

        const rawName = cell.repo.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const displayName = rawName.length > 16 ? `${rawName.slice(0, 15)}+` : rawName || "REPO";
        context.fillStyle = "rgba(1, 4, 12, 0.46)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = glowColor;
        context.lineWidth = 8;
        context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        context.textAlign = "center";
        context.textBaseline = "middle";
        const availableHeight = canvas.height - 110;
        const characterStep = availableHeight / displayName.length;
        const fontSize = Math.min(300, characterStep * 0.82);
        const startY = (canvas.height - (characterStep * displayName.length)) / 2 + (characterStep / 2);
        context.font = `900 ${fontSize}px Arial`;
        context.shadowColor = glowColor;
        context.shadowBlur = 34;
        context.fillStyle = "#ffffff";
        displayName.split("").forEach((character, index) => {
            context.fillText(character, canvas.width / 2, startY + (index * characterStep));
        });

        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [cell.repo.name, glowColor]);
    const displayWidth = Math.max(cell.width * 1.08, 2.6);
    const displayHeight = cell.height * 0.58;
    const travelDistance = cell.height * 0.2;
    const baseY = -cell.height * 0.04;
    const frontZ = Math.max(cell.depth * 1.35, 3.3);

    useEffect(() => () => texture.dispose(), [texture]);

    useFrame(({ clock }) => {
        const cycle = (clock.elapsedTime * 0.12) % 2;
        const progress = cycle <= 1 ? cycle : 2 - cycle;
        const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);

        if (displayRef.current) {
            displayRef.current.position.y = baseY + ((0.5 - easedProgress) * travelDistance);
        }
        if (scanRef.current) {
            scanRef.current.position.y = ((clock.elapsedTime * 0.22) % 1 - 0.5) * displayHeight;
        }
    });

    return (
        <group ref={displayRef} position={[0, baseY, frontZ]}>
            <mesh position={[0, 0, -0.08]}>
                <boxGeometry args={[displayWidth + 0.2, displayHeight + 0.25, 0.16]} />
                <meshStandardMaterial color="#02040a" emissive={glowColor} emissiveIntensity={0.14} roughness={0.22} metalness={0.86} />
            </mesh>
            <mesh>
                <planeGeometry args={[displayWidth, displayHeight]} />
                <meshBasicMaterial map={texture} transparent opacity={0.94} toneMapped={false} />
            </mesh>
            <mesh ref={scanRef} position={[0, 0, 0.03]}>
                <planeGeometry args={[displayWidth * 0.94, 0.08]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.7} toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0, 1.2]} color={glowColor} intensity={1.4} distance={9} decay={2} />
        </group>
    );
}

function ProceduralHelicopter({ flying, theme }: { flying: boolean; theme: StyleTheme }) {
    const mainRotorRef = useRef<THREE.Group>(null);
    const tailRotorRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        const rotorSpeed = flying ? 32 : 4;
        if (mainRotorRef.current) mainRotorRef.current.rotation.y -= rotorSpeed * delta;
        if (tailRotorRef.current) tailRotorRef.current.rotation.x += rotorSpeed * 1.35 * delta;
    });

    return (
        <group scale={0.62}>
            <mesh position={[0, 0.78, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[0.48, 1.22, 8, 20]} />
                <meshStandardMaterial color="#10131a" roughness={0.2} metalness={0.82} />
            </mesh>
            <mesh position={[0, 0.84, 0.72]} scale={[0.82, 0.72, 1.05]} castShadow>
                <sphereGeometry args={[0.5, 24, 16]} />
                <meshStandardMaterial
                    color="#182538"
                    emissive={theme.roadGlow}
                    emissiveIntensity={0.16}
                    roughness={0.12}
                    metalness={0.72}
                />
            </mesh>
            {[-1, 1].map((side) => (
                <mesh key={`cockpit-${side}`} position={[side * 0.38, 0.92, 0.72]} scale={[0.08, 0.58, 0.68]}>
                    <sphereGeometry args={[0.5, 16, 12]} />
                    <meshStandardMaterial
                        color="#9bdcff"
                        emissive="#4aa8d8"
                        emissiveIntensity={flying ? 0.5 : 0.22}
                        transparent
                        opacity={0.78}
                        roughness={0.08}
                        metalness={0.55}
                    />
                </mesh>
            ))}
            <mesh position={[0, 0.79, -1.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.07, 2.1, 10]} />
                <meshStandardMaterial color="#171b23" roughness={0.3} metalness={0.72} />
            </mesh>
            <mesh position={[0, 1.1, -2.08]} castShadow>
                <boxGeometry args={[0.08, 0.72, 0.46]} />
                <meshStandardMaterial color="#11151c" roughness={0.28} metalness={0.76} />
            </mesh>
            <mesh position={[0, 0.78, -2.02]} castShadow>
                <boxGeometry args={[1.02, 0.07, 0.28]} />
                <meshStandardMaterial color="#151a22" roughness={0.28} metalness={0.76} />
            </mesh>

            <group ref={mainRotorRef} position={[0, 1.48, 0]}>
                <mesh>
                    <cylinderGeometry args={[0.08, 0.1, 0.28, 12]} />
                    <meshStandardMaterial color="#4d5561" metalness={0.9} roughness={0.2} />
                </mesh>
                {[0, Math.PI / 2].map((rotation) => (
                    <mesh key={rotation} rotation={[0, rotation, 0]}>
                        <boxGeometry args={[4.5, 0.025, 0.12]} />
                        <meshBasicMaterial color="#b9c4d0" transparent opacity={flying ? 0.42 : 0.78} />
                    </mesh>
                ))}
            </group>

            <group ref={tailRotorRef} position={[0.11, 1.05, -2.1]}>
                {[0, Math.PI / 2].map((rotation) => (
                    <mesh key={rotation} rotation={[rotation, 0, 0]}>
                        <boxGeometry args={[0.035, 0.82, 0.09]} />
                        <meshBasicMaterial color="#cbd4df" transparent opacity={flying ? 0.48 : 0.8} />
                    </mesh>
                ))}
            </group>

            <group position={[0, 0.18, 0]}>
                {[-0.48, 0.48].map((x) => (
                    <mesh key={`skid-${x}`} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <cylinderGeometry args={[0.045, 0.045, 2.35, 10]} />
                        <meshStandardMaterial color="#303742" roughness={0.34} metalness={0.82} />
                    </mesh>
                ))}
                {[-0.58, 0.58].flatMap((z) => [-0.38, 0.38].map((x) => (
                    <mesh key={`strut-${x}-${z}`} position={[x, 0.28, z]} rotation={[0, 0, x < 0 ? -0.5 : 0.5]}>
                        <cylinderGeometry args={[0.026, 0.026, 0.62, 8]} />
                        <meshStandardMaterial color="#303742" roughness={0.34} metalness={0.82} />
                    </mesh>
                )))}
            </group>

            <mesh position={[0, 0.68, 1.18]}>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <mesh position={[0, 1.12, -2.18]}>
                <sphereGeometry args={[0.065, 12, 12]} />
                <meshBasicMaterial color="#ff365f" toneMapped={false} />
            </mesh>
        </group>
    );
}

function HelipadTop({
    cell,
    theme,
    isFlying,
}: {
    cell: Cell;
    theme: StyleTheme;
    isFlying: boolean;
}) {
    const padRadius = clamp(Math.max(cell.width, cell.depth) * 0.72, 1.45, 2.25);
    const yOffset = cell.height / 2 + 0.34;

    return (
        <group position={[0, yOffset, 0]}>
            <mesh position={[0, 17, 0]}>
                <cylinderGeometry args={[padRadius * 0.08, padRadius * 0.86, 34, 32, 1, true]} />
                <meshBasicMaterial
                    color={theme.accent}
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                    fog={false}
                />
            </mesh>
            <mesh position={[0, 6.5, 0]}>
                <octahedronGeometry args={[0.72, 0]} />
                <meshBasicMaterial color={theme.accent} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            <mesh position={[0, 6.5, 0]} scale={[1.7, 1.7, 1.7]}>
                <octahedronGeometry args={[0.72, 0]} />
                <meshBasicMaterial color={theme.accent} transparent opacity={0.15} toneMapped={false} />
            </mesh>
            <pointLight position={[0, 2.4, 0]} color={theme.accent} intensity={2.4} distance={12} decay={2} />
            <mesh receiveShadow>
                <cylinderGeometry args={[padRadius, padRadius, 0.16, 48]} />
                <meshStandardMaterial color="#090d16" emissive="#11192a" emissiveIntensity={0.28} roughness={0.42} metalness={0.78} />
            </mesh>
            <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[padRadius * 0.72, padRadius * 0.82, 48]} />
                <meshBasicMaterial color={theme.accent} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <group position={[0, 0.11, 0]}>
                <mesh position={[-padRadius * 0.24, 0, 0]}>
                    <boxGeometry args={[padRadius * 0.14, 0.035, padRadius * 0.9]} />
                    <meshBasicMaterial color={theme.accent} toneMapped={false} />
                </mesh>
                <mesh position={[padRadius * 0.24, 0, 0]}>
                    <boxGeometry args={[padRadius * 0.14, 0.035, padRadius * 0.9]} />
                    <meshBasicMaterial color={theme.accent} toneMapped={false} />
                </mesh>
                <mesh>
                    <boxGeometry args={[padRadius * 0.56, 0.04, padRadius * 0.14]} />
                    <meshBasicMaterial color={theme.accent} toneMapped={false} />
                </mesh>
            </group>
            {Array.from({ length: 8 }, (_, index) => {
                const angle = (index / 8) * Math.PI * 2;
                return (
                    <mesh key={`pad-light-${index}`} position={[Math.cos(angle) * padRadius * 0.9, 0.16, Math.sin(angle) * padRadius * 0.9]}>
                        <sphereGeometry args={[0.055, 10, 10]} />
                        <meshBasicMaterial color={index % 2 === 0 ? theme.accent : TOKYO_NIGHT.neonCyan} toneMapped={false} />
                    </mesh>
                );
            })}
            {!isFlying ? (
                <group position={[0, 0.36, 0]} rotation={[0, Math.PI * 0.25, 0]}>
                    <ProceduralHelicopter flying={false} theme={theme} />
                </group>
            ) : null}
        </group>
    );
}

function HelicopterFlightController({
    helipadCell,
    bounds,
    theme,
    onExit,
}: {
    helipadCell: Cell;
    bounds: CityModel["bounds"];
    theme: StyleTheme;
    onExit: () => void;
}) {
    const { camera } = useThree();
    const helicopterRef = useRef<THREE.Group>(null);
    const position = useRef(new THREE.Vector3(helipadCell.worldX, helipadCell.height + 2.2, helipadCell.worldZ));
    const velocity = useRef(new THREE.Vector3());
    const yaw = useRef(Math.PI * 0.25);
    const keys = useRef(new Set<string>());

    useEffect(() => {
        const controlledKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "Escape"]);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!controlledKeys.has(event.code)) return;
            event.preventDefault();
            if (event.code === "Escape") {
                onExit();
                return;
            }
            keys.current.add(event.code);
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (!controlledKeys.has(event.code)) return;
            event.preventDefault();
            keys.current.delete(event.code);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [onExit]);

    useFrame((_, rawDelta) => {
        if (!helicopterRef.current) return;
        const delta = Math.min(rawDelta, 0.05);
        const turnDirection = (keys.current.has("KeyA") ? 1 : 0) - (keys.current.has("KeyD") ? 1 : 0);
        const thrustDirection = (keys.current.has("KeyW") ? 1 : 0) - (keys.current.has("KeyS") ? 1 : 0);
        const liftDirection = (keys.current.has("ShiftLeft") || keys.current.has("ShiftRight") ? 1 : 0) - (keys.current.has("Space") ? 1 : 0);

        yaw.current += turnDirection * 1.75 * delta;
        const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
        velocity.current.addScaledVector(forward, thrustDirection * 20 * delta);
        velocity.current.y += liftDirection * 15 * delta;

        const horizontalVelocity = new THREE.Vector2(velocity.current.x, velocity.current.z);
        if (horizontalVelocity.length() > 22) {
            horizontalVelocity.setLength(22);
            velocity.current.x = horizontalVelocity.x;
            velocity.current.z = horizontalVelocity.y;
        }
        velocity.current.y = clamp(velocity.current.y, -10, 12);
        velocity.current.multiplyScalar(Math.exp(-1.8 * delta));
        position.current.addScaledVector(velocity.current, delta);

        const travelLimit = Math.max(bounds.width, bounds.depth) * 1.7;
        position.current.x = clamp(position.current.x, -travelLimit, travelLimit);
        position.current.z = clamp(position.current.z, -travelLimit, travelLimit);
        position.current.y = clamp(position.current.y, 3, 82);

        const localVelocity = velocity.current.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw.current);
        helicopterRef.current.position.copy(position.current);
        helicopterRef.current.rotation.set(
            clamp(localVelocity.z * 0.018, -0.24, 0.24),
            yaw.current,
            clamp(-turnDirection * 0.18 - localVelocity.x * 0.018, -0.28, 0.28),
        );

        const cameraOffset = new THREE.Vector3(0, 5.2, -13).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
        const cameraPosition = position.current.clone().add(cameraOffset);
        const cameraBlend = 1 - Math.exp(-4.5 * delta);
        camera.position.lerp(cameraPosition, cameraBlend);
        camera.lookAt(position.current.clone().add(new THREE.Vector3(0, 0.7, 0)));
    });

    return (
        <>
            <group ref={helicopterRef}>
                <ProceduralHelicopter flying theme={theme} />
                <spotLight
                    position={[0, -0.2, 0.4]}
                    color="#dff8ff"
                    intensity={5}
                    distance={24}
                    angle={0.35}
                    penumbra={0.8}
                    decay={2}
                />
            </group>
            <Html fullscreen zIndexRange={[100, 0]} style={{ pointerEvents: "none" }}>
                <div className="flex h-full items-start justify-center p-5">
                    <div className="rounded-2xl border border-cyan-200/20 bg-black/65 px-4 py-3 text-center text-xs text-cyan-50 shadow-[0_12px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                        <div className="font-black uppercase tracking-[0.18em]">Helicopter Flight</div>
                        <div className="mt-1 text-white/60">W/S move · A/D turn · Shift rise · Space descend · Esc exit</div>
                        <button
                            type="button"
                            onClick={onExit}
                            className="pointer-events-auto mt-3 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-bold text-white hover:bg-white/15"
                        >
                            Exit Flight
                        </button>
                    </div>
                </div>
            </Html>
        </>
    );
}

function RooftopAvatar({ position, glowColor }: { position: [number, number, number], glowColor: string }) {
    const avatarRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (avatarRef.current) {
            avatarRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.02;
        }
    });

    return (
        <group position={position} ref={avatarRef} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 1.6, 0]} castShadow>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#050814" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[0, 1.6, 0.12]}>
                <boxGeometry args={[0.22, 0.08, 0.1]} />
                <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2.5} />
            </mesh>
            <mesh position={[0, 1.0, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.18, 0.9]} />
                <meshStandardMaterial color="#101524" roughness={0.7} metalness={0.2} />
            </mesh>
            <mesh position={[-0.28, 1.0, 0]} castShadow rotation={[0, 0, 0.1]}>
                <cylinderGeometry args={[0.06, 0.05, 0.8]} />
                <meshStandardMaterial color="#0a0d18" roughness={0.8} />
            </mesh>
            <mesh position={[0.28, 1.0, 0]} castShadow rotation={[0, 0, -0.1]}>
                <cylinderGeometry args={[0.06, 0.05, 0.8]} />
                <meshStandardMaterial color="#0a0d18" roughness={0.8} />
            </mesh>
            <mesh position={[-0.1, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.06, 0.6]} />
                <meshStandardMaterial color="#050814" roughness={0.9} />
            </mesh>
            <mesh position={[0.1, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.06, 0.6]} />
                <meshStandardMaterial color="#050814" roughness={0.9} />
            </mesh>
        </group>
    );
}

function RealisticMoon() {
    const moonTex = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;
        
        // Base color
        ctx.fillStyle = "#e8e9f2";
        ctx.fillRect(0, 0, 512, 512);
        
        // Draw craters
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = 10 + Math.pow(Math.random(), 2.5) * 60;
            
            const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
            g.addColorStop(0, "rgba(180, 180, 195, 0.7)");
            g.addColorStop(1, "rgba(232, 233, 242, 0)");
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Noise
        const imgData = ctx.getImageData(0, 0, 512, 512);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 15;
            imgData.data[i] += noise;
            imgData.data[i+1] += noise;
            imgData.data[i+2] += noise;
        }
        ctx.putImageData(imgData, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    }, []);

    return (
        <group>
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <sphereGeometry args={[6, 64, 64]} />
                <meshBasicMaterial map={moonTex} toneMapped={false} fog={false} />
            </mesh>
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
    const [selectedCell, setSelectedCell] = useState<string | null>(null);
    const [rooftopViewCell, setRooftopViewCell] = useState<Cell | null>(null);
    const [isRoofAnimating, setIsRoofAnimating] = useState(false);
    const [isFlying, setIsFlying] = useState(false);
    const helipadCell = model.cells.find((cell) => cell.isHelipadTop) ?? null;
    const sceneHeight = Math.max(20, ...model.cells.map((cell) => cell.height + (cell.isHelipadTop ? 5 : 0)));
    const generatedAds = useMemo<SkyAd[]>(() => {
        // Only show ads on the top 6 tallest real buildings to avoid overlap
        const adCells = model.cells
            .filter((cell) => !cell.isDecorative)
            .sort((a, b) => b.height - a.height)
            .slice(0, 6);

        // Neon cyberpunk palette cycling
        const neonColors = [
            { color: "#ec4899", bgColor: "#0d0008" }, // magenta
            { color: "#a855f7", bgColor: "#08000d" }, // purple
            { color: "#06b6d4", bgColor: "#00080d" }, // cyan
            { color: "#f472b6", bgColor: "#0d0008" }, // pink
            { color: "#818cf8", bgColor: "#04000d" }, // indigo
            { color: "#34d399", bgColor: "#000d07" }, // emerald
        ];
        // Alternate vehicle types: lead with billboard then rooftop, skip led_wrap for top buildings
        const vehicles: AdVehicle[] = ["wall_mount", "wall_mount", "rooftop_sign", "wall_mount", "wall_mount", "rooftop_sign"];
        return adCells.map((cell, index) => ({
            id: `ad-${index}`,
            vehicle: vehicles[index % vehicles.length],
            text: cell.repo?.name?.toUpperCase() || "CODE",
            color: neonColors[index % neonColors.length].color,
            bgColor: neonColors[index % neonColors.length].bgColor,
        }));
    }, [model.cells]);

    const horizonColor = "#05030a";

    function exitFlight() {
        setIsFlying(false);
        controlsRef.current?.target.set(0, 0, 0);
        controlsRef.current?.update();
    }

    return (
        <group onPointerMissed={() => setSelectedCell(null)}>
            <color attach="background" args={[horizonColor]} />
            <fog attach="fog" args={[horizonColor, 40, 200]} />

          <CameraDirector
              viewPreset={state.viewPreset}
              bounds={model.bounds}
              sceneHeight={sceneHeight}
              controlsRef={controlsRef}
              rooftopViewCell={rooftopViewCell}
              isRoofAnimating={isRoofAnimating}
              setIsRoofAnimating={setIsRoofAnimating}
          />

          <Stars radius={190} depth={100} count={600} factor={2.2} saturation={0.18} fade speed={0.12} />
          <TokyoStarField bounds={model.bounds} theme={theme} />
          <DistantMountains bounds={model.bounds} theme={theme} />
          <ambientLight intensity={0.15} color="#4a00e0" />
          <directionalLight position={[22, 28, 12]} intensity={0.24} color={TOKYO_NIGHT.rimPurple} castShadow />
          <group position={[model.bounds.width * 0.6, 120, -Math.max(model.bounds.depth, 60) * 1.8]}>
              <RealisticMoon />
          </group>
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
                  <meshStandardMaterial
                      color={theme.water}
                      roughness={0.1}
                      metalness={0.8}
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
                      <meshStandardMaterial
                          color={theme.road}
                          roughness={0.4}
                          metalness={0.6}
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

          {model.cells.map((cell) => {
              const [baseColor, glowColor] = zoneColor(theme, cell.zone);
              const cellId = `${cell.x}-${cell.z}`;
              return (
                  <group
                      key={cellId}
                      position={[cell.worldX, cell.height / 2, cell.worldZ]}
                      onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCell(cellId);
                      }}
                  >
                      {cell.isHelipadTop ? (
                          <LandmarkBuildingShell cell={cell} glowColor={glowColor} theme={theme} />
                      ) : (
                          <BuildingShell
                              cell={cell}
                              baseColor={baseColor}
                              glowColor={glowColor}
                          />
                      )}
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
                      {!cell.isHelipadTop ? <mesh position={[0, cell.height / 2 - 0.08, 0]} castShadow>
                          <boxGeometry args={[cell.width * 1.02, 0.12, cell.depth * 1.02]} />
                          <meshStandardMaterial
                              color="#03040b"
                              emissive="#050615"
                              emissiveIntensity={0.08}
                              roughness={0.18}
                              metalness={0.88}
                          />
                      </mesh> : null}
                      {cell.tower && !cell.isHelipadTop ? (
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
                      {cell.isHelipadTop ? (
                          <HelipadTop
                              cell={cell}
                              theme={theme}
                              isFlying={isFlying}
                          />
                      ) : null}
                      {selectedCell === cellId && !rooftopViewCell && !cell.isDecorative && (
                          <Html position={[0, cell.height / 2 + (cell.isHelipadTop ? 5.2 : 2.5), 0]} center zIndexRange={[100, 0]}>
                              <div className="w-56 rounded-[22px] border border-white/15 bg-[rgba(5,7,13,0.92)] p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-2xl" style={{ pointerEvents: "auto" }}>
                                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Repo Tower</div>
                                  <h3 className="truncate text-base font-black text-white">{cell.repo.name}</h3>
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setRooftopViewCell(cell);
                                          setIsRoofAnimating(true);
                                      }}
                                      className="mt-4 w-full rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
                                      style={{ backgroundColor: glowColor }}
                                  >
                                      Top View
                                  </button>
                                  {cell.isHelipadTop ? (
                                      <button
                                          type="button"
                                          onClick={(event) => {
                                              event.stopPropagation();
                                              setSelectedCell(null);
                                              setRooftopViewCell(null);
                                              setIsRoofAnimating(false);
                                              setIsFlying(true);
                                          }}
                                          className="mt-2 w-full rounded-xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-300/15"
                                      >
                                          Fly Helicopter
                                      </button>
                                  ) : null}
                                  <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedCell(null); }}
                                      className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition hover:bg-white/5"
                                  >
                                      Close
                                  </button>
                              </div>
                          </Html>
                      )}
                  </group>
              );
          })}

          <BuildingAds ads={generatedAds} buildings={model.cells as any} />

          {rooftopViewCell && (
              <Html center position={[rooftopViewCell.worldX, rooftopViewCell.height + 4, rooftopViewCell.worldZ]}>
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          setRooftopViewCell(null);
                      }}
                      style={{
                          padding: '10px 20px',
                          background: 'rgba(255, 50, 80, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          backdropFilter: 'blur(4px)',
                          pointerEvents: 'auto',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(255, 50, 80, 0.4)'
                      }}
                  >
                      Exit Roof View
                  </button>
              </Html>
          )}

          {rooftopViewCell && (
              <RooftopAvatar
                  position={[rooftopViewCell.worldX, rooftopViewCell.height / 2 + 0.2, rooftopViewCell.worldZ]}
                  glowColor={zoneColor(theme, rooftopViewCell.zone)[1]}
              />
          )}

          {isFlying && helipadCell ? (
              <HelicopterFlightController
                  helipadCell={helipadCell}
                  bounds={model.bounds}
                  theme={theme}
                  onExit={exitFlight}
              />
          ) : null}

          <OrbitControls
              ref={controlsRef}
              enabled={!isFlying && (!rooftopViewCell || !isRoofAnimating)}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              minDistance={rooftopViewCell ? 2 : 18}
              maxDistance={rooftopViewCell ? 8 : Infinity}
              minPolarAngle={rooftopViewCell ? 0 : 0.22}
              maxPolarAngle={rooftopViewCell ? Math.PI / 1.8 : Math.PI / 2.02}
          />
          <EffectComposer enableNormalPass={false} multisampling={0}>
              <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          </EffectComposer>
      </group>
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const deferredState = useDeferredValue(state);
    const theme = STYLE_THEMES[state.cityStyle];
    const captureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleFullscreenChange() {
            setIsFullscreen(document.fullscreenElement === captureRef.current);
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    function patchState(patch: Partial<EditorState>) {
        startTransition(() => {
            setState((current) => ({ ...current, ...patch }));
        });
    }

    async function toggleFullscreen() {
        if (!captureRef.current) return;

        if (isFullscreen && !document.fullscreenElement) {
            setIsFullscreen(false);
            return;
        }

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await captureRef.current.requestFullscreen();
            }
        } catch {
            setIsFullscreen((current) => !current);
        }
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
            className={
                isFullscreen
                    ? "relative h-screen w-screen overflow-hidden bg-[#05070b] text-white"
                    : embedded
                        ? "relative h-[calc(100vh-12rem)] min-h-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[#05070b] text-white"
                        : "relative min-h-screen overflow-hidden bg-[#05070b] text-white"
            }
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

          <div className={
              isFullscreen
                  ? "absolute inset-0 overflow-hidden bg-black/18"
                  : embedded
                      ? "absolute inset-0 overflow-hidden rounded-[34px] bg-black/18 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"
                      : "absolute left-6 right-6 top-24 bottom-28 overflow-hidden rounded-[34px] border border-white/10 bg-black/18 shadow-[0_30px_120px_rgba(0,0,0,0.38)]"
          }
          >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,rgba(0,0,0,0.18))]" />
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
              {!embedded && !isFullscreen ? (
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
                                  onClick={toggleFullscreen}
                                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                              >
                                  {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
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

              {embedded || isFullscreen ? (
                  <div className="pointer-events-auto absolute right-6 top-6 z-20">
                      <button
                          type="button"
                          onClick={toggleFullscreen}
                          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,14,0.88),rgba(6,10,14,0.72))] px-4 text-sm font-semibold text-white backdrop-blur-2xl transition hover:bg-white/[0.1]"
                      >
                          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                      </button>
                  </div>
              ) : null}

              {!isFullscreen ? <motion.div
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
              </motion.div> : null}
          </div>
      </main>
  );
}

if (HAS_TREE_MODEL) {
    useGLTF.preload(TREE_MODEL_PATH);
}
