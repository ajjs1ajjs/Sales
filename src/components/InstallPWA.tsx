import { Download, X } from 'lucide-react';
import { useInstallPWA } from '../hooks/useInstallPWA';

export function InstallPWA() {
  const { isInstallable, install, dismiss } = useInstallPWA();

  if (!isInstallable) return null;

  return (
    <div className="install-banner" role="alert" aria-live="polite">
      <div className="install-banner-content">
        <Download size={20} aria-hidden="true" />
        <span>Встановіть додаток для швидкого доступу</span>
      </div>
      <div className="install-banner-actions">
        <button type="button" className="install-btn" onClick={install}>
          Встановити
        </button>
        <button
          type="button"
          className="install-dismiss"
          onClick={dismiss}
          aria-label="Закрити"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
