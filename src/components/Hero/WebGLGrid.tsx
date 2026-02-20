import { forwardRef } from 'react';
import styles from './Hero.module.css';

/**
 * A canvas element that the `useWebGLGrid` hook renders into.
 * Uses forwardRef so the parent component can hand the canvas ref to the hook.
 * Declared `aria-hidden` because it is purely decorative.
 */
const WebGLGrid = forwardRef<HTMLCanvasElement>((_props, ref) => (
  <canvas ref={ref} className={styles.canvas} aria-hidden="true" />
));

WebGLGrid.displayName = 'WebGLGrid';

export default WebGLGrid;
