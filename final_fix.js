const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

content = content.replace(
  'function CityScene({',
  'function CityScene({\n  isFlying,\n  setIsFlying,\n'
);

content = content.replace(
  '  setIsFlying: (b: boolean) => void;',
  '  isFlying: boolean;\n  setIsFlying: (b: boolean) => void;'
);

content = content.replace(
  '  theme,',
  '  theme,\n  isFlying,\n  setIsFlying,'
);

content = content.replace(
  '  model,',
  '  model,\n  isFlying,\n  setIsFlying,'
);

// Add playerPosRef inside CityScene
const citySceneStart = content.indexOf('function CityScene({');
const functionBodyStart = content.indexOf('{', content.indexOf(') {', citySceneStart)) + 1;

content = content.substring(0, functionBodyStart) + '\n  const playerPosRef = useRef(new THREE.Vector3());\n' + content.substring(functionBodyStart);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Final fix applied');
