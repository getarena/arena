import { Icon } from './Icon'

export function ThemeToggle({ theme, onChange, compact = false }) {
  return (
    <div className={`theme-toggle ${compact ? 'compact' : ''}`} role="group" aria-label="Theme">
      <button
        type="button"
        className={theme === 'light' ? 'active' : ''}
        onClick={() => onChange('light')}
        aria-label="Use light theme"
        title="Light theme"
      >
        <Icon name="sun" size={14} />
        <span>Light</span>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'active' : ''}
        onClick={() => onChange('dark')}
        aria-label="Use dark theme"
        title="Dark theme"
      >
        <Icon name="moon" size={14} />
        <span>Dark</span>
      </button>
    </div>
  )
}
