/**
 * UI Manager / Administrador de la Interfaz
 * Handles DOM manipulation, rendering tables, and alerts.
 * Maneja la manipulación del DOM, renderizado de tablas y alertas.
 */

class UIManager {
  constructor(inventoryService) {
    this.invService = inventoryService;
    
    // Pagination / Paginación
    this.PAGE_SZ = 250;
    this.prodPage = 0;
    this.entPage = 0;
    this.salPage = 0;
    
    // Sorting / Ordenamiento
    this.prodSort = { col: '_idx', asc: true };
    this.entSort = { col: '_idx', asc: true };
    this.salSort = { col: '_idx', asc: true };
  }

  showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const pageEl = document.getElementById('pg-' + id);
    if (pageEl) pageEl.classList.add('active');
    
    const navs = document.querySelectorAll('.nav-item');
    const map = { dashboard: 0, productos: 1, entradas: 2, salidas: 3, registrar: 4, ajuste: 5, importar: 6, guia: 7 };
    if (map[id] !== undefined && navs[map[id]]) navs[map[id]].classList.add('active');
  }

  renderAll() {
    this.renderDashboard();
    this.renderProductos();
    this.renderEntradas();
    this.renderSalidas();
  }

  renderDashboard() {
    const allProds = this.invService.allProductos;
    const allEnt = this.invService.allEntradas;
    const allSal = this.invService.allSalidas;

    document.getElementById('d-productos').textContent = allProds.length.toLocaleString();
    document.getElementById('d-entradas').textContent = allEnt.length.toLocaleString();
    document.getElementById('d-salidas').textContent = allSal.length.toLocaleString();
    document.getElementById('d-sinstock').textContent = allProds.filter(p => p.stock <= 0).length.toLocaleString();
    
    const low = allProds.filter(p => p.stock > 0 && p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 20);
    document.getElementById('tbl-lowstock').innerHTML = low.map(p => 
      `<tr><td class="code">${window.esc(p.code)}</td><td>${window.esc(p.desc)}</td><td class="stock-neg"><strong>${p.stock}</strong></td></tr>`
    ).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">Sin datos</td></tr>';
    
    const recent = [];
    allSal.forEach(s => recent.push({ fecha: s.fecha, tipo: 'SALIDA', code: s.code, qty: s.qty, desc: s.desc || '', doc: s.tipo || '' }));
    allEnt.forEach(e => recent.push({ fecha: e.fecha, tipo: 'ENTRADA', code: e.code, qty: e.qty, desc: e.desc || '', doc: e.tipo || '' }));
    recent.sort((a, b) => window.sortDateStr(b.fecha).localeCompare(window.sortDateStr(a.fecha)));
    
    document.getElementById('tbl-recent').innerHTML = recent.slice(0, 15).map(m => 
      `<tr><td>${window.formatFecha(m.fecha)}</td><td><span class="badge ${m.tipo === 'SALIDA' ? 'b-green' : 'b-blue'}">${m.tipo}</span></td><td class="code">${window.esc(m.code)}</td><td>${m.qty}</td><td><strong>${window.esc(m.doc)}</strong></td><td>${window.esc(m.desc)}</td></tr>`
    ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">Sin movimientos</td></tr>';
  }

  // ==== PRODUCTOS ====
  getFilteredProds() {
    let res = this.invService.allProductos;
    const c = (document.getElementById('fp-code').value || '').toLowerCase().trim();
    const a = (document.getElementById('fp-arancel').value || '').toLowerCase().trim();
    const d = (document.getElementById('fp-desc').value || '').toLowerCase().trim();
    const e = (document.getElementById('fp-empaque').value || '').toLowerCase().trim();
    const en = (document.getElementById('fp-entradas').value || '').toLowerCase().trim();
    const sa = (document.getElementById('fp-salidas').value || '').toLowerCase().trim();
    const st = (document.getElementById('fp-stock').value || '').toLowerCase().trim();
    
    if (c) res = res.filter(p => (p.code || '').toLowerCase().includes(c));
    if (a) res = res.filter(p => (String(p.arancel) || '').toLowerCase().includes(a));
    if (d) res = res.filter(p => (p.desc || '').toLowerCase().includes(d));
    if (e) res = res.filter(p => (p.empaque || '').toLowerCase().includes(e));
    if (en) res = res.filter(p => String(p.entradas).includes(en));
    if (sa) res = res.filter(p => String(p.salidas).includes(sa));
    if (st) res = res.filter(p => String(p.stock).includes(st));
    return res;
  }

  sortProd(col) {
    if (this.prodSort.col === col) this.prodSort.asc = !this.prodSort.asc;
    else { this.prodSort.col = col; this.prodSort.asc = true; }
    
    document.querySelectorAll('#th-productos th span').forEach(el => el.textContent = '↕');
    const activeTh = document.querySelector(`#th-productos th[data-col="${col}"] span`);
    if (activeTh) activeTh.textContent = this.prodSort.asc ? '↑' : '↓';
    
    this.renderProductos();
  }

  renderProductos() {
    let data = this.getFilteredProds();
    const sc = this.prodSort.col, asc = this.prodSort.asc;
    data.sort((a, b) => {
      let va = a[sc], vb = b[sc];
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
      return asc ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''));
    });
    
    const t = data.length, s = this.prodPage * this.PAGE_SZ, e = Math.min(s + this.PAGE_SZ, t);
    const emptyState = `<tr><td colspan="7" style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:16px; opacity:0.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
      <br><span style="font-size:1.1rem;font-weight:600;color:var(--text)">No se encontraron productos</span>
      <br><span style="font-size:0.85rem">Intenta ajustar los filtros de búsqueda</span>
    </td></tr>`;

    document.getElementById('tbl-productos').innerHTML = data.slice(s, e).map(p => {
      const css = p.stock > 0 ? 'stock-pos' : p.stock < 0 ? 'stock-neg' : 'stock-zero';
      const tag = p.desc === 'NUEVO (Falta descripción)' ? `<span class="badge b-orange" style="margin-left:6px">Nuevo</span>` : '';
      return `<tr><td class="code">${window.esc(p.code)}</td><td>${window.esc(String(p.arancel || ''))}</td><td>${window.esc(p.desc)}${tag}</td><td>${window.esc(p.empaque || '')}</td><td>${p.entradas}</td><td>${p.salidas}</td><td class="${css}"><strong>${p.stock}</strong></td></tr>`;
    }).join('') || emptyState;
    
    document.getElementById('prod-info').textContent = t ? `${s + 1}-${e} de ${t.toLocaleString()}` : 'Sin resultados';
  }

  // ==== ENTRADAS ====
  getFilteredEnt() {
    let res = this.invService.allEntradas;
    const f = [
      { id: 'fe-code', k: 'code' }, { id: 'fe-qty', k: 'qty' }, { id: 'fe-arancel', k: 'arancel' },
      { id: 'fe-desc', k: 'desc' }, { id: 'fe-empaque', k: 'empaque' }, { id: 'fe-tipo', k: 'tipo' }
    ];
    f.forEach(x => {
      const v = (document.getElementById(x.id).value || '').toLowerCase().trim();
      if (v) res = res.filter(i => String(i[x.k] || '').toLowerCase().includes(v));
    });
    const dt = (document.getElementById('fe-fecha').value || '').trim();
    if (dt) res = res.filter(i => (window.formatFecha(i.fecha) || '').includes(dt));
    return res;
  }

  sortEnt(c) {
    if (this.entSort.col === c) this.entSort.asc = !this.entSort.asc;
    else { this.entSort.col = c; this.entSort.asc = true; }
    
    document.querySelectorAll('#th-entradas th span').forEach(el => el.textContent = '↕');
    const activeTh = document.querySelector(`#th-entradas th[data-col="${c}"] span`);
    if (activeTh) activeTh.textContent = this.entSort.asc ? '↑' : '↓';
    
    this.renderEntradas();
  }

  renderEntradas() {
    let data = this.getFilteredEnt();
    const sc = this.entSort.col, asc = this.entSort.asc;
    data.sort((a, b) => {
      let va = sc === 'fecha' ? window.sortDateStr(a.fecha) : a[sc];
      let vb = sc === 'fecha' ? window.sortDateStr(b.fecha) : b[sc];
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
      return asc ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''));
    });
    
    const t = data.length, s = this.entPage * this.PAGE_SZ, e = Math.min(s + this.PAGE_SZ, t);
    const emptyState = `<tr><td colspan="8" style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:16px; opacity:0.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
      <br><span style="font-size:1.1rem;font-weight:600;color:var(--text)">Sin Entradas Registradas</span>
      <br><span style="font-size:0.85rem">Limpia los filtros para ver el historial completo</span>
    </td></tr>`;

    document.getElementById('tbl-entradas').innerHTML = data.slice(s, e).map(x => {
      const p = this.invService.prodMap.get(x.code);
      const d = (p && p.desc && !p.desc.startsWith('NUEVO')) ? p.desc : x.desc;
      const a = (p && p.arancel && p.arancel !== 'NO EXISTE') ? p.arancel : x.arancel;
      const em = (p && p.empaque) ? p.empaque : x.empaque;
      return `<tr><td class="code">${window.esc(x.code)}</td><td>${x.qty}</td><td>${window.esc(String(a || ''))}</td><td>${window.esc(d || '')}</td><td>${window.esc(em || '')}</td><td>${window.formatFecha(x.fecha)}</td><td>${window.esc(x.tipo || '')}</td><td><div style="display:flex;gap:6px;justify-content:center;"><button class="btn btn-outline" style="padding:6px;margin:0" onclick="window.appController.editarMovimiento('entradas', ${x._idx})" title="Editar Código"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button><button class="btn btn-outline" style="padding:6px;margin:0" onclick="window.appController.duplicarMovimiento('entradas', ${x._idx})" title="Copiar a Salidas para equilibrar stock"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg></button><button class="btn btn-danger" style="padding:6px;margin:0;" onclick="window.appController.eliminarMovimiento('entradas', ${x._idx}, ${x._pk})" title="Eliminar este registro permanentemente"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></td></tr>`;
    }).join('') || emptyState;
    
    document.getElementById('ent-info').textContent = t ? `${s + 1}-${e} de ${t.toLocaleString()}` : '—';
  }

  // ==== SALIDAS ====
  getFilteredSal() {
    let res = this.invService.allSalidas;
    const f = [
      { id: 'fs-code', k: 'code' }, { id: 'fs-qty', k: 'qty' }, { id: 'fs-arancel', k: 'arancel' },
      { id: 'fs-desc', k: 'desc' }, { id: 'fs-empaque', k: 'empaque' }, { id: 'fs-tipo', k: 'tipo' }
    ];
    f.forEach(x => {
      const v = (document.getElementById(x.id).value || '').toLowerCase().trim();
      if (v) res = res.filter(i => String(i[x.k] || '').toLowerCase().includes(v));
    });
    const dt = (document.getElementById('fs-fecha').value || '').trim();
    if (dt) res = res.filter(i => (window.formatFecha(i.fecha) || '').includes(dt));
    const st = (document.getElementById('fs-stock').value || '').trim();
    if (st) res = res.filter(x => { const p = this.invService.prodMap.get(x.code); return p && String(p.stock).includes(st); });
    
    res.forEach(x => { const p = this.invService.prodMap.get(x.code); x._stock = p ? p.stock : 0; });
    return res;
  }

  sortSal(c) {
    if (this.salSort.col === c) this.salSort.asc = !this.salSort.asc;
    else { this.salSort.col = c; this.salSort.asc = true; }
    
    document.querySelectorAll('#th-salidas th span').forEach(el => el.textContent = '↕');
    const activeTh = document.querySelector(`#th-salidas th[data-col="${c}"] span`);
    if (activeTh) activeTh.textContent = this.salSort.asc ? '↑' : '↓';
    
    this.renderSalidas();
  }

  renderSalidas() {
    let data = this.getFilteredSal();
    const sc = this.salSort.col, asc = this.salSort.asc;
    data.sort((a, b) => {
      let va = sc === 'stock' ? a._stock : a[sc];
      let vb = sc === 'stock' ? b._stock : b[sc];
      if (sc === 'fecha') { va = window.sortDateStr(a.fecha); vb = window.sortDateStr(b.fecha); }
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
      return asc ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''));
    });
    
    const t = data.length, s = this.salPage * this.PAGE_SZ, e = Math.min(s + this.PAGE_SZ, t);
    const emptyState = `<tr><td colspan="9" style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:16px; opacity:0.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path></svg>
      <br><span style="font-size:1.1rem;font-weight:600;color:var(--text)">Sin Salidas Registradas</span>
      <br><span style="font-size:0.85rem">Intenta con otros criterios de búsqueda</span>
    </td></tr>`;

    document.getElementById('tbl-salidas').innerHTML = data.slice(s, e).map(x => {
      const p = this.invService.prodMap.get(x.code);
      const d = (p && p.desc && !p.desc.startsWith('NUEVO')) ? p.desc : x.desc;
      const a = (p && p.arancel && p.arancel !== 'NO EXISTE') ? p.arancel : x.arancel;
      const em = (p && p.empaque) ? p.empaque : x.empaque;
      return `<tr><td class="code">${window.esc(x.code)}</td><td>${x.qty}</td><td>${window.esc(String(a || ''))}</td><td>${window.esc(d || '')}</td><td>${window.esc(em || '')}</td><td>${window.formatFecha(x.fecha)}</td><td>${window.esc(x.tipo || '')}</td><td>${x._stock}</td><td><div style="display:flex;gap:6px;justify-content:center;"><button class="btn btn-outline" style="padding:6px;margin:0" onclick="window.appController.editarMovimiento('salidas', ${x._idx})" title="Editar Código"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button><button class="btn btn-outline" style="padding:6px;margin:0" onclick="window.appController.duplicarMovimiento('salidas', ${x._idx})" title="Copiar a Entradas para equilibrar stock"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg></button><button class="btn btn-danger" style="padding:6px;margin:0;" onclick="window.appController.eliminarMovimiento('salidas', ${x._idx}, ${x._pk})" title="Eliminar este registro permanentemente"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></td></tr>`;
    }).join('') || emptyState;
    
    document.getElementById('sal-info').textContent = t ? `${s + 1}-${e} de ${t.toLocaleString()}` : '—';
  }
}

window.uiManager = new UIManager(window.inventoryService);
