const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// Add setIsFlying to CityScene props type correctly
content = content.replace(
  'isFlying: boolean;\n  selectedCell: Cell | null;',
  'isFlying: boolean;\n  setIsFlying: (b: boolean) => void;\n  selectedCell: Cell | null;'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed CityScene props type');
