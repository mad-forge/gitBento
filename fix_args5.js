const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

content = content.replace(
  'isFlying: boolean;',
  'isFlying: boolean;\n  setIsFlying: (b: boolean) => void;'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed props interface definitively');
