const fs = require('fs');
let code = fs.readFileSync('app/components/BuildingAds.tsx', 'utf8');

const oldFn = `export function createLedTexture(text: string, color: string, bgColor: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.font = "bold 52px 'Courier New', monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    // Second pass for extra brightness
    ctx.shadowBlur = 6;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return { tex, needsScroll: true };
}`;

const newFn = `export function createLedTexture(text: string, color: string, bgColor: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 32) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Neon glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.font = "bold 120px 'Courier New', monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const tickerText = \`  \${text.toUpperCase()}  ★  \`;
    const textWidth = ctx.measureText(tickerText).width;
    const step = Math.max(textWidth, 800);
    
    for (let x = step / 2; x < canvas.width * 2; x += step) {
        ctx.fillText(tickerText, x, canvas.height / 2 + 10);
        ctx.fillText(tickerText, x, canvas.height / 2 + 10);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return { tex, needsScroll: true };
}`;

if (!code.includes(oldFn)) {
    console.log("Could not find createLedTexture");
    process.exit(1);
}

code = code.replace(oldFn, newFn);
fs.writeFileSync('app/components/BuildingAds.tsx', code);
console.log("Updated createLedTexture successfully.");
