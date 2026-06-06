const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// I also need to remove the import if it's there
content = content.replace('import { VehicleFlight, SkyCollectibles } from "./FlightFeatures";\n', '');

// I need to ensure the HelicopterFlightController is rendered
const missingFlight = content.includes('<HelicopterFlightController');
if (!missingFlight) {
  const badRegex = /\{isFlying && \([\s\S]*?<VehicleFlight[\s\S]*?<\/SkyCollectibles>[\s\S]*?<\/>\s*\)\}/;
  content = content.replace(badRegex, `{isFlying && (
        <HelicopterFlightController
          cells={model.cells}
          theme={theme}
          onExit={() => setIsFlying(false)}
        />
      )}`);
}

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed revert');
