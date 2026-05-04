/**
 * Utilities & Helpers / Utilidades y Funciones Auxiliares
 * Provides common formatting and validation functions.
 * Provee funciones comunes de formateo y validación.
 */

class Utils {
  
  /**
   * Escapes HTML characters to prevent XSS.
   * Escapa caracteres HTML para prevenir XSS.
   */
  static esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Pauses execution for a given milliseconds.
   * Pausa la ejecución por los milisegundos indicados.
   */
  static sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Sorts a date string robustly.
   * Ordena un string de fecha de forma robusta.
   */
  static sortDateStr(d) {
    if (!d) return '0000-00-00';
    const p2 = String(d).split('/');
    if (p2.length === 3) {
      let p1 = parseInt(p2[0]), p2b = parseInt(p2[1]), p3 = parseInt(p2[2]);
      if (p3 < 100) p3 += 2000;
      if (p1 > 12) return `${p3}-${String(p2b).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      if (p2b > 12) return `${p3}-${String(p1).padStart(2, '0')}-${String(p2b).padStart(2, '0')}`;
      return `${p3}-${String(p2b).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return String(d).slice(0, 10);
  }

  /**
   * Parses various date formats into a standard YYYY-MM-DD.
   * Analiza varios formatos de fecha a un YYYY-MM-DD estándar.
   */
  static parseFecha(v) {
    if (!v) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') {
      const d = new Date((Math.round(v) - 25569) * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return String(v).slice(0, 10);
  }

  /**
   * Formats a date for UI display (DD/MM/YYYY).
   * Formatea una fecha para mostrar en la interfaz (DD/MM/YYYY).
   */
  static formatFecha(f) {
    if (!f) return '—';
    let s = String(f).slice(0, 10);
    const p = s.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return s;
  }

  /**
   * Escapes RegExp special characters.
   * Escapa caracteres especiales de RegExp.
   */
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Displays a floating toast notification (Nielsen's Heuristic: Visibility of System Status)
   * Muestra una notificación flotante.
   */
  static showGlobalAlert(msg, type) {
    let wrap = document.getElementById('alert-global');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'alert-global';
      document.body.appendChild(wrap);
    }
    
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
      ${type === 'ok' ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'}
      <span>${msg}</span>
    </div>`;
    
    wrap.appendChild(div);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      div.style.animation = 'slideOutRight 0.3s forwards';
      setTimeout(() => div.remove(), 300);
    }, 5000);
  }

}

// Make globally available to avoid breaking existing code / Hacer disponible globalmente
window.Utils = Utils;
window.esc = Utils.esc;
window.sleep = Utils.sleep;
window.sortDateStr = Utils.sortDateStr;
window.parseFecha = Utils.parseFecha;
window.formatFecha = Utils.formatFecha;
window.escapeRegExp = Utils.escapeRegExp;
