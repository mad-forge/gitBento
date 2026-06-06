const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// The Props type definition for CityScene has `isFlying: boolean;`
// Let's add `setIsFlying: (b: boolean) => void;` right after `isFlying: boolean;`
content = content.replace(
  'isFlying: boolean;\n  selectedCell',
  'isFlying: boolean;\n  setIsFlying: (b: boolean) => void;\n  selectedCell'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed props interface');
