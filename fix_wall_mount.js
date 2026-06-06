const fs = require('fs');
let code = fs.readFileSync('app/components/BuildingAds.tsx', 'utf8');

const oldWrap = `export type AdVehicle = "billboard" | "rooftop_sign" | "led_wrap";`;
const newWrap = `export type AdVehicle = "billboard" | "rooftop_sign" | "led_wrap" | "wall_mount";`;
code = code.replace(oldWrap, newWrap);

const oldIsBuilding = `export function isBuildingAd(vehicle: string) {
  return ["billboard", "rooftop_sign", "led_wrap"].includes(vehicle);
}`;
const newIsBuilding = `export function isBuildingAd(vehicle: string) {
  return ["billboard", "rooftop_sign", "led_wrap", "wall_mount"].includes(vehicle);
}`;
code = code.replace(oldIsBuilding, newIsBuilding);

// Add AdWallMount function
const adWallMountStr = `
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
`;

const insertPoint = `interface BuildingAdsProps {`;
code = code.replace(insertPoint, adWallMountStr + "\n" + insertPoint);

const oldRender = `        } else if (ad.vehicle === "led_wrap") {
          return (
            <group key={ad.id} visible={!isDimmed}>
              <AdLedWrap ad={ad} building={building} onAdClick={onAdClick} meshRef={(el) => { if (el) meshRefs.current.set(ad.id, el); else meshRefs.current.delete(ad.id); }} />
            </group>
          );
        }
        return null;`;
const newRender = `        } else if (ad.vehicle === "led_wrap") {
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
        return null;`;
code = code.replace(oldRender, newRender);

fs.writeFileSync('app/components/BuildingAds.tsx', code);
console.log("Added AdWallMount");
