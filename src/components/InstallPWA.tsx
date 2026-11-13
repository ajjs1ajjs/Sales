import { Download, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocale } from '../contexts/LocaleContext';
import { useInstallPWA } from '../hooks/useInstallPWA';

export function InstallPWA() {
  const { t } = useLocale();
  const { isInstallable, install, dismiss } = useInstallPWA();
  // H2: SW реєструється й очікує підтвердження користувача (SKIP_WAITING
  // через updateServiceWorker(true)), щоб не зламати lazy-чанки відкритої вкладки.
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!isInstallable && !needRefresh) return null;

  return (
    <div className="install-banner" role="status">
      <div className="install-banner-content">
        {needRefresh ? <RefreshCw size={20} aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
        <span>{needRefresh ? t.pwa.updateText : t.pwa.installText}</span>
      </div>
      <div className="install-banner-actions">
        {needRefresh ? (
          <button type="button" className="install-btn" onClick={() => updateServiceWorker(true)}>
            {t.pwa.update}
          </button>
        ) : (
          <>
            <button type="button" className="install-btn" onClick={install}>
              {t.pwa.install}
            </button>
            <button
              type="button"
              className="dismiss-btn"
              onClick={dismiss}
              aria-label={t.pwa.close}
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
