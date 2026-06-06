const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

content = content.replace(
  'function CityScene({',
  'function CityScene({'
);

content = content.replace(
  '  const { camera } = useThree();',
  '  const { camera } = useThree();\n  const playerPosRef = useRef(new THREE.Vector3());'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed playerPosRef');
