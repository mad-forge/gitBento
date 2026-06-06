const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', 'utf-8');

// It injected isFlying into a place around line 1735. Let's find it.
// Replace the exact bad text.
content = content.replace(
  '  theme,\n  isFlying,\n  setIsFlying,\n  phase,',
  '  theme,\n  phase,'
);

fs.writeFileSync('/Users/shashwat/gitBento/app/components/ProceduralCityEditor.tsx', content);
console.log('Fixed bad replacement');
