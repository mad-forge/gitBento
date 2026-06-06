"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// --- Inline types and helpers to replace missing imports ---
export type AdVehicle = "billboard" | "rooftop_sign" | "led_wrap" | "wall_mount";

export interface SkyAd {
  id: string;
  vehicle: AdVehicle;
  text: string;
  color: string;
  bgColor: string;
}

export function isBuildingAd(vehicle: string) {
  return ["billboard", "rooftop_sign", "led_wrap", "wall_mount"].includes(vehicle);
}

export const SCROLL_SPEED = 0.2;

export function createLedTexture(text: string, color: string, bgColor: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 32) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Neon glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.font = "bold 120px 'Courier New', monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const tickerText = `  ${text.toUpperCase()}  ★  `;
    const textWidth = ctx.measureText(tickerText).width;
    const step = Math.max(textWidth, 800);
    
    for (let x = step / 2; x < canvas.width * 2; x += step) {
        ctx.fillText(tickerText, x, canvas.height / 2 + 10);
        ctx.fillText(tickerText, x, canvas.height / 2 + 10);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return { tex, needsScroll: true };
}

export function markAdPointerConsumed() {}
export function registerAdMesh(mesh: THREE.Mesh) {}
export function unregisterAdMesh(mesh: THREE.Mesh) {}

export function ViewabilityTracker({ meshRefs, onAdViewed }: any) {
    return null;
}

// Minimal definition matching CityScene cells
export interface Cell {
    worldX: number;
    worldZ: number;
    width: number;
    depth: number;
    height: number;
    repo: { name: string };
}
// -----------------------------------------------------------

// Shared geometries — prevents GPU leaks on mount/unmount
const _box = /* @__PURE__ */ new THREE.BoxGeometry(1, 1, 1);
const _plane = /* @__PURE__ */ new THREE.PlaneGeometry(1, 1);
const _cylinder = /* @__PURE__ */ new THREE.CylinderGeometry(0.3, 0.4, 1, 6);

function adMeshRef(
  el: THREE.Mesh | null,
  prev: React.MutableRefObject<THREE.Mesh | null>,
  externalRef?: (el: THREE.Mesh | null) => void,
) {
  if (prev.current && prev.current !== el) {
    unregisterAdMesh(prev.current);
  }
  prev.current = el;
  if (el) registerAdMesh(el);
  externalRef?.(el);
}

function useAdInteraction(ad: SkyAd, onAdClick?: (ad: SkyAd) => void) {
  const handleClick = (e: any) => {
    e.stopPropagation();
    markAdPointerConsumed();
    onAdClick?.(ad);
  };
  return { handleClick };
}

function AdBillboard({ ad, building, meshRef, onAdClick }: {
  ad: SkyAd;
  building: Cell;
  meshRef?: (el: THREE.Mesh | null) => void;
  onAdClick?: (ad: SkyAd) => void;
}) {
  const { tex, needsScroll } = useMemo(
    () => createLedTexture(ad.text, ad.color, ad.bgColor),
    [ad.text, ad.color, ad.bgColor]
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissiveMap: tex,
        emissive: new THREE.Color(ad.color),
        emissiveIntensity: 2.5,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [tex, ad.color]
  );

  useEffect(() => {
    return () => { tex.dispose(); ledMat.dispose(); };
  }, [tex, ledMat]);

  useFrame(({ clock }) => {
    if (needsScroll) tex.offset.x = (clock.elapsedTime * SCROLL_SPEED) % 1;
  });

  const { handleClick } = useAdInteraction(ad, onAdClick);
  const prevMesh = useRef<THREE.Mesh | null>(null);
  useEffect(() => { return () => { if (prevMesh.current) unregisterAdMesh(prevMesh.current); }; }, []);

  const { width, depth, height } = building;
  // Keep billboard tightly proportioned to the building — no oversized minimums
  const panelW = width * 1.1;
  const panelH = panelW * 0.28;
  const frameT = 0.18;
  const strutH = panelH * 0.9;
  // Place just above the roofline with a short pole
  const poleH = height * 0.12 + 0.8;
  const y = height + poleH + panelH / 2;
  const zOff = depth / 2 + 0.15;

  return (
    <group position={[building.worldX, 0, building.worldZ]}>
      {/* Dark frame behind the screen */}
      <mesh position={[0, y, zOff - 0.18]} onClick={handleClick} geometry={_box} scale={[panelW + frameT * 2, panelH + frameT * 2, 0.18]}>
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* LED screen */}
      <mesh
        ref={(el) => adMeshRef(el, prevMesh, meshRef)}
        material={ledMat}
        position={[0, y, zOff + 0.05]}
        onClick={handleClick}
        geometry={_plane}
        scale={[panelW, panelH, 1]}
      />
      {/* Short support pole */}
      <mesh position={[0, height + poleH / 2, zOff - 0.18]} geometry={_box} scale={[0.18, poleH, 0.18]}>
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Side struts */}
      <mesh position={[-panelW * 0.28, y - panelH / 2 - strutH / 2, zOff - 0.15]} geometry={_box} scale={[0.12, strutH, 0.12]}>
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[panelW * 0.28, y - panelH / 2 - strutH / 2, zOff - 0.15]} geometry={_box} scale={[0.12, strutH, 0.12]}>
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function AdRooftopSign({ ad, building, meshRef, onAdClick }: {
  ad: SkyAd;
  building: Cell;
  meshRef?: (el: THREE.Mesh | null) => void;
  onAdClick?: (ad: SkyAd) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const { tex, needsScroll } = useMemo(
    () => createLedTexture(ad.text, ad.color, ad.bgColor),
    [ad.text, ad.color, ad.bgColor]
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissiveMap: tex,
        emissive: new THREE.Color(ad.color),
        emissiveIntensity: 2.5,
        toneMapped: false,
      }),
    [tex, ad.color]
  );

  useEffect(() => {
    return () => { tex.dispose(); ledMat.dispose(); };
  }, [tex, ledMat]);

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.4 * Math.min(delta, 0.05);
    }
    if (needsScroll) tex.offset.x = (clock.elapsedTime * SCROLL_SPEED) % 1;
  });

  const { handleClick } = useAdInteraction(ad, onAdClick);
  const prevMesh = useRef<THREE.Mesh | null>(null);
  useEffect(() => { return () => { if (prevMesh.current) unregisterAdMesh(prevMesh.current); }; }, []);

  const { width, height } = building;
  // Proportionate sign — just wider than building, reasonable height
  const signW = width * 1.15;
  const signH = width * 0.32;
  const poleH = height * 0.15 + 1.2;
  const poleBase = height;
  const poleY = poleBase + poleH / 2;
  const signY = poleBase + poleH + signH / 2;

  return (
    <group position={[building.worldX, 0, building.worldZ]}>
      {/* Main pole */}
      <mesh position={[0, poleY, 0]} geometry={_cylinder} scale={[0.6, poleH, 0.6]}>
        <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Spinning sign group */}
      <group ref={groupRef} position={[0, signY, 0]}>
        {/* Top crossbar */}
        <mesh position={[0, signH / 2 + 0.12, 0]} geometry={_box} scale={[signW + 0.4, 0.22, 0.3]}>
          <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Bottom crossbar */}
        <mesh position={[0, -signH / 2 - 0.12, 0]} geometry={_box} scale={[signW + 0.4, 0.22, 0.3]}>
          <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Front face */}
        <mesh
          ref={(el) => adMeshRef(el, prevMesh, meshRef)}
          material={ledMat}
          position={[0, 0, 0.08]}
          onClick={handleClick}
          geometry={_plane}
          scale={[signW, signH, 1]}
        />
        {/* Back face */}
        <mesh
          material={ledMat}
          position={[0, 0, -0.08]}
          rotation={[0, Math.PI, 0]}
          onClick={handleClick}
          geometry={_plane}
          scale={[signW, signH, 1]}
        />
      </group>
    </group>
  );
}

function AdLedWrap({ ad, building, meshRef, onAdClick }: {
  ad: SkyAd;
  building: Cell;
  meshRef?: (el: THREE.Mesh | null) => void;
  onAdClick?: (ad: SkyAd) => void;
}) {
  const { tex, needsScroll } = useMemo(
    () => createLedTexture(ad.text, ad.color, ad.bgColor),
    [ad.text, ad.color, ad.bgColor]
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissiveMap: tex,
        emissive: "#ffffff",
        emissiveIntensity: 1.2,
        toneMapped: false,
      }),
    [tex]
  );

  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ad.color,
        emissive: ad.color,
        emissiveIntensity: 2,
        toneMapped: false,
      }),
    [ad.color]
  );

  useEffect(() => {
    return () => { tex.dispose(); ledMat.dispose(); accentMat.dispose(); };
  }, [tex, ledMat, accentMat]);

  useFrame(({ clock }) => {
    if (needsScroll) tex.offset.x = (clock.elapsedTime * SCROLL_SPEED * 0.8) % 1;
  });

  const { handleClick } = useAdInteraction(ad, onAdClick);
  const faceMeshes = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);
  useEffect(() => { return () => { for (const m of faceMeshes.current) { if (m) unregisterAdMesh(m); } }; }, []);

  const { width, depth, height } = building;
  const wrapH = 3; // thin band
  const accentH = 0.3; // accent line height
  const y = height * 0.88;
  const gap = 0.15; // offset from building face

  const faces = useMemo(
    () => [
      { pos: [0, y, depth / 2 + gap] as const, rot: [0, 0, 0] as const, w: width + gap * 2 },
      { pos: [0, y, -depth / 2 - gap] as const, rot: [0, Math.PI, 0] as const, w: width + gap * 2 },
      { pos: [width / 2 + gap, y, 0] as const, rot: [0, Math.PI / 2, 0] as const, w: depth + gap * 2 },
      { pos: [-width / 2 - gap, y, 0] as const, rot: [0, -Math.PI / 2, 0] as const, w: depth + gap * 2 },
    ],
    [width, depth, y, gap]
  );

  const proxyRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => { return () => { if (proxyRef.current) unregisterAdMesh(proxyRef.current); }; }, []);

  return (
    <group position={[building.worldX, 0, building.worldZ]}>
      <mesh
        ref={(el) => {
          const prev = proxyRef.current;
          if (prev && prev !== el) unregisterAdMesh(prev);
          proxyRef.current = el;
          if (el) registerAdMesh(el);
          meshRef?.(el);
        }}
        position={[0, y, 0]}
        visible={false}
        geometry={_box}
        scale={[width + gap * 2, wrapH, depth + gap * 2]}
      >
        <meshBasicMaterial />
      </mesh>
      {faces.map((f, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              const prev = faceMeshes.current[i];
              if (prev && prev !== el) unregisterAdMesh(prev);
              faceMeshes.current[i] = el;
              if (el) registerAdMesh(el);
            }}
            material={ledMat}
            position={[f.pos[0], f.pos[1], f.pos[2]]}
            rotation={[f.rot[0], f.rot[1], f.rot[2]]}
            onClick={handleClick}
            geometry={_plane}
            scale={[f.w, wrapH, 1]}
          />
          <mesh
            material={accentMat}
            position={[f.pos[0], f.pos[1] + wrapH / 2 + accentH / 2, f.pos[2]]}
            rotation={[f.rot[0], f.rot[1], f.rot[2]]}
            geometry={_plane}
            scale={[f.w, accentH, 1]}
          />
          <mesh
            material={accentMat}
            position={[f.pos[0], f.pos[1] - wrapH / 2 - accentH / 2, f.pos[2]]}
            rotation={[f.rot[0], f.rot[1], f.rot[2]]}
            geometry={_plane}
            scale={[f.w, accentH, 1]}
          />
        </group>
      ))}
    </group>
  );
}


function AdWallMount({ ad, building, meshRef, onAdClick }: {
  ad: SkyAd;
  building: Cell;
  meshRef?: (el: THREE.Mesh | null) => void;
  onAdClick?: (ad: SkyAd) => void;
}) {
  const { tex, needsScroll } = useMemo(
    () => createLedTexture(ad.text, ad.color, ad.bgColor),
    [ad.text, ad.color, ad.bgColor]
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissiveMap: tex,
        emissive: new THREE.Color(ad.color),
        emissiveIntensity: 3.0,
        toneMapped: false,
      }),
    [tex, ad.color]
  );

  useEffect(() => {
    return () => { tex.dispose(); ledMat.dispose(); };
  }, [tex, ledMat]);

  useFrame(({ clock }) => {
    if (needsScroll) tex.offset.x = (clock.elapsedTime * SCROLL_SPEED) % 1;
  });

  const { handleClick } = useAdInteraction(ad, onAdClick);
  const prevMesh = useRef<THREE.Mesh | null>(null);
  useEffect(() => { return () => { if (prevMesh.current) unregisterAdMesh(prevMesh.current); }; }, []);

  const { width, depth, height } = building;
  const panelW = width * 1.05;
  const panelH = panelW * 0.35;
  const y = height * 0.65; // Place on the upper face
  const zOff = depth / 2 + 0.03; // Flush with the wall

  return (
    <group position={[building.worldX, 0, building.worldZ]}>
      {/* LED screen */}
      <mesh
        ref={(el) => adMeshRef(el, prevMesh, meshRef)}
        material={ledMat}
        position={[0, y, zOff]}
        onClick={handleClick}
        geometry={_plane}
        scale={[panelW, panelH, 1]}
      />
    </group>
  );
}

interface BuildingAdsProps {
  ads: SkyAd[];
  buildings: Cell[];
  onAdClick?: (ad: SkyAd) => void;
  onAdViewed?: (adId: string) => void;
  focusedBuilding?: string | null;
  focusedBuildingB?: string | null;
}

const _adCamPos = new THREE.Vector3();

export default function BuildingAds({ ads, buildings, onAdClick, onAdViewed, focusedBuilding, focusedBuildingB }: BuildingAdsProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    _adCamPos.set(camera.position.x, 0, camera.position.z);
    groupRef.current.visible = _adCamPos.length() < 1500;
  });

  const adAssignments = useMemo(() => {
    const sortedBuildings = [...buildings].sort((a, b) => b.height - a.height);
    const buildingAds = ads.filter((a) => isBuildingAd(a.vehicle));
    
    return buildingAds.map((ad, index) => {
      return { ad, building: sortedBuildings[index] };
    }).filter((a) => a.building);
  }, [ads, buildings]);

  if (adAssignments.length === 0) {
    return null;
  }

  const focusedLower = focusedBuilding?.toLowerCase() ?? null;
  const focusedBLower = focusedBuildingB?.toLowerCase() ?? null;

  return (
    <group ref={groupRef}>
      {adAssignments.map(({ ad, building }) => {
        const loginLower = building.repo?.name?.toLowerCase() ?? "";
        const isDimmed = !!focusedLower && loginLower !== focusedLower && loginLower !== focusedBLower;
        
        if (ad.vehicle === "billboard") {
          return (
            <group key={ad.id} visible={!isDimmed}>
              <AdBillboard ad={ad} building={building} onAdClick={onAdClick} meshRef={(el) => { if (el) meshRefs.current.set(ad.id, el); else meshRefs.current.delete(ad.id); }} />
            </group>
          );
        } else if (ad.vehicle === "rooftop_sign") {
          return (
            <group key={ad.id} visible={!isDimmed}>
              <AdRooftopSign ad={ad} building={building} onAdClick={onAdClick} meshRef={(el) => { if (el) meshRefs.current.set(ad.id, el); else meshRefs.current.delete(ad.id); }} />
            </group>
          );
        } else if (ad.vehicle === "led_wrap") {
          return (
            <group key={ad.id} visible={!isDimmed}>
              <AdLedWrap ad={ad} building={building} onAdClick={onAdClick} meshRef={(el) => { if (el) meshRefs.current.set(ad.id, el); else meshRefs.current.delete(ad.id); }} />
            </group>
          );
        } else if (ad.vehicle === "wall_mount") {
          return (
            <group key={ad.id} visible={!isDimmed}>
              <AdWallMount ad={ad} building={building} onAdClick={onAdClick} meshRef={(el) => { if (el) meshRefs.current.set(ad.id, el); else meshRefs.current.delete(ad.id); }} />
            </group>
          );
        }
        return null;
      })}
      <ViewabilityTracker meshRefs={meshRefs} onAdViewed={onAdViewed} />
    </group>
  );
}
