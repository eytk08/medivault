import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/Button';

export function ThemeToggle({ className = '' }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('medivault-theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkMode);
    try { localStorage.setItem('medivault-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setDarkMode((v) => !v)}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`rounded-xl ${className}`}
    >
      {darkMode ? <Sun size={15} /> : <Moon size={15} />}
      <span className="hidden sm:inline">{darkMode ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  );
}