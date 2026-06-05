"use client";

import type { ComponentType } from "react";

import { GrassStrip } from "../nature/GrassStrip";
import type { Cell, StyleTheme } from "../types";

type ParkTreeComponent = ComponentType<{
  position: [number, number, number];
  scale?: number;
}>;

export function BuildingLot({
  cell,
  index,
  theme,
  ParkTree,
}: {
  cell: Cell;
  index: number;
  theme: StyleTheme;
  ParkTree: ParkTreeComponent;
}) {
  const lotWidth = cell.width + 1.25;
  const lotDepth = cell.depth + 1.35;
  const isDecorative = cell.isDecorative;
  const isResidential = cell.zone === "residential";
  const lotColor = isDecorative
    ? "#6d727b"
    : isResidential ? "#142018" : cell.zone === "industrial" ? "#17191c" : "#151b22";
  const stripColor = isDecorative ? "#69a85f" : isResidential ? "#4f9f46" : "#5fae54";
  const curbColor = isDecorative ? "#d4b6cf" : index % 2 === 0 ? theme.roadGlow : "#ff73e8";
  const sidewalkColor = isDecorative ? "#b6b3b8" : "#303846";

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
              <meshStandardMaterial color="#8a8f97" roughness={0.94} metalness={0.02} />
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
            color={isDecorative ? sidewalkColor : "#303846"}
            emissive={curbColor}
            emissiveIntensity={isDecorative ? 0.04 : curbIndex < 2 ? 0.12 : 0.06}
            roughness={0.34}
            metalness={0.38}
          />
        </mesh>
      ))}
    </group>
  );
}
