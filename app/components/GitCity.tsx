"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export type GitCityDay = {
  count: number;
};

type GitCityProps = {
  data?: GitCityDay[];
  className?: string;
};

const DEFAULT_DAYS = Array.from({ length: 365 }, (_, index) => {
  const wave = Math.sin(index / 8) * 6 + Math.cos(index / 17) * 4;
  const noise = ((index * 13) % 11) / 2;
  return {
    count: Math.max(0, Math.round(wave + noise + 6)),
  };
});

const GRID_COLUMNS = 28;
const CELL_SIZE = 1;
const CELL_GAP = 0.24;
const BASE_HEIGHT = 0.2;
const HEIGHT_SCALE = 0.16;

export function GitCity({ data = DEFAULT_DAYS, className }: GitCityProps) {
  const normalizedData = useMemo(() => {
    return data.slice(0, 365).map((day) => ({
      count: Math.max(0, day.count),
    }));
  }, [data]);

  const buildings = useMemo(() => {
    const maxCount = Math.max(...normalizedData.map((day) => day.count), 1);

    return normalizedData.map((day, index) => {
      const column = index % GRID_COLUMNS;
      const row = Math.floor(index / GRID_COLUMNS);
      const x = (column - GRID_COLUMNS / 2) * (CELL_SIZE + CELL_GAP);
      const z = (row - Math.ceil(normalizedData.length / GRID_COLUMNS) / 2) * (CELL_SIZE + CELL_GAP);
      const intensity = day.count / maxCount;
      const height = BASE_HEIGHT + day.count * HEIGHT_SCALE;

      const color = new THREE.Color(
        day.count === 0
          ? "#2a2f3a"
          : new THREE.Color("#16351f").lerp(new THREE.Color("#4dff88"), intensity),
      );
      const emissive = new THREE.Color(
        day.count === 0 ? "#000000" : new THREE.Color("#0f2f18").lerp(new THREE.Color("#38ff7a"), intensity),
      );

      return {
        key: `${index}-${day.count}`,
        position: [x, height / 2, z] as const,
        height,
        color,
        emissive,
      };
    });
  }, [normalizedData]);

  return (
    <div
      className={
        className ??
        "relative h-[560px] w-full overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_24%),linear-gradient(180deg,#070b12_0%,#040608_100%)]"
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border border-emerald-300/15 bg-black/30 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-100/80 backdrop-blur-xl">
        GIT CITY
      </div>

      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={["#05070a"]} />

        <OrthographicCamera
          makeDefault
          position={[24, 22, 24]}
          zoom={26}
          near={0.1}
          far={200}
        />

        <ambientLight intensity={0.9} color="#a7f3d0" />
        <directionalLight
          castShadow
          position={[18, 28, 12]}
          intensity={1.7}
          color="#f8fafc"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00008}
        />
        <directionalLight position={[-18, 10, -10]} intensity={0.55} color="#22c55e" />
        <pointLight position={[0, 12, 0]} intensity={0.35} color="#34d399" />

        <group rotation={[0, Math.PI / 4, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#08110d" metalness={0.18} roughness={0.92} />
          </mesh>

          {buildings.map((building) => (
            <mesh
              key={building.key}
              castShadow
              receiveShadow
              position={building.position}
            >
              <boxGeometry args={[CELL_SIZE, building.height, CELL_SIZE]} />
              <meshStandardMaterial
                color={building.color}
                emissive={building.emissive}
                emissiveIntensity={0.85}
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
          ))}
        </group>

        <OrbitControls
          enablePan={false}
          minZoom={18}
          maxZoom={46}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.15}
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
