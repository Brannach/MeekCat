import { useMemo } from 'react';
import SpriteAnimator from '../components/SpriteAnimator.jsx';
import { generateSampleSpriteSheet } from '../utils/sampleSprite.js';

export default function AnimatorPage() {
    // useMemo: compute the value once on first render, reuse it on re-renders.
    // Without it, every re-render would regenerate the sprite sheet — wasteful.
    const sampleSprite = useMemo(() => generateSampleSpriteSheet(), []);

    return (
        <div className="container">
            <h1>Animator</h1>
            <p>A procedurally generated bouncing ball, 8 frames at 8 FPS:</p>
            <SpriteAnimator
                spriteSheet={sampleSprite}
                frameWidth={64}
                frameHeight={64}
                frameCount={8}
                fps={8}
                displayScale={4}
            />
        </div>
    );
}