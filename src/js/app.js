/**
 * SPA Router & Core App Data Controller
 * Autoescuela Bilingüe (Español / 中文)
 */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_ROUTE = 'inicio';
  const VALID_ROUTES = ['inicio', 'temario', 'test', 'fallos', 'ajustes'];
  const appContent = document.getElementById('app-content');

  /**
   * Parse current hash route and query params
   */
  function parseHashRoute() {
    const fullHash = window.location.hash.replace('#', '').trim();
    if (!fullHash) return { route: DEFAULT_ROUTE, testId: 'test_01' };
    
    const [routePath, queryString] = fullHash.split('?');
    const params = new URLSearchParams(queryString || '');
    return {
      route: VALID_ROUTES.includes(routePath) ? routePath : DEFAULT_ROUTE,
      testId: params.get('id') || 'test_01'
    };
  }

  /**
   * Router function to load views dynamically
   */
  async function navigateToRoute() {
    const { route, testId } = parseHashRoute();
    window.currentRouteParams = { testId, route };

    try {
      const response = await fetch(`views/${route}.html`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo cargar la vista '${route}'.`);
      }
      const htmlContent = await response.text();
      
      // Inject view content into main container
      appContent.innerHTML = htmlContent;

      // Re-apply persistent user settings (font sizes, etc.)
      if (window.AppDB) window.AppDB.applySettings();

      // Execute inline scripts inside newly loaded view
      const scriptElements = Array.from(appContent.querySelectorAll('script'));
      scriptElements.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.textContent || oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // Update active navigation state in bottom navbar
      updateActiveNavState(route);

      // Re-initialize Lucide Icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Scroll view to top
      appContent.scrollTop = 0;
    } catch (error) {
      console.error('Error al navegar:', error);
      appContent.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 m-4">
          <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 text-red-500"></i>
          <p class="font-bold text-sm">加载错误 / Error de Carga</p>
          <p class="text-xs mt-1 text-red-600">${error.message}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  /**
   * Highlight active route in bottom navbar
   */
  function updateActiveNavState(activeRoute) {
    const navItems = document.querySelectorAll('nav a[data-path]');
    navItems.forEach(item => {
      const path = item.getAttribute('data-path');
      if (path === activeRoute) {
        item.classList.remove('text-on-surface-variant');
        item.classList.add('text-primary', 'font-bold');
        const icon = item.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = "'FILL' 1";
      } else {
        item.classList.remove('text-primary', 'font-bold');
        item.classList.add('text-on-surface-variant');
        const icon = item.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = "'FILL' 0";
      }
    });
  }

  /**
   * Global Fail-Proof Navigation Handler
   * Intercepts clicks on any link, button, or card with routing attributes
   */
  document.addEventListener('click', (e) => {
    const clickable = e.target.closest('a, button, [data-path], [data-test-id]');
    if (!clickable) return;

    const dataTestId = clickable.getAttribute('data-test-id');
    const dataPath = clickable.getAttribute('data-path');
    const href = clickable.getAttribute('href');

    let targetHash = null;

    if (dataTestId) {
      targetHash = `#test?id=${dataTestId}`;
    } else if (dataPath) {
      targetHash = `#${dataPath}`;
    } else if (href && href.startsWith('#') && href !== '#') {
      targetHash = href;
    }

    if (targetHash) {
      e.preventDefault();
      if (window.location.hash !== targetHash) {
        // Setting location.hash automatically dispatches 'hashchange' event, calling navigateToRoute()
        window.location.hash = targetHash;
      } else {
        // If hash is already equal to targetHash, hashchange won't fire, so navigate manually
        navigateToRoute();
      }
    }
  });

  // Handle hash change events
  window.addEventListener('hashchange', navigateToRoute);

  // Initial load
  navigateToRoute();
});

/**
 * App Database Helper API
 */
window.AppDB = {
  _indexCache: null,
  _testsCache: {},

  async getIndex() {
    if (this._indexCache) return this._indexCache;
    try {
      const res = await fetch('data/index.json');
      if (!res.ok) throw new Error('No se pudo cargar index.json');
      this._indexCache = await res.json();
      return this._indexCache;
    } catch (err) {
      console.error('Error al cargar index.json:', err);
      return null;
    }
  },

  async getTest(testId = 'test_01') {
    const cleanId = testId.replace('.json', '');
    const fileName = `${cleanId}.json`;
    if (this._testsCache[fileName]) return this._testsCache[fileName];

    try {
      const res = await fetch(`data/${fileName}`);
      if (!res.ok) throw new Error(`No se pudo cargar data/${fileName}`);
      const data = await res.json();
      this._testsCache[fileName] = data;
      return data;
    } catch (err) {
      console.error(`Error al cargar ${fileName}:`, err);
      return [];
    }
  },

  saveFailedQuestion(question) {
    try {
      const failed = JSON.parse(localStorage.getItem('failed_questions') || '[]');
      if (!failed.some(q => q.id === question.id)) {
        failed.unshift(question);
        localStorage.setItem('failed_questions', JSON.stringify(failed));
      }
    } catch (e) {
      console.error('Error al guardar fallo:', e);
    }
  },

  removeFailedQuestion(questionId) {
    try {
      let failed = JSON.parse(localStorage.getItem('failed_questions') || '[]');
      failed = failed.filter(q => q.id !== questionId);
      localStorage.setItem('failed_questions', JSON.stringify(failed));
    } catch (e) {
      console.error('Error al eliminar fallo:', e);
    }
  },

  clearFailedQuestions() {
    try {
      localStorage.removeItem('failed_questions');
    } catch (e) {
      console.error('Error al limpiar fallos:', e);
    }
  },

  getFailedQuestions() {
    try {
      return JSON.parse(localStorage.getItem('failed_questions') || '[]');
    } catch (e) {
      return [];
    }
  },

  saveTestProgress(testId, progressData) {
    try {
      const key = `test_progress_${testId}`;
      localStorage.setItem(key, JSON.stringify({
        testId,
        ...progressData,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.error('Error al guardar progreso:', e);
    }
  },

  getTestProgress(testId) {
    try {
      const key = `test_progress_${testId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error al leer progreso:', e);
      return null;
    }
  },

  clearTestProgress(testId) {
    try {
      if (testId) {
        localStorage.removeItem(`test_progress_${testId}`);
      } else {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('test_progress_')) localStorage.removeItem(k);
        });
      }
    } catch (e) {
      console.error('Error al borrar progreso:', e);
    }
  },

  getSettings() {
    try {
      const defaultSettings = { esLevel: 2, zhLevel: 2, fontEs: '16px', fontZh: '16px' };
      const saved = localStorage.getItem('app_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (e) {
      return { esLevel: 2, zhLevel: 2, fontEs: '16px', fontZh: '16px' };
    }
  },

  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('app_settings', JSON.stringify(updated));
      this.applySettings(updated);
    } catch (e) {
      console.error('Error al guardar ajustes:', e);
    }
  },

  applySettings(settings) {
    const s = settings || this.getSettings();
    const esSize = s.fontEs || '16px';
    const zhSize = s.fontZh || '16px';
    document.documentElement.style.setProperty('--user-font-es', esSize);
    document.documentElement.style.setProperty('--user-font-zh', zhSize);
    if (document.body) {
      document.body.style.setProperty('--user-font-es', esSize);
      document.body.style.setProperty('--user-font-zh', zhSize);
    }
  }
};

// Initial settings application
document.addEventListener('DOMContentLoaded', () => {
  if (window.AppDB) window.AppDB.applySettings();
});
