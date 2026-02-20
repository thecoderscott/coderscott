import { useRef } from 'react';
import { Terminal } from 'lucide-react';
import { useWebGLGrid } from '../../hooks/useWebGLGrid';
import WebGLGrid from './WebGLGrid';
import avatarSrc from '../../assets/avatar.png';
import styles from './Hero.module.css';

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useWebGLGrid(canvasRef, heroRef);

  return (
    <section ref={heroRef} className={styles.hero}>
      {/* WebGL decorative grid — sits behind all content */}
      <WebGLGrid ref={canvasRef} />

      <div className={styles.content}>
        <div className={styles.textStack}>
          <p className={styles.handle}>
            <Terminal size={16} color="#562c15" aria-hidden="true" />
            CODERSCOTT
          </p>

          <h1 className={styles.title}>SENIOR FRONTEND ENGINEER</h1>

          <p className={styles.tagline}>
            Just a Yorkshire bloke with an unhealthy obsession for efficiency &amp; performance.
          </p>
        </div>

        <div className={styles.avatarWrapper}>
          <img src={avatarSrc} alt="CoderScott avatar" className={styles.avatar} />
        </div>
      </div>
    </section>
  );
};

export default Hero;
