"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as THREE from "three";

import type { CityModel, CityStyle, RoadSegment, StyleTheme } from "../types";
import { ROAD_SVG_SOURCE, clamp } from "../utils";

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

export function ProceduralRoad({
  road,
  theme,
  cityStyle,
  bounds,
}: {
  road: RoadSegment;
  theme: StyleTheme;
  cityStyle: CityStyle;
  bounds: CityModel["bounds"];
}) {
  return (
    <group position={road.position}>
      <mesh receiveShadow>
        <boxGeometry args={road.size} />
        <meshStandardMaterial
          color={theme.road}
          emissive={theme.roadGlow}
          emissiveIntensity={cityStyle === "cyberpunk" ? 2.2 : cityStyle === "tokyo-dense" ? 2.05 : 0.24}
          roughness={cityStyle === "cyberpunk" ? 0.24 : 0.96}
          metalness={cityStyle === "cyberpunk" ? 0.56 : 0.05}
        />
      </mesh>
      {road.axis !== "junction" ? (
        <>
          <mesh position={[0, 0.028, 0]} receiveShadow>
            <boxGeometry args={[road.axis === "x" ? road.size[0] : road.size[0] * 0.28, 0.012, road.axis === "x" ? road.size[2] * 0.28 : road.size[2]]} />
            <meshStandardMaterial color="#0b0e14" roughness={1} />
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
          {Math.abs(road.position[0]) > (bounds.width / 2) - 4 &&
          Math.abs(road.position[2]) > (bounds.depth / 2) - 4
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
  );
}
