/**
 * Generates a sample horizontal sprite sheet: a bouncing ball across N frames.
 * Returns a data URL (a string that looks like "data:image/png;base64,...") that
 * can be used anywhere an image URL is expected.
 *
 * We use an OFFSCREEN canvas (one that's never attached to the DOM) just for
 * drawing. canvas.toDataURL() serializes the pixels into a PNG string.
 */
export function generateSampleSpriteSheet({ frameSize = 64, frameCount = 8 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = frameSize * frameCount;   // 512 wide for default 8x64
    canvas.height = frameSize;                // 64 tall
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < frameCount; i++) {
        // Frame background — alternating slight tint so frame boundaries are visible
        ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(i * frameSize, 0, frameSize, frameSize);

        // Ball position: sine wave so it bounces smoothly across the frame cycle
        const cx = i * frameSize + frameSize / 2;
        const t = i / frameCount;                  // 0..1
        const cy = frameSize / 2 + Math.sin(t * Math.PI * 2) * (frameSize / 3);

        ctx.fillStyle = '#38bdf8';                 // sky blue
        ctx.beginPath();
        ctx.arc(cx, cy, frameSize / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas.toDataURL('image/png');
}