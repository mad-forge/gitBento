const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// 1. Remove the import
content = content.replace('import { VehicleFlight, SkyCollectibles } from "./FlightFeatures";\n', '');

// 2. Remove playerPosRef from CityScene
content = content.replace('  const playerPosRef = useRef(new THREE.Vector3());\n', '');

// 3. Restore HelicopterFlightController
const flightBlockRegex = /\{isFlying && \([\s\S]*?<VehicleFlight[\s\S]*?cityRadius=\{model\.bounds\.width\}[\s\S]*?\/>[\s\S]*?<SkyCollectibles[\s\S]*?\/>[\s\S]*?<\/>\s*\)\}/;
const oldHelicopterBlock = `{isFlying && (
        <HelicopterFlightController
          cells={model.cells}
          theme={theme}
          onExit={() => setIsFlying(false)}
        />
      )}`;

content = content.replace(flightBlockRegex, oldHelicopterBlock);

// Write back
fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Reverted to Helicopter');
