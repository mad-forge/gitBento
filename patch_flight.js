const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', 'utf-8');

// Fix useEffectEvent
content = content.replace('useEffectEvent, ', '');
content = content.replace(
  'const notifyPause = useEffectEvent((p: boolean) => onPause(p));',
  'const notifyPauseRef = useRef((p: boolean) => onPause(p));\n  notifyPauseRef.current = (p: boolean) => onPause(p);\n  const notifyPause = useCallback((p: boolean) => notifyPauseRef.current(p), []);'
);

// Fix CityBuilding
content = content.replace(/buildings: CityBuilding\[\];/g, 'buildings: any[];');

fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', content);
console.log('Patched');
