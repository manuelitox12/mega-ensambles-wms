/**
 * Main Application Bootstrapper / Inicializador de la Aplicación
 * Starts the application once the DOM is loaded.
 * Inicia la aplicación una vez que el DOM ha cargado.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.appController) {
    window.appController.init();
    
    // Configurar Atajos de Teclado (Fitts & Hick's Law: reducen tiempo de interacción)
    document.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          e.target.blur(); // Escape quita el foco
        }
        return;
      }
      
      // Atajos Alt + N
      if (e.altKey) {
        switch(e.key) {
          case '1': e.preventDefault(); window.uiManager.showPage('dashboard'); break;
          case '2': e.preventDefault(); window.uiManager.showPage('productos'); break;
          case '3': e.preventDefault(); window.uiManager.showPage('entradas'); break;
          case '4': e.preventDefault(); window.uiManager.showPage('salidas'); break;
          case '5': e.preventDefault(); window.uiManager.showPage('registrar'); break;
          case '6': e.preventDefault(); window.uiManager.showPage('ajuste'); break;
          case '7': e.preventDefault(); window.uiManager.showPage('auditoria'); break;
          case '8': e.preventDefault(); window.uiManager.showPage('importar'); break;
        }
      }
      
      // Escape cierra el menú móvil si está abierto
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      }
    });

  } else {
    console.error('AppController not found. Make sure all scripts are loaded.');
  }
});
