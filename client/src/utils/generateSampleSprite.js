// Generates a sample sprite sheet at runtime so we always have something to animate.
// 8 frames, 64x64 each, arranged horizontally → final sheet is 512x64.
// The "character" is a smiley face that bobs up and down across the frames.

const FRAME_SIZE = 64;
const FRAME_COUNT = 8;
const COLORS = ['#fbbf24', '#fb923c', '#f87171', '#a78bfa', '#60a5fa', '#34d399', '#22d3ee', '#f472b6'];

let cachedDataUrl = null;

export function generateSampleSpriteSheet() {
  if (cachedDataUrl) return cachedDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_SIZE * FRAME_COUNT;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < FRAME_COUNT; i++) {
    const x = i * FRAME_SIZE;
    // Bob: vertical offset follows a sine wave
    const bob = Math.sin((i / FRAME_COUNT) * Math.PI * 2) * 6;

    // Face
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.arc(x + FRAME_SIZE / 2, FRAME_SIZE / 2 + bob, 22, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + FRAME_SIZE / 2 - 7, FRAME_SIZE / 2 - 4 + bob, 3, 0, Math.PI * 2);
    ctx.arc(x + FRAME_SIZE / 2 + 7, FRAME_SIZE / 2 - 4 + bob, 3, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + FRAME_SIZE / 2, FRAME_SIZE / 2 + 2 + bob, 8, 0, Math.PI);
    ctx.stroke();
  }

  cachedDataUrl = canvas.toDataURL('image/png');
  return cachedDataUrl;
}

export const SAMPLE_SPRITE_CONFIG = {
  frameWidth: FRAME_SIZE,
  frameHeight: FRAME_SIZE,
  frameCount: FRAME_COUNT,
  fps: 8,
};
