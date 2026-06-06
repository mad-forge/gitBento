const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// The ProceduralHelicopter props should just be isFlying: boolean
content = content.replace(
  'function ProceduralHelicopter({ isFlying, theme }: { isFlying: boolean;\n  setIsFlying: (b: boolean) => void; theme: StyleTheme }) {',
  'function ProceduralHelicopter({ isFlying, theme }: { isFlying: boolean; theme: StyleTheme }) {'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed ProceduralHelicopter props');
