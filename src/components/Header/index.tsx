import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import styles from './Header.module.css';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo} aria-label="CoderScott">
          <span className={styles.bracket}>{'<'}</span>
          <span className={styles.initials}>CS</span>
          <span className={styles.bracket}>{'/>'}</span>
        </span>

        <button
          className={styles.burger}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
