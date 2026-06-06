const fs = require('fs');
let code = fs.readFileSync('app/components/ProceduralCityEditor.tsx', 'utf8');

const oldTexture = `function createVerticalLedTexture(text: string, color: string, bgColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2); // Text reads bottom-to-top
  
  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const cleanText = text.length > 25 ? text.substring(0, 22) + "..." : text;
  const fullText = \`\${cleanText}   ★   \${cleanText}   ★   \${cleanText}\`;
  ctx.fillText(fullText, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return { tex, needsScroll: true };
}`;

const newTexture = `function createVerticalLedTexture(text: string, color: string, bgColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Inner grid lines for tech look
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 16) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2); // Text reads bottom-to-top
  
  ctx.font = 'bold 110px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  
  const cleanText = text.length > 25 ? text.substring(0, 22) + "..." : text;
  const fullText = \`\${cleanText}   ★   \${cleanText}   ★   \${cleanText}\`;
  
  // Render twice for glowing effect
  ctx.fillText(fullText, 0, 0);
  ctx.fillText(fullText, 0, 0);
  ctx.restore();
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return { tex, needsScroll: true };
}`;

code = code.replace(oldTexture, newTexture);
fs.writeFileSync('app/components/ProceduralCityEditor.tsx', code);
console.log("Replaced createVerticalLedTexture");
