import { useEffect, useRef } from 'react';

/**
 * Animates a sprite sheet on an HTML5 canvas.
 *
 * Props:
 *   spriteSheet   — URL or data URL of the sheet image
 *   frameWidth    — width of one frame in the source image (pixels)
 *   frameHeight   — height of one frame in the source image (pixels)
 *   frameCount    — total number of frames in the sheet (assumed horizontal)
 *   fps           — how fast to advance frames (8 means 8 frames per second)
 *   displayScale  — render scale; 4 = render at 4x source size (good for pixel art)
 */
export default function SpriteAnimator({
                                           spriteSheet,
                                           frameWidth,
                                           frameHeight,
                                           frameCount,
                                           fps = 8,
                                           displayScale = 4,
                                       }) {
    // useRef gives us a stable reference to the <canvas> DOM element.
    // Unlike useState, changing a ref doesn't trigger a re-render.
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // keep pixel art crisp when scaled up

        // Load the sprite sheet. The Image() constructor creates a DOM Image
        // without ever attaching it to the page — purely a data holder.
        const img = new Image();
        img.src = spriteSheet;

        let currentFrame = 0;
        let lastFrameTime = 0;
        const frameDuration = 1000 / fps; // ms per sprite frame
        let rafId;

        function tick(timestamp) {
            // requestAnimationFrame fires ~60x/sec, but we only want to advance the
            // sprite frame `fps` times per second. So we check elapsed time.
            if (timestamp - lastFrameTime >= frameDuration) {
                lastFrameTime = timestamp;

                const sx = currentFrame * frameWidth; // left edge of current frame
                const sy = 0;                          // horizontal sheet, so always 0

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    img,
                    sx, sy, frameWidth, frameHeight,           // source rectangle
                    0, 0, canvas.width, canvas.height          // destination (whole canvas)
                );

                currentFrame = (currentFrame + 1) % frameCount; // loop back to 0
            }
            rafId = requestAnimationFrame(tick); // schedule the next frame
        }

        // Start the loop ONLY after the image has loaded — otherwise the first
        // few drawImage() calls would draw nothing.
        img.onload = () => {
            rafId = requestAnimationFrame(tick);
        };

        // Cleanup: when React unmounts the component (user navigates away),
        // cancel the loop so it doesn't keep running in the background.
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [spriteSheet, frameWidth, frameHeight, frameCount, fps]);
    // ^ The dependency array. If any of these change, useEffect re-runs:
    //   the old loop is cancelled (cleanup) and a fresh one starts.

    return (
        <canvas
            ref={canvasRef}
            width={frameWidth * displayScale}
            height={frameHeight * displayScale}
            style={{ border: '1px solid #334155', background: '#0f172a' }}
        />
    );
}