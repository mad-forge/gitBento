const fs = require('fs');
let content = fs.readFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', 'utf-8');
const raw = fs.readFileSync('/Users/shashwat/gitBento/app/components/raw.txt', 'utf-8');

const match = raw.match(/\/\/ ─── Sky Collectibles ───[\s\S]*?(?=\/\/ ─── Camera Reset \(after exiting fly mode\) ───)/);
if (match) {
  let skyCollectibles = match[0];
  // Remove missing types
  skyCollectibles = skyCollectibles.replace(/React.MutableRefObject<PendingRespawn \| null>/g, 'any');
  skyCollectibles = skyCollectibles.replace(/React.MutableRefObject<SelfPvpState>/g, 'any');
  
  content = content + "\n\n" + skyCollectibles + "\n\nexport { SkyCollectibles };\n";
  fs.writeFileSync('/Users/shashwat/gitBento/app/components/FlightFeatures.tsx', content);
  console.log("Appended SkyCollectibles");
} else {
  console.log("Not found");
}
