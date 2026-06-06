const fs = require('fs');
const content = fs.readFileSync('/Users/shashwat/gitBento/app/components/raw.txt', 'utf-8');

function extract(startStr, endStr) {
  const start = content.indexOf(startStr);
  if (start === -1) return '';
  const end = content.indexOf(endStr, start);
  if (end === -1) return '';
  return content.substring(start, end);
}

const introFlyover = extract('// ─── Intro Flyover ───', '// ─── Rabbit Quest Flyover ───');
const rabbitFlyover = extract('// ─── Rabbit Quest Flyover ───', '// ─── Camera Focus (controls OrbitControls target) ───');
const cameraFocus = extract('// ─── Camera Focus (controls OrbitControls target) ───', '// ─── Mouse-Driven Flight ───');
const vehicleFlight = extract('// ─── Mouse-Driven Flight ───', '// ─── Sky Collectibles ───');
const skyCollectibles = extract('// ─── Sky Collectibles ───', '// ─── Camera Reset (after exiting fly mode) ───');

let out = `
"use client";
import { useRef, useEffect, useEffectEvent, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function PlaneModel() {
  const { scene } = useGLTF("/models/paper-plane.glb");
  return (
    <group scale={[3, 3, 3]} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={scene} />
    </group>
  );
}
useGLTF.preload("/models/paper-plane.glb");

const VehicleMesh = PlaneModel;

${introFlyover}
${rabbitFlyover}
${cameraFocus}
${vehicleFlight}
${skyCollectibles}

export { IntroFlyover, RabbitFlyover, CameraFocus, VehicleFlight, SkyCollectibles };
`;

// Remove types
out = out.replace(/import type \{ CityPlaza \} from "@\/lib\/github";/g, '');
out = out.replace(/import type \{ PendingRespawn, SelfPvpState \} from "@\/lib\/useFlyPresence";/g, '');
out = out.replace(/plazas: CityPlaza\[\]/g, 'plazas: any[]');
out = out.replace(/React.MutableRefObject<PendingRespawn \| null>/g, 'any');
out = out.replace(/React.MutableRefObject<SelfPvpState>/g, 'any');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', out);
console.log('Rewritten');
