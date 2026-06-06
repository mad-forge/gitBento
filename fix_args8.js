const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

content = content.replace(
  '    isFlying: boolean;\n  \n    selectedCell',
  '    isFlying: boolean;\n    setIsFlying: (b: boolean) => void;\n  \n    selectedCell'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed properly');
