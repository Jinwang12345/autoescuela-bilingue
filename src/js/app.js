/**
 * SPA Router & Core App Controller
 * Autoescuela Bilingüe (Español / 中文)
 */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_ROUTE = 'inicio';
  const VALID_ROUTES = ['inicio', 'temario', 'test', 'fallos', 'ajustes'];
  const appContent = document.getElementById('app-content');
  const navButtons = document.querySelectorAll('.nav-btn');

  /**
   * Router function to load views dynamically
   * @param {string} routeName 
   */
  async function navigateTo(routeName) {
    const route = VALID_ROUTES.includes(routeName) ? routeName : DEFAULT_ROUTE;

    // Update active nav button styling
    navButtons.forEach(btn => {
      const btnNav = btn.getAttribute('data-nav');
      if (btnNav === route) {
        btn.classList.add('text-blue-600', 'bg-blue-50/80', 'font-semibold');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-blue-600', 'bg-blue-50/80', 'font-semibold');
        btn.classList.add('text-slate-500');
      }
    });

    try {
      // Fetch view HTML file
      const response = await fetch(`views/${route}.html`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo cargar la vista '${route}'.`);
      }
      const htmlContent = await response.text();
      
      // Inject content into container
      appContent.innerHTML = htmlContent;

      // Re-initialize Lucide Icons for newly injected content
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Scroll view to top
      appContent.scrollTop = 0;
    } catch (error) {
      console.error('Error al navegar:', error);
      appContent.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700">
          <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 text-red-500"></i>
          <p class="font-bold text-sm">Error de Carga</p>
          <p class="text-xs mt-1 text-red-600">${error.message}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  /**
   * Get current hash route
   */
  function getHashRoute() {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || DEFAULT_ROUTE;
  }

  // Handle hash change events
  window.addEventListener('hashchange', () => {
    navigateTo(getHashRoute());
  });

  // Initial load
  navigateTo(getHashRoute());

  // Re-render icons on shell load
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Helper API for Database access
window.AppDB = {
  async getQuestions() {
    try {
      const res = await fetch('data/database.json');
      const data = await res.json();
      return data.preguntas || [];
    } catch (err) {
      console.error('Error al obtener preguntas de database.json:', err);
      return [];
    }
  }
};
