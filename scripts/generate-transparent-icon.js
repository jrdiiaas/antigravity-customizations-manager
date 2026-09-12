const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <!-- Gradiente do Raio -->
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5a0" />
      <stop offset="50%" stop-color="#00d2ff" />
      <stop offset="100%" stop-color="#9d4edd" />
    </linearGradient>

    <!-- Gradiente de Preenchimento Interno -->
    <linearGradient id="boltInner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5a0" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#7928ca" stop-opacity="0.35" />
    </linearGradient>

    <!-- Glow Externo -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Glow Forte -->
    <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="blur1" />
      <feGaussianBlur stdDeviation="6" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Fundo Squircle translúcido escuro opcional com borda suave -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.15" />
      <stop offset="70%" stop-color="#7928ca" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Fundo transparente com leve halo de luz central -->
  <circle cx="128" cy="128" r="110" fill="url(#bgGlow)" />

  <!-- Sombra/Glow do Raio -->
  <polygon points="144,18 48,146 136,146 112,238 224,110 136,110" 
           fill="none" 
           stroke="url(#boltGrad)" 
           stroke-width="14" 
           stroke-linejoin="round" 
           stroke-linecap="round"
           filter="url(#strongGlow)" 
           opacity="0.85" />

  <!-- Preenchimento translúcido -->
  <polygon points="144,18 48,146 136,146 112,238 224,110 136,110" 
           fill="url(#boltInner)" />

  <!-- Raio Principal com Linha Nítida -->
  <polygon points="144,18 48,146 136,146 112,238 224,110 136,110" 
           fill="none" 
           stroke="url(#boltGrad)" 
           stroke-width="12" 
           stroke-linejoin="round" 
           stroke-linecap="round" />

  <!-- Detalhe de Luz Central (Brilho Branco) -->
  <polygon points="144,32 64,142 136,142 116,220 208,114 136,114" 
           fill="none" 
           stroke="#ffffff" 
           stroke-width="2.5" 
           stroke-linejoin="round" 
           stroke-linecap="round"
           opacity="0.7" />
</svg>`;

async function generate() {
  const targetPath = path.join(__dirname, 'icon.png');
  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(targetPath);

  console.log('Icone PNG com fundo transparente gerado com sucesso em:', targetPath);
}

generate().catch(err => {
  console.error('Erro ao gerar icone:', err);
  process.exit(1);
});
