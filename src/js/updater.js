/**
 * AppUpdater Module - GitHub Releases & Wi-Fi Auto-Update System
 * Autoescuela Bilingüe (Español / 中文)
 */

window.AppUpdater = {
  CURRENT_VERSION: '1.0.1',
  CURRENT_VERSION_CODE: 2,

  // GitHub Repository Configuration
  GITHUB_USER: 'Jinwang12345',
  GITHUB_REPO: 'autoescuela-bilingue',
  GITHUB_BRANCH: 'main',

  /**
   * Determine manifest URL (GitHub Raw URL if configured, otherwise local fallback)
   */
  getManifestUrl() {
    if (this.GITHUB_USER && this.GITHUB_USER.trim() !== '') {
      return `https://raw.githubusercontent.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}/src/data/version.json`;
    }
    return 'data/version.json';
  },

  /**
   * Determine APK Download URL (GitHub Release URL if configured, otherwise local/remote fallback)
   */
  getDownloadUrl(remote) {
    if (remote && remote.downloadUrl && remote.downloadUrl.startsWith('http')) {
      return remote.downloadUrl;
    }
    if (this.GITHUB_USER && this.GITHUB_USER.trim() !== '') {
      return `https://github.com/${this.GITHUB_USER}/${this.GITHUB_REPO}/releases/latest/download/autoescuela-bilingue.apk`;
    }
    return remote.downloadUrl || 'apk/autoescuela-bilingue.apk';
  },

  /**
   * Check connection status
   */
  isWifiConnection() {
    if (navigator.connection) {
      const type = navigator.connection.type || navigator.connection.effectiveType;
      return type === 'wifi' || type === '4g' || type === '5g' || type === 'ethernet';
    }
    return navigator.onLine;
  },

  /**
   * Check for app updates
   * @param {Object} options - { silent: boolean }
   */
  async checkUpdate(options = { silent: false }) {
    if (!navigator.onLine) {
      if (!options.silent) {
        this.showToast('网络未连接 / Sin conexión a Internet', 'error');
      }
      return null;
    }

    try {
      const url = `${this.getManifestUrl()}?_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const remote = await res.json();
      const isNewer = (remote.versionCode && remote.versionCode > this.CURRENT_VERSION_CODE) || 
                      (remote.version && remote.version !== this.CURRENT_VERSION);

      if (isNewer) {
        this.showUpdateModal(remote);
        return remote;
      } else {
        if (!options.silent) {
          this.showToast('已是最新版本 / Ya tienes la última versión (v' + this.CURRENT_VERSION + ')', 'success');
        }
        return false;
      }
    } catch (err) {
      console.warn('Update check warning:', err);
      if (!options.silent) {
        this.showToast('检查更新失败 / Error al comprobar actualización', 'error');
      }
      return null;
    }
  },

  /**
   * Render and open update modal dialog
   */
  showUpdateModal(updateInfo) {
    let modal = document.getElementById('update-notification-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'update-notification-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 pointer-events-none';
      document.body.appendChild(modal);
    }

    const wifiNotice = this.isWifiConnection() ? 
      '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full"><span class="material-symbols-outlined text-[14px]">wifi</span> Wi-Fi 已连接</span>' : 
      '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full"><span class="material-symbols-outlined text-[14px]">cell_tower</span> 移动网络</span>';

    const targetDownloadUrl = this.getDownloadUrl(updateInfo);

    modal.innerHTML = `
      <div class="w-full max-w-[360px] bg-surface rounded-3xl shadow-2xl p-space-md border border-outline-variant/30 flex flex-col gap-space-md transform scale-95 transition-transform duration-300" id="update-modal-box">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-2xl bg-primary-container text-white flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[24px]">system_update</span>
            </div>
            <div class="flex flex-col">
              <h3 class="font-headline-md text-headline-md text-on-surface font-bold leading-snug">${updateInfo.title_zh || '发现新版本'}</h3>
              <span class="font-label-sm text-label-sm text-on-surface-variant">${updateInfo.title_es || 'Nueva versión disponible'}</span>
            </div>
          </div>
          ${wifiNotice}
        </div>

        <div class="bg-surface-container-low p-space-md rounded-2xl border border-surface-container-high/60 flex flex-col gap-1.5">
          <div class="flex items-center justify-between font-label-sm text-label-sm font-semibold">
            <span class="text-primary">最新版本: v${updateInfo.version}</span>
            <span class="text-on-surface-variant">当前版本: v${this.CURRENT_VERSION}</span>
          </div>
          <div class="h-px bg-outline-variant/30 my-1"></div>
          <div class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line font-body-translation max-h-36 overflow-y-auto">
${updateInfo.releaseNotes_zh || updateInfo.releaseNotes_es || '优化功能体验，修复已知问题。'}
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${!updateInfo.forceUpdate ? `
            <button id="btn-update-cancel" class="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md font-semibold hover:bg-surface-container-high transition active:scale-95">
              稍后再说 / Luego
            </button>
          ` : ''}
          <button id="btn-update-download" class="flex-1 py-3 rounded-xl bg-primary text-white font-headline-md text-headline-md font-bold shadow-md hover:bg-primary-container transition active:scale-95 flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>🚀 立即更新 / Instalar</span>
          </button>
        </div>
      </div>
    `;

    // Show modal
    setTimeout(() => {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      const box = document.getElementById('update-modal-box');
      if (box) box.classList.remove('scale-95');
    }, 10);

    // Bind listeners
    const cancelBtn = document.getElementById('btn-update-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.closeUpdateModal();
    }

    const downloadBtn = document.getElementById('btn-update-download');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        window.open(targetDownloadUrl, '_blank');
        this.closeUpdateModal();
      };
    }
  },

  /**
   * Dismiss update modal
   */
  closeUpdateModal() {
    const modal = document.getElementById('update-notification-modal');
    if (modal) {
      const box = document.getElementById('update-modal-box');
      if (box) box.classList.add('scale-95');
      modal.classList.add('opacity-0', 'pointer-events-none');
    }
  },

  /**
   * Display toast notification
   */
  showToast(message, type = 'info') {
    let toast = document.getElementById('app-updater-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-updater-toast';
      toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }

    let bgClass = 'bg-slate-900 text-white';
    let icon = 'info';
    if (type === 'success') {
      bgClass = 'bg-emerald-600 text-white';
      icon = 'check_circle';
    } else if (type === 'error') {
      bgClass = 'bg-rose-600 text-white';
      icon = 'error';
    }

    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300 opacity-100 ${bgClass}`;
    toast.innerHTML = `<span class="material-symbols-outlined text-[16px]">${icon}</span><span>${message}</span>`;

    setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
  }
};

// Automatic startup check after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.AppUpdater) {
      window.AppUpdater.checkUpdate({ silent: true });
    }
  }, 2000);
});
