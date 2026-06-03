"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { max, mean } from "d3-array";
import { scaleLinear } from "d3-scale";
import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type GitCityDay = {
  date?: string;
  count: number;
  featuredRepo?: GitCityRepo | null;
};

export type GitCityRepo = {
  name: string;
  url: string;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  updatedAt?: string;
  source: "activity" | "top" | "updated";
};

type GitCityProps = {
  data?: GitCityDay[];
  className?: string;
};

type CityBuilding = {
  key: string;
  date?: string;
  index: number;
  count: number;
  position: [number, number, number];
  height: number;
  size: [number, number, number];
  color: string;
  emissive: string;
  emissiveIntensity: number;
  rotation: number;
  bandCount: number;
  capHeight: number;
  capInset: number;
  hasBeacon: boolean;
  facadeStyle: "plaza" | "bands" | "terrace" | "core";
  featuredRepo?: GitCityRepo | null;
  accent: string;
  accentSoft: string;
  seed: number;
};

type BackgroundBuilding = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
  seed: number;
  glow: string;
  opacity: number;
  depth: "near" | "mid" | "far";
};

type SkylineTower = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive: string;
  emissiveIntensity: number;
  bandCount: number;
  hasSpire: boolean;
  hasCrown: boolean;
  facadeStyle: "plain" | "circuit" | "windowGrid" | "glyph" | "stack";
  seed: number;
};

type Road = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive: string;
  emissiveIntensity: number;
};

type ActivityPoint = {
  index: number;
  count: number;
};

const DAYS_IN_YEAR = 365;
const DAYS_PER_WEEK = 7;
const CELL_SIZE = 0.78;
const CELL_GAP = 0.16;
const STREET_TILE_HEIGHT = 0.12;
const MIN_BUILDING_HEIGHT = 0.5;
const HEIGHT_PER_COMMIT = 0.22;
const MAX_VISUAL_HEIGHT = 6.4;
const WEEK_BLOCK_SIZE = 4;
const WEEK_STREET_GAP = 1.4;
const CENTER_AVENUE_GAP = 1.2;

const ZERO_DAY_COLOR = "#08110d";
const CITY_DARK = new THREE.Color("#09110d");
const CITY_GREEN = new THREE.Color("#163825");
const NEON_PALETTE = [
  { base: "#4d8f38", glow: "#a1d74f", soft: "#142417" },
  { base: "#2fc25c", glow: "#8cd95b", soft: "#152a19" },
  { base: "#6fa82f", glow: "#c3da64", soft: "#1a2814" },
];

const DEFAULT_DAYS: GitCityDay[] = Array.from(
  { length: DAYS_IN_YEAR },
  (_, index) => {
    const date = new Date(Date.UTC(2023, 0, 1 + index));
    const wave = Math.sin(index / 9) * 4 + Math.cos(index / 23) * 3;
    const burst = index % 47 === 0 ? 12 : index % 29 === 0 ? 7 : 0;
    const count = Math.max(0, Math.round(4 + wave + ((index * 11) % 9) + burst));

    return {
      date: date.toISOString().slice(0, 10),
      count,
    };
  },
);

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function hashNoise2D(seed: number, x: number, y: number) {
  const hashed = Math.sin((x * 127.1) + (y * 311.7) + (seed * 74.7)) * 43758.5453123;
  return hashed - Math.floor(hashed);
}

function sampleNoise2D(seed: number, x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hashNoise2D(seed, x0, y0);
  const n10 = hashNoise2D(seed, x1, y0);
  const n01 = hashNoise2D(seed, x0, y1);
  const n11 = hashNoise2D(seed, x1, y1);

  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

function sampleFractalNoise(seed: number, x: number, y: number, octaves = 4) {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let amplitudeSum = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += sampleNoise2D(seed + (octave * 101), x * frequency, y * frequency) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return amplitudeSum > 0 ? total / amplitudeSum : 0;
}

function deriveCitySeed(days: GitCityDay[]) {
  return days.reduce(
    (sum, day, index) => sum + (Math.max(0, day.count) + 1) * (index + 17),
    713,
  );
}

function getWeekAxisOffset(week: number) {
  const cellPitch = CELL_SIZE + CELL_GAP;
  return (week * cellPitch) + (Math.floor(week / WEEK_BLOCK_SIZE) * WEEK_STREET_GAP);
}

function getWeekAxisSpan(columnCount: number) {
  if (columnCount <= 1) return 0;
  return getWeekAxisOffset(columnCount - 1);
}

function getDayAxisOffset(day: number) {
  const cellPitch = CELL_SIZE + CELL_GAP;
  return (day * cellPitch) + (day >= 4 ? CENTER_AVENUE_GAP : 0);
}

function getDayAxisSpan() {
  return getDayAxisOffset(DAYS_PER_WEEK - 1);
}

function normalizeYear(data: GitCityDay[]) {
  if (data.length === 0) return DEFAULT_DAYS;

  const sanitizedDays = data.slice(-DAYS_IN_YEAR).map((day) => ({
    date: day.date,
    count: Math.max(0, day.count),
    featuredRepo: day.featuredRepo ?? null,
  }));

  if (sanitizedDays.length >= DAYS_IN_YEAR) return sanitizedDays;

  return [
    ...Array.from(
      { length: DAYS_IN_YEAR - sanitizedDays.length },
      (_, index) => ({ date: `empty-${index}`, count: 0, featuredRepo: null }),
    ),
    ...sanitizedDays,
  ];
}

function buildActivitySeries(days: GitCityDay[]): ActivityPoint[] {
  return days.map((day, index) => ({
    index,
    count: Math.max(0, day.count),
  }));
}

function buildCityBlocks(data: GitCityDay[], seed: number): CityBuilding[] {
  const days = normalizeYear(data);
  const peakCount = Math.max(max(days, (day) => day.count) ?? 0, 10);
  const columnCount = Math.ceil(DAYS_IN_YEAR / DAYS_PER_WEEK);
  const heightScale = scaleLinear()
    .domain([0, peakCount])
    .range([MIN_BUILDING_HEIGHT, MAX_VISUAL_HEIGHT])
    .clamp(true);
  const emissiveIntensityScale = scaleLinear()
    .domain([0, peakCount])
    .range([0.72, 3.2])
    .clamp(true);
  const centeredWeekSpan = getWeekAxisSpan(columnCount) / 2;
  const centeredDaySpan = getDayAxisSpan() / 2;

  return days.map((day, index) => {
    const count = Math.max(0, day.count);
    const week = Math.floor(index / DAYS_PER_WEEK);
    const weekday = index % DAYS_PER_WEEK;
    const districtNoise = sampleFractalNoise(seed, week * 0.19, weekday * 0.42, 5);
    const accentNoise = sampleFractalNoise(seed + 41, week * 0.53, weekday * 0.71, 3);
    const detailNoise = sampleFractalNoise(seed + 97, week * 1.2, weekday * 1.4, 2);
    const x = (getWeekAxisOffset(week) - centeredWeekSpan) + ((accentNoise - 0.5) * (count > 0 ? 0.12 : 0.04));
    const z = (getDayAxisOffset(weekday) - centeredDaySpan) + ((districtNoise - 0.5) * (count > 0 ? 0.1 : 0.03));
    const height = count === 0
      ? STREET_TILE_HEIGHT
      : Math.max(MIN_BUILDING_HEIGHT, Math.min(MAX_VISUAL_HEIGHT, count * HEIGHT_PER_COMMIT, heightScale(count)));
    const width = count === 0
      ? CELL_SIZE * (0.68 + (districtNoise * 0.08))
      : CELL_SIZE * (0.72 + (districtNoise * 0.12));
    const depth = count === 0
      ? CELL_SIZE * (0.72 + (accentNoise * 0.08))
      : CELL_SIZE * (0.76 + (accentNoise * 0.12));
    const bandCount = count === 0 ? 0 : 1 + Math.floor(clamp01(height / MAX_VISUAL_HEIGHT) * 4 + detailNoise * 2);
    const capHeight = count > 3
      ? Math.min(1.2, 0.12 + (height * (0.1 + (accentNoise * 0.12))))
      : 0;
    const capInset = 0.58 + (detailNoise * 0.18);
    const hasBeacon = count > peakCount * 0.72 && detailNoise > 0.58;
    const facadeStyle = count === 0
      ? "plaza"
      : detailNoise > 0.72
        ? "core"
        : detailNoise > 0.48
          ? "terrace"
          : "bands";
    const rotation = count === 0 ? 0 : (Math.round(districtNoise * 3) * Math.PI) / 2;
    const palette = NEON_PALETTE[Math.floor(detailNoise * NEON_PALETTE.length) % NEON_PALETTE.length];
    const countStrength = clamp01(count / peakCount);
    const color = count === 0
      ? new THREE.Color(ZERO_DAY_COLOR)
        .lerp(new THREE.Color(palette.soft), 0.24 + (districtNoise * 0.12))
        .getStyle()
      : new THREE.Color("#0f171b")
        .lerp(new THREE.Color(palette.base), 0.38 + (countStrength * 0.36) + (districtNoise * 0.08))
        .getStyle();
    const emissive = count === 0
      ? new THREE.Color("#06110d")
        .lerp(new THREE.Color(palette.soft), 0.22 + (accentNoise * 0.14))
        .getStyle()
      : new THREE.Color("#091015")
        .lerp(new THREE.Color(palette.glow), 0.22 + (countStrength * 0.42) + (accentNoise * 0.1))
        .getStyle();

    return {
      key: day.date ?? `${index}-${count}`,
      date: day.date,
      index,
      count,
      position: [x, height / 2, z],
      height,
      size: [width, height, depth],
      color,
      emissive,
      emissiveIntensity: count === 0 ? 0.08 + (districtNoise * 0.08) : emissiveIntensityScale(count) * (0.92 + (accentNoise * 0.16)),
      rotation,
      bandCount,
      capHeight,
      capInset,
      hasBeacon,
      facadeStyle,
      featuredRepo: day.featuredRepo ?? null,
      accent: palette.base,
      accentSoft: palette.glow,
      seed: seed + (index * 37),
    };
  });
}

function buildRoads(seed: number): Road[] {
  const columnCount = Math.ceil(DAYS_IN_YEAR / DAYS_PER_WEEK);
  const weekSpan = getWeekAxisSpan(columnCount);
  const daySpan = getDayAxisSpan();
  const gridWidth = weekSpan + (CELL_SIZE * 1.6);
  const gridDepth = daySpan + (CELL_SIZE * 1.6);
  const roads: Omit<Road, "color" | "emissive" | "emissiveIntensity">[] = [
    { key: "front-road", position: [0, 0.08, (gridDepth / 2) + 1.1], size: [gridWidth + 4, 0.16, 1.6] },
    { key: "back-road", position: [0, 0.08, -((gridDepth / 2) + 1.1)], size: [gridWidth + 4, 0.16, 1.4] },
    { key: "center-avenue", position: [0, 0.08, 0.5], size: [gridWidth + 1.8, 0.14, 1.1] },
  ];

  for (let boundary = WEEK_BLOCK_SIZE; boundary < columnCount; boundary += WEEK_BLOCK_SIZE) {
    const previous = getWeekAxisOffset(boundary - 1);
    const next = getWeekAxisOffset(boundary);
    const x = ((previous + next) / 2) - (weekSpan / 2);
    roads.push({
      key: `week-avenue-${boundary}`,
      position: [x, 0.08, 0],
      size: [0.95, 0.16, gridDepth + 3.4],
    });
  }

  return roads.map((road, index) => {
    const glowNoise = sampleFractalNoise(seed + 211, index * 0.34, road.position[2] * 0.08, 3);
    return {
      ...road,
      color: new THREE.Color("#1b2423").lerp(new THREE.Color("#284238"), glowNoise * 0.28).getStyle(),
      emissive: new THREE.Color("#0d1d15").lerp(new THREE.Color("#1fff69"), glowNoise * 0.12).getStyle(),
      emissiveIntensity: 0.22 + (glowNoise * 0.22),
    };
  });
}

function formatCityDate(date?: string) {
  if (!date || date.startsWith("empty-")) return "No activity";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatRepoDate(date?: string) {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function buildBackdropBuildings(seed: number): BackgroundBuilding[] {
  const buildings: BackgroundBuilding[] = [];
  const random = createSeededRandom(seed + 901);
  const columns = 28;
  const rows = 16;
  const pitchX = 2.8;
  const pitchZ = 2.9;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const isRoadColumn = column % 5 === 0;
      const isRoadRow = row % 6 === 0;
      if (isRoadColumn || isRoadRow) continue;

      const x = (column - (columns / 2)) * pitchX + ((random() - 0.5) * 0.45);
      const z = -26 - (row * pitchZ) - ((random() - 0.5) * 0.6);
      const zoneNoise = sampleFractalNoise(seed + 333, column * 0.18, row * 0.12, 4);
      const height = 1.8 + (zoneNoise * 7.2) + ((1 - (row / rows)) * 4.4);
      const width = 1.5 + (random() * 0.72);
      const depth = 1.4 + (random() * 0.7);
      const glow = row < 8 ? "#9fd34a" : row < 16 ? "#7eb33d" : "#5a8b30";
      const opacity = row < 5 ? 0.14 : row < 10 ? 0.1 : 0.06;
      const depthBand = row < 8 ? "near" : row < 16 ? "mid" : "far";

      buildings.push({
        key: `bg-${row}-${column}`,
        position: [x, height / 2, z],
        size: [width, height, depth],
        seed: (row * 1000) + column + seed,
        glow,
        opacity,
        depth: depthBand,
      });
    }
  }

  return buildings;
}

function buildSkyline(seed: number): SkylineTower[] {
  const random = createSeededRandom(seed || 713);
  const towers: SkylineTower[] = [];

  const addTower = (x: number, z: number, index: number, depthBias = 1) => {
    const zoneNoise = sampleFractalNoise(seed + 17, x * 0.07, z * 0.09, 4);
    const detailNoise = sampleFractalNoise(seed + 89, x * 0.21, z * 0.18, 3);
    const footprint = 0.95 + random() * 0.92 + (zoneNoise * 0.35);
    const depth = footprint * (0.8 + random() * 0.45 + detailNoise * 0.14) * depthBias;
    const height = 2.2 + random() * 4.4 + (Math.abs(z) > 7 ? 1.2 : 0) + (zoneNoise * 1.4);
    const color = CITY_DARK.clone().lerp(CITY_GREEN, 0.18 + random() * 0.28 + zoneNoise * 0.16).getStyle();
    const emissive = new THREE.Color("#07110d").lerp(new THREE.Color("#7dffb2"), 0.08 + random() * 0.14 + detailNoise * 0.1).getStyle();

    const facadeRoll = random();

    towers.push({
      key: `tower-${index}`,
      position: [x + ((detailNoise - 0.5) * 0.55), height / 2, z + ((zoneNoise - 0.5) * 0.4)],
      size: [footprint, height, depth],
      color,
      emissive,
      emissiveIntensity: 0.22 + random() * 0.2 + detailNoise * 0.16,
      bandCount: 2 + Math.floor(random() * 4 + zoneNoise * 2),
      hasSpire: random() + detailNoise * 0.2 > 0.62,
      hasCrown: random() + zoneNoise * 0.18 > 0.46,
      facadeStyle: facadeRoll > 0.84
        ? "circuit"
        : facadeRoll > 0.68
          ? "glyph"
          : facadeRoll > 0.42
            ? "windowGrid"
            : facadeRoll > 0.24
              ? "stack"
              : "plain",
      seed: Math.floor(random() * 100000) + index * 97,
    });
  };

  for (let i = 0; i < 8; i += 1) {
    const x = -28 + (i % 4) * 14.5 + (random() - 0.5) * 0.75;
    const z = i < 4 ? -46.4 - random() * 6.4 : -60.4 - random() * 8.4;
    addTower(x, z, i);
  }

  return towers;
}

function drawCanvasFacade(seed: number, style: SkylineTower["facadeStyle"]) {
  if (typeof document === "undefined" || style === "plain") return null;

  const random = createSeededRandom(seed);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(6, 18, 11, 0.72)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const rows = style === "windowGrid" ? 18 : style === "stack" ? 14 : 16;
  const columns = style === "circuit" ? 8 : style === "glyph" ? 7 : 9;
  const marginX = 10;
  const marginY = 14;
  const cellWidth = (canvas.width - (marginX * 2)) / columns;
  const cellHeight = (canvas.height - (marginY * 2)) / rows;

  context.shadowColor = "rgba(173, 255, 110, 0.45)";
  context.shadowBlur = 3;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lightChance = style === "circuit"
        ? 0.34
        : style === "glyph"
          ? 0.26
          : style === "stack"
            ? 0.42
            : 0.52;

      if (random() > lightChance) continue;

      const x = marginX + (column * cellWidth) + 1;
      const y = marginY + (row * cellHeight) + 1;
      const w = Math.max(3, cellWidth * (0.45 + (random() * 0.2)));
      const h = Math.max(4, cellHeight * (0.38 + (random() * 0.22)));
      const hue = random() > 0.86 ? "rgba(200, 235, 132, 0.88)" : "rgba(143, 211, 74, 0.82)";

      context.fillStyle = hue;
      context.fillRect(x, y, w, h);
    }
  }

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(18, 50, 24, 0.32)";
  context.lineWidth = 1;
  for (let row = 0; row <= rows; row += 1) {
    const y = marginY + (row * cellHeight);
    context.beginPath();
    context.moveTo(marginX, y);
    context.lineTo(canvas.width - marginX, y);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

function WindowFacadePanels({
  seed,
  style,
  size,
  frontOpacity = 0.9,
  sideOpacity = 0.7,
}: {
  seed: number;
  style: SkylineTower["facadeStyle"];
  size: [number, number, number];
  frontOpacity?: number;
  sideOpacity?: number;
}) {
  const facadeTexture = useMemo(
    () => drawCanvasFacade(seed, style),
    [seed, style],
  );

  useLayoutEffect(() => {
    return () => {
      facadeTexture?.dispose();
    };
  }, [facadeTexture]);

  if (!facadeTexture) return null;

  const [width, height, depth] = size;
  const frontPanelWidth = width * 0.72;
  const sidePanelWidth = depth * 0.72;
  const panelHeight = height * 0.74;
  const y = -height * 0.02;

  return (
    <>
      <mesh position={[0, y, depth / 2 + 0.006]}>
        <planeGeometry args={[frontPanelWidth, panelHeight]} />
        <meshBasicMaterial
          map={facadeTexture}
          transparent
          opacity={frontOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh position={[width / 2 + 0.006, y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[sidePanelWidth, panelHeight]} />
        <meshBasicMaterial
          map={facadeTexture}
          transparent
          opacity={sideOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}

function RailTrack() {
  const sleepers = useMemo(
    () => Array.from({ length: 34 }, (_, index) => -31 + index * 1.9),
    [],
  );

  return (
    <group position={[0, 0.28, 8.75]}>
      <mesh position={[0, 0.08, -0.24]} castShadow receiveShadow>
        <boxGeometry args={[64, 0.12, 0.08]} />
        <meshStandardMaterial
          color="#263531"
          emissive="#13321f"
          emissiveIntensity={0.42}
          metalness={0.68}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[0, 0.08, 0.24]} castShadow receiveShadow>
        <boxGeometry args={[64, 0.12, 0.08]} />
        <meshStandardMaterial
          color="#263531"
          emissive="#13321f"
          emissiveIntensity={0.42}
          metalness={0.68}
          roughness={0.26}
        />
      </mesh>

      {sleepers.map((x) => (
        <mesh key={x} position={[x, 0.01, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.08, 0.9]} />
          <meshStandardMaterial
            color="#111a17"
            emissive="#07140d"
            emissiveIntensity={0.2}
            metalness={0.25}
            roughness={0.58}
          />
        </mesh>
      ))}

      <AnimatedTrain />
    </group>
  );
}

function AnimatedTrain() {
  const trainRef = useRef<THREE.Group>(null);
  const cabinPulseRef = useRef<THREE.MeshStandardMaterial>(null);
  const trainPalette = ["#25f2ff", "#ff4fd8", "#ffb347"];
  const trainGlow = ["#86fbff", "#ff9bee", "#ffe19f"];

  useLayoutEffect(() => {
    if (!trainRef.current) return;

    gsap.fromTo(
      trainRef.current.position,
      { x: -32 },
      { x: 32, duration: 13, repeat: -1, ease: "none" },
    );

    if (cabinPulseRef.current) {
      gsap.to(cabinPulseRef.current, {
        emissiveIntensity: 2.4,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, []);

  return (
    <group ref={trainRef} position={[-32, 0.42, 0]}>
      {[-0.9, 0, 0.9].map((offset, index) => (
        <mesh key={offset} position={[offset, 0, 0]} castShadow>
          <boxGeometry args={[0.74, 0.42, 0.52]} />
          <meshStandardMaterial
            ref={index === 1 ? cabinPulseRef : undefined}
            color={trainPalette[index]}
            emissive={trainGlow[index]}
            emissiveIntensity={index === 1 ? 1.95 : 1.2}
            metalness={0.45}
            roughness={0.24}
          />
        </mesh>
      ))}
      <mesh position={[1.38, 0.03, 0]} castShadow>
        <boxGeometry args={[0.24, 0.22, 0.42]} />
        <meshStandardMaterial
          color="#f6fbff"
          emissive="#86fbff"
          emissiveIntensity={2.6}
        />
      </mesh>
    </group>
  );
}

function AnimatedTower({ tower }: { tower: SkylineTower }) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const delay = 0.08 + Math.abs(tower.position[0]) * 0.004 + Math.abs(tower.position[2]) * 0.01;
    gsap.fromTo(
      groupRef.current.scale,
      { y: 0.12 },
      { y: 1, duration: 1.25, delay, ease: "power3.out" },
    );
    gsap.fromTo(
      groupRef.current.position,
      { y: tower.position[1] - tower.size[1] * 0.44 },
      { y: tower.position[1], duration: 1.25, delay, ease: "power3.out" },
    );
  }, [tower.position, tower.size]);

  return (
    <group ref={groupRef} position={tower.position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={tower.size} />
        <meshStandardMaterial
          color={tower.color}
          emissive={tower.emissive}
          emissiveIntensity={tower.emissiveIntensity}
          metalness={0.5}
          roughness={0.32}
        />
      </mesh>

      <WindowFacadePanels
        seed={tower.seed}
        style={tower.facadeStyle}
        size={tower.size}
      />

      {Array.from({ length: tower.bandCount }, (_, index) => {
        const bandY = -tower.size[1] / 2 + ((index + 1) / (tower.bandCount + 1)) * tower.size[1];
        return (
          <mesh key={`${tower.key}-band-${index}`} position={[0, bandY, 0]}>
            <boxGeometry args={[tower.size[0] * 1.03, 0.07, tower.size[2] * 1.03]} />
            <meshStandardMaterial
              color="#b9ffd3"
              emissive="#8cffb6"
              emissiveIntensity={1.2}
              transparent
              opacity={0.86}
            />
          </mesh>
        );
      })}

      {tower.hasCrown ? (
        <mesh position={[0, tower.size[1] / 2 + 0.18, 0]}>
          <boxGeometry args={[tower.size[0] * 0.72, 0.36, tower.size[2] * 0.72]} />
          <meshStandardMaterial
            color="#1f3228"
            emissive="#4dff92"
            emissiveIntensity={0.55}
            metalness={0.48}
            roughness={0.25}
          />
        </mesh>
      ) : null}

      {tower.hasSpire ? (
        <mesh position={[0, tower.size[1] / 2 + 0.68, 0]}>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial
            color="#9effbf"
            emissive="#7dff9c"
            emissiveIntensity={1.35}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function BackdropBuildingBlock({ building }: { building: BackgroundBuilding }) {
  return (
    <group position={building.position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={building.size} />
        <meshStandardMaterial
          color={building.depth === "near" ? "#0a120d" : building.depth === "mid" ? "#09100c" : "#070d0a"}
          emissive="#08140d"
          emissiveIntensity={0.12}
          metalness={0.16}
          roughness={0.9}
          transparent
          opacity={building.depth === "near" ? 0.98 : building.depth === "mid" ? 0.8 : 0.62}
        />
      </mesh>
      <WindowFacadePanels
        seed={building.seed}
        style="windowGrid"
        size={building.size}
        frontOpacity={building.opacity}
        sideOpacity={building.opacity * 0.78}
      />
    </group>
  );
}

function LandmarkSpire() {
  return (
    <group position={[32, 11, -34]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 22, 0.9]} />
        <meshStandardMaterial
          color="#06100b"
          emissive="#0b1b10"
          emissiveIntensity={0.18}
          metalness={0.32}
          roughness={0.44}
        />
      </mesh>
      <mesh position={[0.26, 0, 0]}>
        <boxGeometry args={[0.08, 22, 0.08]} />
        <meshStandardMaterial
          color="#c7ff9d"
          emissive="#66ff4d"
          emissiveIntensity={1.75}
        />
      </mesh>
      <mesh position={[-0.26, -1.8, 0]}>
        <boxGeometry args={[0.08, 18, 0.08]} />
        <meshStandardMaterial
          color="#c7ff9d"
          emissive="#66ff4d"
          emissiveIntensity={1.3}
        />
      </mesh>
      <mesh position={[0, 11.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.06, 10, 40]} />
        <meshStandardMaterial
          color="#79c23b"
          emissive="#3fff5d"
          emissiveIntensity={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

function HorizonSilhouette() {
  return (
    <group position={[0, 0, -52]}>
      {[
        { x: -30, h: 8.5, w: 12 },
        { x: -14, h: 10.5, w: 10 },
        { x: 2, h: 9.2, w: 14 },
        { x: 18, h: 11.4, w: 11 },
        { x: 32, h: 8.8, w: 12 },
      ].map((block, index) => (
        <mesh key={index} position={[block.x, block.h / 2, 0]}>
          <boxGeometry args={[block.w, block.h, 8]} />
          <meshStandardMaterial
            color="#050b08"
            emissive="#08110c"
            emissiveIntensity={0.08}
            roughness={0.98}
            metalness={0.02}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}
    </group>
  );
}

function AnimatedContributionBlock({
  building,
  onHover,
  onLeave,
  onSelect,
}: {
  building: CityBuilding;
  onHover: (building: CityBuilding) => void;
  onLeave: () => void;
  onSelect: (building: CityBuilding) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const distanceDelay = Math.abs(building.position[0]) * 0.006 + Math.abs(building.position[2]) * 0.02;
    gsap.fromTo(
      groupRef.current.scale,
      { y: 0.08 },
      { y: 1, duration: 0.95, delay: distanceDelay, ease: "expo.out" },
    );
    gsap.fromTo(
      groupRef.current.position,
      { y: Math.max(0.06, building.position[1] - building.height * 0.46) },
      { y: building.position[1], duration: 0.95, delay: distanceDelay, ease: "expo.out" },
    );

    if (building.count > 0 && materialRef.current) {
      gsap.to(materialRef.current, {
        emissiveIntensity: building.emissiveIntensity * 1.2,
        duration: 1.9 + (building.count % 4) * 0.18,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: distanceDelay,
      });
    }
  }, [building]);

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onHover(building);
    document.body.style.cursor = "pointer";
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onLeave();
    document.body.style.cursor = "";
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(building);
  }

  return (
    <group
      ref={groupRef}
      position={building.position}
      rotation={[0, building.rotation, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, (-building.height / 2) + 0.08, 0]} receiveShadow>
        <boxGeometry
          args={[
            Math.max(building.size[0] + 0.22, CELL_SIZE * 0.96),
            0.16,
            Math.max(building.size[2] + 0.22, CELL_SIZE * 0.96),
          ]}
        />
        <meshStandardMaterial
          color="#11271b"
          emissive="#0c1911"
          emissiveIntensity={0.06}
          metalness={0.08}
          roughness={0.94}
        />
      </mesh>

      <mesh castShadow receiveShadow>
        <boxGeometry args={building.size} />
        <meshStandardMaterial
          ref={materialRef}
          color={building.color}
          emissive={building.emissive}
          emissiveIntensity={building.emissiveIntensity}
          metalness={0.42}
          roughness={0.28}
        />
      </mesh>

      <WindowFacadePanels
        seed={building.seed}
        style="windowGrid"
        size={building.size}
        frontOpacity={building.count === 0 ? 0.12 : Math.min(0.9, 0.24 + (building.count * 0.06))}
        sideOpacity={building.count === 0 ? 0.08 : Math.min(0.7, 0.18 + (building.count * 0.04))}
      />

      {building.capHeight > 0 ? (
        <mesh position={[0, (building.height + building.capHeight) / 2, 0]}>
          <boxGeometry
            args={[
              building.size[0] * building.capInset,
              building.capHeight,
              building.size[2] * building.capInset,
            ]}
          />
          <meshStandardMaterial
            color="#eafff1"
            emissive={building.accentSoft}
            emissiveIntensity={0.9 + (building.capHeight * 0.24)}
            metalness={0.36}
            roughness={0.24}
          />
        </mesh>
      ) : null}

      {building.hasBeacon ? (
        <mesh position={[0, building.height / 2 + building.capHeight + 0.28, 0]}>
          <boxGeometry args={[0.08, 0.56, 0.08]} />
          <meshStandardMaterial
            color="#f3fff8"
            emissive={building.accentSoft}
            emissiveIntensity={1.7}
          />
        </mesh>
      ) : null}

      {building.facadeStyle === "core" ? (
        <mesh position={[0, 0, 0]}>
          <boxGeometry
            args={[
              building.size[0] * 0.44,
              building.height * 1.02,
              building.size[2] * 0.44,
            ]}
          />
          <meshStandardMaterial
            color="#effff3"
            emissive={building.accentSoft}
            emissiveIntensity={1.1}
            transparent
            opacity={0.82}
          />
        </mesh>
      ) : null}

      {building.count > 0
        ? Array.from({ length: Math.min(6, Math.max(1, building.bandCount)) }, (_, index) => (
          <mesh
            key={`${building.key}-slice-${index}`}
            position={[0, -building.height / 2 + (index + 1) * (building.height / 7), 0]}
          >
            <boxGeometry
              args={[
                building.size[0] * (building.facadeStyle === "terrace" ? 0.88 : 1.02),
                0.05,
                building.size[2] * (building.facadeStyle === "terrace" ? 0.88 : 1.02),
              ]}
            />
            <meshStandardMaterial
              color={building.accentSoft}
              emissive={building.accent}
              emissiveIntensity={0.46}
              transparent
              opacity={0.18}
            />
          </mesh>
        ))
        : (
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[building.size[0] * 0.78, 0.04, building.size[2] * 0.22]} />
            <meshStandardMaterial
              color="#23302c"
              emissive="#0f1f19"
              emissiveIntensity={0.22}
              metalness={0.2}
              roughness={0.62}
            />
          </mesh>
        )}
    </group>
  );
}

function GitCityScene({
  data,
  onBuildingHover,
  onBuildingLeave,
  onBuildingSelect,
}: {
  data: GitCityDay[];
  onBuildingHover: (building: CityBuilding) => void;
  onBuildingLeave: () => void;
  onBuildingSelect: (building: CityBuilding) => void;
}) {
  const normalizedDays = useMemo(() => normalizeYear(data), [data]);
  const citySeed = useMemo(() => deriveCitySeed(normalizedDays), [normalizedDays]);
  const buildings = useMemo(() => buildCityBlocks(normalizedDays, citySeed), [normalizedDays, citySeed]);
  const skyline = useMemo(() => buildSkyline(citySeed), [citySeed]);
  const roads = useMemo(() => buildRoads(citySeed), [citySeed]);
  const cityRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!cityRef.current) return;

    gsap.fromTo(
      cityRef.current.rotation,
      { y: -0.025 },
      { y: 0.025, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" },
    );
  }, []);

  return (
    <>
      <color attach="background" args={["#04110b"]} />
      <fog attach="fog" args={["#07140d", 18, 112]} />

      <ambientLight intensity={0.16} color="#d9ffe7" />
      <directionalLight position={[18, 28, 20]} intensity={0.52} color="#d4ffd3" />
      <pointLight position={[0, 12, 4]} intensity={0.18} color="#7cff54" />
      <pointLight position={[-18, 10, 12]} intensity={0.12} color="#b8d86b" />
      <spotLight
        position={[14, 34, 14]}
        angle={0.4}
        penumbra={0.72}
        intensity={0.44}
        color="#b7ff8a"
      />

      <group ref={cityRef}>
        <mesh position={[0, 42, -74]}>
          <planeGeometry args={[180, 96]} />
          <meshBasicMaterial color="#0a2619" fog={false} />
        </mesh>
        <mesh position={[0, 22, -74]}>
          <planeGeometry args={[180, 40]} />
          <meshBasicMaterial color="#06140d" transparent opacity={0.42} fog={false} />
        </mesh>
        {[
          [-24, 44, -48],
          [-8, 40, -55],
          [12, 43, -52],
          [30, 47, -46],
        ].map((star, index) => (
          <mesh key={`star-${index}`} position={star as [number, number, number]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color="#d8f7c2" />
          </mesh>
        ))}
        <gridHelper
          args={[120, 72, "#102118", "#08120d"]}
          position={[0, -0.02, 0]}
        />
        <mesh position={[0, -0.09, 0]} receiveShadow>
          <boxGeometry args={[110, 0.08, 120]} />
          <meshStandardMaterial
            color="#06100c"
            emissive="#07150d"
            emissiveIntensity={0.1}
            metalness={0.08}
            roughness={0.96}
          />
        </mesh>

        {roads.map((road) => (
          <mesh key={road.key} position={road.position} castShadow receiveShadow>
            <boxGeometry args={road.size} />
            <meshStandardMaterial
              color="#243f32"
              emissive="#1a3325"
              emissiveIntensity={0.04}
              metalness={0.12}
              roughness={0.94}
            />
          </mesh>
        ))}

        <HorizonSilhouette />

        {skyline.map((tower) => (
          <AnimatedTower key={tower.key} tower={tower} />
        ))}

        <LandmarkSpire />

        {/* The chronological year is arranged like GitHub's contribution grid: weeks on X, weekdays on Z. */}
        {buildings.map((building) => (
          <AnimatedContributionBlock
            key={building.key}
            building={building}
            onHover={onBuildingHover}
            onLeave={onBuildingLeave}
            onSelect={onBuildingSelect}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom
          mipmapBlur
          intensity={0.18}
          luminanceThreshold={0.64}
          luminanceSmoothing={0.4}
          radius={0.38}
        />
      </EffectComposer>

      <OrbitControls
        makeDefault
        target={[0, 1.6, 6]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        minDistance={20}
        maxDistance={48}
        minPolarAngle={0.64}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.44}
        maxAzimuthAngle={0.28}
      />
    </>
  );
}

function GitCityHud({
  data,
  hoveredBuilding,
  selectedBuilding,
}: {
  data: GitCityDay[];
  hoveredBuilding: CityBuilding | null;
  selectedBuilding: CityBuilding | null;
}) {
  const normalizedDays = useMemo(() => normalizeYear(data), [data]);
  const activitySeries = useMemo(() => buildActivitySeries(normalizedDays), [normalizedDays]);
  const total = useMemo(
    () => activitySeries.reduce((sum, point) => sum + point.count, 0),
    [activitySeries],
  );
  const average = useMemo(() => Math.round(mean(activitySeries, (point) => point.count) ?? 0), [activitySeries]);
  const peak = useMemo(() => max(activitySeries, (point) => point.count) ?? 0, [activitySeries]);
  const repoBuilding = selectedBuilding ?? hoveredBuilding;
  const featuredRepo = repoBuilding?.featuredRepo ?? null;

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-4">
      <div className="rounded-2xl border border-emerald-200/10 bg-black/34 px-4 py-3 shadow-[0_0_40px_rgba(34,197,94,0.08)] backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/52">
          GitCity
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/32">Total</p>
            <p className="mt-1 font-black text-emerald-50">{total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/32">Avg</p>
            <p className="mt-1 font-black text-emerald-50">{average.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/32">Peak</p>
            <p className="mt-1 font-black text-emerald-50">{peak.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto w-[340px] rounded-[22px] border border-emerald-300/12 bg-[linear-gradient(180deg,rgba(7,15,10,0.92),rgba(5,10,8,0.94))] p-4 shadow-[0_0_50px_rgba(100,255,120,0.08)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/65">
              Repo Spotlight
            </p>
            <p className="mt-1 text-sm text-white/45">
              {repoBuilding ? formatCityDate(repoBuilding.date) : "Select a building"}
            </p>
          </div>
          {selectedBuilding ? (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
              Locked
            </span>
          ) : null}
        </div>

        {featuredRepo ? (
          <>
            <h3 className="mt-4 text-2xl font-black leading-none text-white">
              {featuredRepo.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {featuredRepo.description || "No description available for this repository yet."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Language", value: featuredRepo.language ?? "Unknown" },
                { label: "Updated", value: formatRepoDate(featuredRepo.updatedAt) },
                { label: "Stars", value: (featuredRepo.stars ?? 0).toLocaleString() },
                { label: "Forks", value: (featuredRepo.forks ?? 0).toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-50">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-white/38">
                Source: {featuredRepo.source === "activity" ? "Recent activity" : featuredRepo.source === "top" ? "Top repository" : "Recently updated"}
              </p>
              <a
                href={featuredRepo.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/18"
              >
                Open Repo
              </a>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-white/32">
              Repo spotlight is inferred from available profile activity and repository metadata.
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white/72">
              Click an active building to inspect a linked repository.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/42">
              Zero-activity blocks behave like plazas, so they won’t show a repo spotlight.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GitCity({ data = DEFAULT_DAYS, className }: GitCityProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<CityBuilding | null>(null);

  return (
    <div
      className={
        className
          ? `relative overflow-hidden bg-[#09090b] ${className}`
          : "relative h-[620px] w-full overflow-hidden rounded-[8px] bg-[#09090b]"
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(74,222,128,0.16),transparent_30%),linear-gradient(180deg,rgba(5,13,9,0.2),rgba(0,0,0,0.18))]" />
      <Canvas
        onPointerMissed={() => setSelectedBuilding(null)}
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, 13, 24],
          fov: 34,
          near: 0.1,
          far: 260,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.94,
        }}
      >
        <GitCityScene
          data={data}
          onBuildingHover={setHoveredBuilding}
          onBuildingLeave={() => setHoveredBuilding(null)}
          onBuildingSelect={setSelectedBuilding}
        />
      </Canvas>
      <GitCityHud
        data={data}
        hoveredBuilding={hoveredBuilding}
        selectedBuilding={selectedBuilding}
      />
    </div>
  );
}
