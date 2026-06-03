"use client";

import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { max, mean } from "d3-array";
import { scaleLinear } from "d3-scale";
import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as THREE from "three";

export type GitCityDay = {
  date?: string;
  count: number;
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
  color: string;
  emissive: string;
  emissiveIntensity: number;
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
};

type Road = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
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
const HEIGHT_PER_COMMIT = 0.34;
const MAX_VISUAL_HEIGHT = 8.8;

const ZERO_DAY_COLOR = "#151b19";
const CITY_DARK = new THREE.Color("#111917");
const CITY_GREEN = new THREE.Color("#294b35");

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

function normalizeYear(data: GitCityDay[]) {
  if (data.length === 0) return DEFAULT_DAYS;

  const sanitizedDays = data.slice(-DAYS_IN_YEAR).map((day) => ({
    date: day.date,
    count: Math.max(0, day.count),
  }));

  if (sanitizedDays.length >= DAYS_IN_YEAR) return sanitizedDays;

  return [
    ...Array.from(
      { length: DAYS_IN_YEAR - sanitizedDays.length },
      (_, index) => ({ date: `empty-${index}`, count: 0 }),
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

function buildCityBlocks(data: GitCityDay[]): CityBuilding[] {
  const days = normalizeYear(data);
  const peakCount = Math.max(max(days, (day) => day.count) ?? 0, 10);
  const columnCount = Math.ceil(DAYS_IN_YEAR / DAYS_PER_WEEK);
  const cellPitch = CELL_SIZE + CELL_GAP;
  const heightScale = scaleLinear()
    .domain([0, peakCount])
    .range([MIN_BUILDING_HEIGHT, MAX_VISUAL_HEIGHT])
    .clamp(true);
  const colorScale = scaleLinear<string>()
    .domain([0, peakCount * 0.42, peakCount])
    .range(["#173321", "#2fd46b", "#b6ffd0"])
    .clamp(true);
  const emissiveScale = scaleLinear<string>()
    .domain([0, peakCount * 0.48, peakCount])
    .range(["#092010", "#35ff7d", "#e8fff0"])
    .clamp(true);
  const emissiveIntensityScale = scaleLinear()
    .domain([0, peakCount])
    .range([0.72, 3.2])
    .clamp(true);

  return days.map((day, index) => {
    const count = Math.max(0, day.count);
    const week = Math.floor(index / DAYS_PER_WEEK);
    const weekday = index % DAYS_PER_WEEK;
    const x = (week - columnCount / 2) * cellPitch;
    const z = (weekday - DAYS_PER_WEEK / 2) * cellPitch;
    const height = count === 0
      ? STREET_TILE_HEIGHT
      : Math.max(MIN_BUILDING_HEIGHT, Math.min(MAX_VISUAL_HEIGHT, count * HEIGHT_PER_COMMIT, heightScale(count)));

    return {
      key: day.date ?? `${index}-${count}`,
      date: day.date,
      index,
      count,
      position: [x, height / 2, z],
      height,
      color: count === 0 ? ZERO_DAY_COLOR : colorScale(count),
      emissive: count === 0 ? "#041008" : emissiveScale(count),
      emissiveIntensity: count === 0 ? 0.08 : emissiveIntensityScale(count),
    };
  });
}

function buildRoads(): Road[] {
  return [
    { key: "front-road", position: [0, 0.08, 7.9], size: [62, 0.16, 1.55] },
    { key: "back-road", position: [0, 0.08, -8.8], size: [62, 0.16, 1.45] },
    { key: "mid-road", position: [0, 0.1, -5.75], size: [62, 0.14, 1.05] },
    { key: "left-avenue", position: [-27.2, 0.1, 0], size: [1.4, 0.15, 25] },
    { key: "right-avenue", position: [27.2, 0.1, 0], size: [1.4, 0.15, 25] },
    { key: "skyway-front", position: [0, 1.45, 10.7], size: [58, 0.2, 0.9] },
    { key: "skyway-left", position: [-19, 1.7, 0], size: [0.85, 0.2, 24] },
  ];
}

function formatCityDate(date?: string) {
  if (!date || date.startsWith("empty-")) return "No activity";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function buildSkyline(seed: number): SkylineTower[] {
  const random = createSeededRandom(seed || 713);
  const towers: SkylineTower[] = [];

  const addTower = (x: number, z: number, index: number, depthBias = 1) => {
    const footprint = 1.15 + random() * 1.75;
    const depth = footprint * (0.8 + random() * 0.55) * depthBias;
    const height = 2.4 + random() * 8.8 + (Math.abs(z) > 7 ? 1.7 : 0);
    const color = CITY_DARK.clone().lerp(CITY_GREEN, 0.2 + random() * 0.45).getStyle();
    const emissive = new THREE.Color("#07110d").lerp(new THREE.Color("#7dffb2"), 0.08 + random() * 0.22).getStyle();

    towers.push({
      key: `tower-${index}`,
      position: [x, height / 2, z],
      size: [footprint, height, depth],
      color,
      emissive,
      emissiveIntensity: 0.25 + random() * 0.35,
      bandCount: 2 + Math.floor(random() * 6),
      hasSpire: random() > 0.58,
      hasCrown: random() > 0.45,
    });
  };

  for (let i = 0; i < 58; i += 1) {
    const x = -30 + (i % 29) * 2.18 + (random() - 0.5) * 0.75;
    const z = i < 29 ? -11.4 - random() * 4.6 : 9.2 + random() * 5.8;
    addTower(x, z, i);
  }

  for (let i = 0; i < 44; i += 1) {
    const leftSide = i % 2 === 0;
    const x = (leftSide ? -32 : 32) + (random() - 0.5) * 4.5;
    const z = -9.8 + Math.floor(i / 2) * 1.18 + (random() - 0.5) * 1.1;
    addTower(x, z, 60 + i, 0.9);
  }

  for (let i = 0; i < 44; i += 1) {
    const lane = i % 4;
    const x = -25 + Math.floor(i / 4) * 4.8 + (random() - 0.5) * 1.4;
    const z = lane < 2 ? -6.9 + lane * 1.35 : 6.25 + (lane - 2) * 1.4;
    addTower(x, z, 120 + i, 0.72);
  }

  return towers;
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
            color={index === 1 ? "#7dff9c" : "#183024"}
            emissive={index === 1 ? "#6eff9c" : "#1fff69"}
            emissiveIntensity={index === 1 ? 1.7 : 0.65}
            metalness={0.45}
            roughness={0.24}
          />
        </mesh>
      ))}
      <mesh position={[1.38, 0.03, 0]} castShadow>
        <boxGeometry args={[0.24, 0.22, 0.42]} />
        <meshStandardMaterial
          color="#ecfff2"
          emissive="#baffcf"
          emissiveIntensity={2.2}
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

function AnimatedContributionBlock({
  building,
  onHover,
  onLeave,
}: {
  building: CityBuilding;
  onHover: (building: CityBuilding) => void;
  onLeave: () => void;
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

  return (
    <group
      ref={groupRef}
      position={building.position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CELL_SIZE, building.height, CELL_SIZE]} />
        <meshStandardMaterial
          ref={materialRef}
          color={building.color}
          emissive={building.emissive}
          emissiveIntensity={building.emissiveIntensity}
          metalness={0.42}
          roughness={0.28}
        />
      </mesh>

      {building.count > 0
        ? Array.from({ length: Math.min(6, Math.max(1, Math.floor(building.height / 0.7))) }, (_, index) => (
          <mesh
            key={`${building.key}-slice-${index}`}
            position={[0, -building.height / 2 + (index + 1) * (building.height / 7), 0]}
          >
            <boxGeometry args={[CELL_SIZE * 1.02, 0.05, CELL_SIZE * 1.02]} />
            <meshStandardMaterial
              color="#effff3"
              emissive="#c9ffdc"
              emissiveIntensity={1.45}
              transparent
              opacity={0.74}
            />
          </mesh>
        ))
        : null}
    </group>
  );
}

function GitCityScene({
  data,
  onBuildingHover,
  onBuildingLeave,
}: {
  data: GitCityDay[];
  onBuildingHover: (building: CityBuilding) => void;
  onBuildingLeave: () => void;
}) {
  const normalizedDays = useMemo(() => normalizeYear(data), [data]);
  const buildings = useMemo(() => buildCityBlocks(normalizedDays), [normalizedDays]);
  const skyline = useMemo(() => {
    const seed = normalizedDays.reduce((sum, day, index) => sum + Math.max(0, day.count) * (index + 11), 0);
    return buildSkyline(seed);
  }, [normalizedDays]);
  const roads = useMemo(() => buildRoads(), []);
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
      <color attach="background" args={["#09090b"]} />
      <fog attach="fog" args={["#0b1512", 32, 88]} />

      <OrthographicCamera
        makeDefault
        position={[38, 34, 38]}
        zoom={18}
        near={0.1}
        far={180}
        onUpdate={(camera) => camera.lookAt(0, 0, 0)}
      />

      <ambientLight intensity={0.34} color="#d9ffe7" />
      <directionalLight position={[24, 38, 18]} intensity={1.65} color="#f4fff8" />
      <pointLight position={[0, 12, 0]} intensity={1.55} color="#47ff86" />
      <pointLight position={[-18, 8, 12]} intensity={0.9} color="#00ffaa" />
      <spotLight
        position={[0, 28, -18]}
        angle={0.5}
        penumbra={0.65}
        intensity={1.6}
        color="#b8ffd3"
      />

      <group ref={cityRef}>
        <gridHelper
          args={[74, 74, "#375044", "#14201c"]}
          position={[0, -0.02, 0]}
        />
        <mesh position={[0, -0.09, 0]} receiveShadow>
          <boxGeometry args={[70, 0.08, 31]} />
          <meshStandardMaterial
            color="#07100d"
            emissive="#06140d"
            emissiveIntensity={0.26}
            metalness={0.2}
            roughness={0.82}
          />
        </mesh>

        {roads.map((road) => (
          <mesh key={road.key} position={road.position} castShadow receiveShadow>
            <boxGeometry args={road.size} />
            <meshStandardMaterial
              color="#1b2423"
              emissive="#0d1d15"
              emissiveIntensity={0.28}
              metalness={0.42}
              roughness={0.5}
            />
          </mesh>
        ))}

        <RailTrack />

        {skyline.map((tower) => (
          <AnimatedTower key={tower.key} tower={tower} />
        ))}

        {/* The chronological year is arranged like GitHub's contribution grid: weeks on X, weekdays on Z. */}
        {buildings.map((building) => (
          <AnimatedContributionBlock
            key={building.key}
            building={building}
            onHover={onBuildingHover}
            onLeave={onBuildingLeave}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom
          mipmapBlur
          intensity={2.45}
          luminanceThreshold={0.06}
          luminanceSmoothing={0.24}
          radius={0.84}
        />
      </EffectComposer>

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan
        enableZoom
        minZoom={18}
        maxZoom={38}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.45}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </>
  );
}

function GitCityHud({
  data,
  hoveredBuilding,
}: {
  data: GitCityDay[];
  hoveredBuilding: CityBuilding | null;
}) {
  const normalizedDays = useMemo(() => normalizeYear(data), [data]);
  const activitySeries = useMemo(() => buildActivitySeries(normalizedDays), [normalizedDays]);
  const total = useMemo(
    () => activitySeries.reduce((sum, point) => sum + point.count, 0),
    [activitySeries],
  );
  const average = useMemo(() => Math.round(mean(activitySeries, (point) => point.count) ?? 0), [activitySeries]);
  const peak = useMemo(() => max(activitySeries, (point) => point.count) ?? 0, [activitySeries]);
  const hoveredIntensity = hoveredBuilding
    ? Math.round(clamp01(hoveredBuilding.count / Math.max(peak, 1)) * 100)
    : 0;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid gap-3 md:grid-cols-[260px_1fr]">
      <div className="rounded-lg border border-emerald-200/10 bg-black/40 p-3 shadow-[0_0_40px_rgba(34,197,94,0.12)] backdrop-blur-xl">
        {hoveredBuilding ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/55">
              Building Detail
            </p>
            <p className="mt-2 text-lg font-black leading-none text-emerald-50">
              {formatCityDate(hoveredBuilding.date)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Commits", value: hoveredBuilding.count.toLocaleString() },
                { label: "Height", value: hoveredBuilding.height.toFixed(1) },
                { label: "Signal", value: `${hoveredIntensity}%` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-emerald-100">{item.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/55">
              GitCity Signal
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: total.toLocaleString() },
                { label: "Avg", value: average.toLocaleString() },
                { label: "Peak", value: peak.toLocaleString() },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-emerald-100">{item.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="hidden h-[82px] rounded-lg border border-emerald-200/10 bg-black/34 px-3 py-2 backdrop-blur-xl md:block">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activitySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gitCityActivity" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#86efac" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="index" hide />
            <YAxis hide domain={[0, "dataMax"]} />
            <ChartTooltip
              cursor={{ stroke: "rgba(134,239,172,0.28)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(4, 12, 8, 0.92)",
                border: "1px solid rgba(134, 239, 172, 0.2)",
                borderRadius: 8,
                color: "#dcfce7",
                fontSize: 12,
              }}
              labelFormatter={(value) => `Day ${Number(value) + 1}`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#86efac"
              strokeWidth={2}
              fill="url(#gitCityActivity)"
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GitCity({ data = DEFAULT_DAYS, className }: GitCityProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(null);

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
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
      >
        <GitCityScene
          data={data}
          onBuildingHover={setHoveredBuilding}
          onBuildingLeave={() => setHoveredBuilding(null)}
        />
      </Canvas>
      <GitCityHud data={data} hoveredBuilding={hoveredBuilding} />
    </div>
  );
}
