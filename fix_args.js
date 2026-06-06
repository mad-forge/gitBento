const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// I might have added `\n  isFlying,\n  setIsFlying,\n` manually.
content = content.replace('function CityScene({\n  isFlying,\n  setIsFlying,\n', 'function CityScene({\n');
content = content.replace('  isFlying: boolean;\n  setIsFlying: (b: boolean) => void;', '');
content = content.replace('  model,\n  isFlying,\n  setIsFlying,', '  model,');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed args 2');
