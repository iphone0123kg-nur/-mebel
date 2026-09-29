import * as THREE from 'three';

// Cache generated canvas textures so they are created once and reused efficiently
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a procedural realistic wood grain texture
 */
export function getWoodTexture(baseHex: string = '#d8cebf', darkHex?: string): THREE.CanvasTexture {
  const cacheKey = `wood_${baseHex}_${darkHex || 'auto'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const darkCol = darkHex ? new THREE.Color(darkHex) : baseCol.clone().multiplyScalar(0.78);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Draw organic wood fibers and subtle grain waves
  const numGrains = 120;
  for (let i = 0; i < numGrains; i++) {
    const y = Math.random() * 512;
    const waveFreq = 0.01 + Math.random() * 0.02;
    const waveAmp = 4 + Math.random() * 12;
    const alpha = 0.04 + Math.random() * 0.09;

    ctx.strokeStyle = `rgba(${Math.round(darkCol.r * 255)}, ${Math.round(darkCol.g * 255)}, ${Math.round(darkCol.b * 255)}, ${alpha})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 10) {
      const offset = Math.sin(x * waveFreq + i) * waveAmp;
      if (x === 0) ctx.moveTo(x, y + offset);
      else ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }

  // Add subtle micro wood pores
  const poreCol = darkCol.clone().multiplyScalar(0.9);
  ctx.fillStyle = `rgba(${Math.round(poreCol.r * 255)}, ${Math.round(poreCol.g * 255)}, ${Math.round(poreCol.b * 255)}, 0.05)`;
  for (let p = 0; p < 800; p++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const pw = 4 + Math.random() * 16;
    ctx.fillRect(px, py, pw, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 3.5);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a procedural marble / quartz countertop texture with organic veins
 */
export function getStoneTexture(
  baseHex: string = '#f8fafc',
  veinHex: string = '#cbd5e1',
  type: 'marble' | 'quartz' | 'granite' = 'marble'
): THREE.CanvasTexture {
  const cacheKey = `stone_${baseHex}_${veinHex}_${type}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const veinCol = new THREE.Color(veinHex);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'marble') {
    // Soft branching marble veins (Calacatta style)
    for (let v = 0; v < 7; v++) {
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const steps = 70;
      const stepLen = 8;

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (let s = 0; s < steps; s++) {
        x += Math.cos(angle) * stepLen + (Math.random() - 0.5) * 9;
        y += Math.sin(angle) * stepLen + (Math.random() - 0.5) * 9;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(${Math.round(veinCol.r * 255)}, ${Math.round(veinCol.g * 255)}, ${Math.round(veinCol.b * 255)}, 0.12)`;
      ctx.lineWidth = 6 + Math.random() * 10;
      ctx.stroke();

      // Sharp core vein
      ctx.strokeStyle = `rgba(${Math.round(veinCol.r * 255)}, ${Math.round(veinCol.g * 255)}, ${Math.round(veinCol.b * 255)}, 0.28)`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.stroke();
    }
  } else {
    // Fine quartz / granite aggregate mineral specks
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rad = 0.8 + Math.random() * 2.2;
      const isDark = Math.random() > 0.4;
      const alpha = 0.08 + Math.random() * 0.2;
      ctx.fillStyle = isDark
        ? `rgba(30, 41, 59, ${alpha})`
        : `rgba(255, 255, 255, ${alpha * 1.5})`;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates luxury porcelain tile floor texture (600x1200 style) with realistic 2mm grout seams
 */
export function getFloorTileTexture(): THREE.CanvasTexture {
  const cacheKey = 'floor_porcelain_tiles';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm light grey porcelain tile color
  ctx.fillStyle = '#e8ebef';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle natural stone variations inside tile
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 20 + Math.random() * 80;
    const h = 20 + Math.random() * 80;
    const alpha = 0.02 + Math.random() * 0.04;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(180,185,195,${alpha})`;
    ctx.fillRect(x, y, w, h);
  }

  // Realistic grout seams (швы между плитками)
  ctx.strokeStyle = '#c5c9d1';
  ctx.lineWidth = 2.5;

  // Horizontal grout line at 256
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Vertical staggered grout lines
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 256);
  ctx.moveTo(128, 256);
  ctx.lineTo(128, 512);
  ctx.moveTo(384, 256);
  ctx.lineTo(384, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates soft plaster interior wall texture
 */
export function getWallTexture(): THREE.CanvasTexture {
  const cacheKey = 'wall_plaster';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle micro plaster variation
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const rad = 2 + Math.random() * 8;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(215,220,225,0.03)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates contact shadow / ambient occlusion radial texture
 */
export function getContactShadowTexture(): THREE.CanvasTexture {
  const cacheKey = 'contact_shadow_radial';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}
