const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// Add import
content = content.replace('import { Bloom, EffectComposer } from "@react-three/postprocessing";', 'import { Bloom, EffectComposer } from "@react-three/postprocessing";\nimport { VehicleFlight, SkyCollectibles } from "./FlightFeatures";');

// Replace HelicopterFlightController rendering
content = content.replace(
  /\{isFlying && \(\s*<HelicopterFlightController[\s\S]*?onExit=\{.*?\}\s*\/>\s*\)\}/,
  `{isFlying && (
        <>
          <VehicleFlight
            onExit={() => setIsFlying(false)}
            onHud={(s, a) => {
               // Update speed/alt if needed
            }}
            onPause={() => {}}
            cityRadius={model.bounds.width}
          />
          <SkyCollectibles
            playerPosRef={{ current: new THREE.Vector3() }} // Placeholder, ideally use posRef
            accentColor={theme.accent}
            cityRadius={model.bounds.width}
            onCollect={(s, e, c, col, mc) => {
              console.log("Collected! Score:", s);
            }}
          />
        </>
      )}`
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Patched editor');
