const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// Inside CityScene, add const playerPosRef = useRef(new THREE.Vector3());
content = content.replace(
  'function CityScene({',
  `function CityScene({`
);

content = content.replace(
  '  const { scene } = useThree();',
  '  const { scene } = useThree();\n  const playerPosRef = useRef(new THREE.Vector3());'
);

content = content.replace(
  /<VehicleFlight[\s\S]*?cityRadius=\{model\.bounds\.width\}\s*\/>/,
  `<VehicleFlight
            onExit={() => setIsFlying(false)}
            onHud={(s, a) => {}}
            onPause={() => {}}
            cityRadius={model.bounds.width}
            posRef={playerPosRef}
          />`
);

content = content.replace(
  /playerPosRef=\{\{ current: new THREE.Vector3\(\) \}\}/,
  'playerPosRef={playerPosRef}'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed ref');
