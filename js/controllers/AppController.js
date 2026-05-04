/**
 * App Controller / Controlador de la Aplicación
 * Connects the UI to the Business Logic.
 * Conecta la Interfaz de Usuario con la Lógica de Negocio.
 */

class AppController {
  constructor(invService, excelService, uiManager) {
    this.invService = invService;
    this.excelService = excelService;
    this.uiManager = uiManager;
    this.extFileData = null;
    this.invFileData = null;
    
    // Cross-tab synchronization / Sincronización entre pestañas
    this.syncChannel = new BroadcastChannel('mega_sync');
    this.syncChannel.onmessage = async (e) => {
      if (e.data === 'db_updated') {
        await this.invService.loadFromDB();
        this.uiManager.renderAll();
      }
    };
  }

  async init() {
    try {
      await this.invService.dbService.open();
      await this.invService.loadFromDB();
      this.uiManager.renderAll();
      
      const movFecha = document.getElementById('mov-fecha');
      if (movFecha) movFecha.valueAsDate = new Date();
      
      const ajFecha = document.getElementById('aj-fecha');
      if (ajFecha) ajFecha.valueAsDate = new Date();
      
      this.setupListeners();
    } catch (e) {
      console.error('Initialization error:', e);
      window.Utils.showGlobalAlert('Error al inicializar la base de datos.', 'err');
    }
  }

  setupListeners() {
    const f = document.getElementById('mov-fecha');
    if (f) f.addEventListener('change', () => this.checkMovReady());
    
    const d = document.getElementById('mov-destino');
    if (d) d.addEventListener('change', () => this.updateDestinoVisuals());
  }

  updateDestinoVisuals() {
    const d = document.getElementById('mov-destino');
    const btn = document.getElementById('btn-confirmar-mov');
    if (!d || !btn) return;
    
    const count = this.invService.pendingSalida ? this.invService.pendingSalida.length : 0;
    const isSalida = d.value === 'salidas';
    
    d.style.borderColor = isSalida ? 'var(--red)' : 'var(--green)';
    d.style.backgroundColor = isSalida ? '#ffebeb' : '#ebffeb';
    
    btn.className = isSalida ? 'btn btn-red' : 'btn btn-green';
    btn.style.backgroundColor = isSalida ? 'var(--red)' : 'var(--green)';
    btn.style.color = '#fff';
    
    if (count > 0) {
      btn.textContent = `¡ALERTA! Guardar ${count} items como ${d.value.toUpperCase()} definitivas`;
    } else {
      btn.textContent = `Confirmar y Guardar en ${d.value.toUpperCase()}`;
    }
  }

  // ==== PAGINATION WRAPPERS ====
  prodFirst() { this.uiManager.prodPage = 0; this.uiManager.renderProductos(); }
  prodPrev() { if (this.uiManager.prodPage > 0) { this.uiManager.prodPage--; this.uiManager.renderProductos(); } }
  prodNext() { if ((this.uiManager.prodPage + 1) * this.uiManager.PAGE_SZ < this.uiManager.getFilteredProds().length) { this.uiManager.prodPage++; this.uiManager.renderProductos(); } }
  prodLast() { const t = this.uiManager.getFilteredProds().length; this.uiManager.prodPage = t ? Math.floor((t - 1) / this.uiManager.PAGE_SZ) : 0; this.uiManager.renderProductos(); }

  entFirst() { this.uiManager.entPage = 0; this.uiManager.renderEntradas(); }
  entPrev() { if (this.uiManager.entPage > 0) { this.uiManager.entPage--; this.uiManager.renderEntradas(); } }
  entNext() { if ((this.uiManager.entPage + 1) * this.uiManager.PAGE_SZ < this.uiManager.getFilteredEnt().length) { this.uiManager.entPage++; this.uiManager.renderEntradas(); } }
  entLast() { const t = this.uiManager.getFilteredEnt().length; this.uiManager.entPage = t ? Math.floor((t - 1) / this.uiManager.PAGE_SZ) : 0; this.uiManager.renderEntradas(); }

  salFirst() { this.uiManager.salPage = 0; this.uiManager.renderSalidas(); }
  salPrev() { if (this.uiManager.salPage > 0) { this.uiManager.salPage--; this.uiManager.renderSalidas(); } }
  salNext() { if ((this.uiManager.salPage + 1) * this.uiManager.PAGE_SZ < this.uiManager.getFilteredSal().length) { this.uiManager.salPage++; this.uiManager.renderSalidas(); } }
  salLast() { const t = this.uiManager.getFilteredSal().length; this.uiManager.salPage = t ? Math.floor((t - 1) / this.uiManager.PAGE_SZ) : 0; this.uiManager.renderSalidas(); }

  // ==== ACTIONS ====
  async duplicarMovimiento(origen, idx) {
    const destino = origen === 'entradas' ? 'salidas' : 'entradas';
    if (!confirm(`¿Deseas duplicar este registro hacia ${destino.toUpperCase()} para equilibrar el stock a cero?`)) return;
    
    const success = await this.invService.duplicarMovimiento(origen, idx);
    if (success) {
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      window.Utils.showGlobalAlert(`Registro equilibrado correctamente. Se creó una copia en ${destino.toUpperCase()}`, 'ok');
    }
  }

  async equilibrarFiltrados(origen) {
    const arr = origen === 'entradas' ? this.uiManager.getFilteredEnt() : this.uiManager.getFilteredSal();
    if (!arr.length) {
      window.Utils.showGlobalAlert('No hay registros filtrados para equilibrar.', 'err');
      return;
    }
    const destino = origen === 'entradas' ? 'salidas' : 'entradas';
    
    if (!confirm(`¿Estás seguro de duplicar los ${arr.length} registros visibles hacia ${destino.toUpperCase()}?`)) return;
    
    const count = await this.invService.equilibrarFiltrados(origen, arr);
    if (count > 0) {
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      window.Utils.showGlobalAlert(`Se equilibraron ${count} registros copiándolos a ${destino.toUpperCase()}.`, 'ok');
    }
  }

  async editarMovimiento(origen, idx) {
    const arr = origen === 'entradas' ? this.invService.allEntradas : this.invService.allSalidas;
    const item = arr.find(x => x._idx === idx);
    if (!item) return;

    const newCode = prompt(`Editar código para este registro en ${origen.toUpperCase()}:`, item.code);
    if (newCode === null || newCode.trim() === '' || newCode.trim() === item.code) return;

    const success = await this.invService.editarMovimiento(origen, item._pk, newCode.trim());
    if (success) {
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      window.Utils.showGlobalAlert('Código actualizado correctamente.', 'ok');
    } else {
      window.Utils.showGlobalAlert('No se pudo actualizar el código.', 'err');
    }
  }

  async eliminarMovimiento(origen, idx, pk) {
    if (!confirm(`¿Estás seguro de eliminar este registro permanentemente de ${origen.toUpperCase()}?`)) return;
    
    const success = await this.invService.eliminarMovimiento(origen, pk);
    if (success) {
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      window.Utils.showGlobalAlert('Registro eliminado correctamente.', 'ok');
    } else {
      window.Utils.showGlobalAlert('No se pudo eliminar el registro.', 'err');
    }
  }

  async eliminarFiltrados(origen) {
    const arr = origen === 'entradas' ? this.uiManager.getFilteredEnt() : this.uiManager.getFilteredSal();
    if (!arr.length) {
      window.Utils.showGlobalAlert('No hay registros filtrados para eliminar.', 'err');
      return;
    }
    
    if (!confirm(`ALERTA: ¿Estás TOTALMENTE SEGURO de ELIMINAR los ${arr.length} registros que estás viendo actualmente en ${origen.toUpperCase()}? Esta acción no se puede deshacer.`)) return;
    
    const count = await this.invService.eliminarFiltrados(origen, arr);
    if (count > 0) {
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      window.Utils.showGlobalAlert(`Se eliminaron ${count} registros de ${origen.toUpperCase()}.`, 'ok');
    }
  }

  // ==== FILE IMPORT/EXPORT ====
  loadInvFile(input) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      this.invFileData = new Uint8Array(e.target.result);
      document.getElementById('inv-fname').textContent = f.name;
      document.getElementById('dz-inv').classList.add('loaded');
      document.getElementById('btn-import').disabled = false;
    };
    r.readAsArrayBuffer(f);
  }

  async importarExcel() {
    const prog = document.getElementById('imp-progress');
    const txt = document.getElementById('imp-text');
    prog.style.display = 'block'; 
    document.getElementById('btn-import').disabled = true;
    
    await window.Utils.sleep(50);
    try {
      txt.textContent = 'Procesando...';
      const prodCount = await this.excelService.importarInventarioBase(this.invFileData);
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      prog.style.display = 'none'; 
      document.getElementById('btn-import').disabled = false;
      document.getElementById('imp-result').innerHTML = `<div class="alert alert-ok">Importación completada: <strong>${prodCount}</strong> productos.</div>`;
      this.uiManager.showPage('dashboard');
    } catch (err) {
      prog.style.display = 'none'; 
      document.getElementById('btn-import').disabled = false;
      document.getElementById('imp-result').innerHTML = `<div class="alert alert-err">Error: ${err.message}</div>`;
    }
  }

  async exportarExcelCompleto() {
    const prog = document.getElementById('exp-progress');
    const txt = document.getElementById('exp-text');
    const btn = document.getElementById('btn-export-excel');
    
    prog.style.display = 'block'; 
    btn.disabled = true;
    txt.textContent = 'Generando archivo...';
    
    try {
      await window.Utils.sleep(50);
      await this.excelService.exportarExcelCompleto();
      window.Utils.showGlobalAlert('Excel generado y descargado con éxito.', 'ok');
    } catch (err) {
      window.Utils.showGlobalAlert('Error al exportar: ' + err.message, 'err');
    } finally {
      prog.style.display = 'none'; 
      btn.disabled = false;
    }
  }

  // ==== REGISTRAR PEDIDO ====
  loadExtFile(input) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      this.extFileData = new Uint8Array(e.target.result);
      document.getElementById('ext-fname').textContent = f.name;
      document.getElementById('dz-ext').classList.add('loaded');
      this.checkMovReady();
    };
    r.readAsArrayBuffer(f);
  }

  checkMovReady() {
    document.getElementById('btn-procesar').disabled = !(this.extFileData && document.getElementById('mov-fecha').value);
  }

  procesarMovimiento() {
    const prog = document.getElementById('mov-progress');
    prog.style.display = 'block'; 
    document.getElementById('btn-procesar').disabled = true;
    const globalArancel = document.getElementById('mov-arancel').value.trim();
    
    setTimeout(() => {
      try {
        const { itemsCount, countNuevos } = this.excelService.procesarMovimientoExterno(this.extFileData, globalArancel);
        
        document.getElementById('mr-total').textContent = itemsCount;
        document.getElementById('mr-entrada').textContent = countNuevos;
        
        document.getElementById('mr-tbl-sal').innerHTML = this.invService.pendingSalida.map((s, i) => {
          const tag = s.isNew ? ' <span class="badge b-orange">Nuevo</span>' : '';
          return `<tr><td>${i + 1}</td><td class="code" style="cursor:pointer" onclick="window.appController.useFindCode('${s.code.replace(/'/g, "\\'")}')" title="Clic para reemplazar este código">${window.Utils.esc(s.code)}</td><td><strong>${s.qty}</strong></td><td>${window.Utils.esc(s.desc)}${tag}</td><td>${window.Utils.esc(String(s.arancel || ''))}</td></tr>`;
        }).join('');
        
        document.getElementById('mov-results').style.display = 'block';
        prog.style.display = 'none'; 
        document.getElementById('btn-procesar').disabled = false;
        this.updateDestinoVisuals();
      } catch (err) {
        prog.style.display = 'none'; 
        document.getElementById('btn-procesar').disabled = false;
        window.Utils.showGlobalAlert(err.message, 'err');
      }
    }, 50);
  }

  async confirmarMovimiento() {
    const fecha = document.getElementById('mov-fecha').value;
    const tipoSelect = document.getElementById('mov-tipo').value;
    const docRef = document.getElementById('mov-doc').value.trim();
    const destino = document.getElementById('mov-destino').value;
    const tipoFinal = docRef ? docRef : tipoSelect;

    try {
      const res = await this.invService.confirmarMovimiento(destino, fecha, tipoFinal);
      this.uiManager.renderAll();
      this.syncChannel.postMessage('db_updated');
      
      document.getElementById('mov-results').style.display = 'none';
      this.extFileData = null;
      document.getElementById('ext-fname').textContent = '';
      document.getElementById('dz-ext').classList.remove('loaded');
      
      window.Utils.showGlobalAlert(`Registrado: ${res.ops} operaciones guardadas en ${destino.toUpperCase()} (${res.prods} productos afectados o nuevos).`, 'ok');
    } catch (err) {
      window.Utils.showGlobalAlert(err.message, 'err');
    }
  }

  // ==== FIND AND REPLACE ====
  searchCatalog() {
    const q = (document.getElementById('tool-search-cat').value || '').toLowerCase().trim();
    const wrap = document.getElementById('tool-search-res-wrap');
    const tbody = document.getElementById('tool-search-res');
    
    if (!q) { wrap.style.display = 'none'; return; }
    
    let res = this.invService.allProductos.filter(p => 
      (p.code || '').toLowerCase().includes(q) || 
      (p.desc || '').toLowerCase().includes(q) || 
      (String(p.arancel || '')).toLowerCase().includes(q) || 
      (p.empaque || '').toLowerCase().includes(q)
    );
    
    if (res.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">No se encontró ninguna coincidencia en el catálogo.</td></tr>';
    } else {
      tbody.innerHTML = res.slice(0, 50).map(p => `<tr><td class="code">${window.Utils.esc(p.code)}</td><td>${window.Utils.esc(p.desc)}</td><td>${p.stock}</td><td><button class="btn" style="padding:4px 8px;font-size:0.7rem;background:var(--accent1);color:#111" onclick="window.appController.useReplaceCode('${p.code.replace(/'/g, "\\'")}')">Usar Reemplazo</button></td></tr>`).join('');
    }
    wrap.style.display = 'block';
  }

  useReplaceCode(code) { document.getElementById('tool-replace').value = code; }
  useFindCode(code) { document.getElementById('tool-find').value = code; }

  applyReplace() {
    const findText = (document.getElementById('tool-find').value || '');
    const replaceText = (document.getElementById('tool-replace').value || '');
    
    if (!findText) { window.Utils.showGlobalAlert('Ingresa la palabra a buscar.', 'err'); return; }
    
    const count = this.invService.applyReplace(findText, replaceText);
    if (count > 0) {
      let countNuevos = this.invService.pendingSalida.filter(s => s.isNew).length;
      document.getElementById('mr-entrada').textContent = countNuevos;
      document.getElementById('mr-tbl-sal').innerHTML = this.invService.pendingSalida.map((s, i) => {
        const tag = s.isNew ? ' <span class="badge b-orange">Nuevo</span>' : '';
        return `<tr><td>${i + 1}</td><td class="code" style="cursor:pointer" onclick="window.appController.useFindCode('${s.code.replace(/'/g, "\\'")}')">${window.Utils.esc(s.code)}</td><td><strong>${s.qty}</strong></td><td>${window.Utils.esc(s.desc)}${tag}</td><td>${window.Utils.esc(String(s.arancel || ''))}</td></tr>`;
      }).join('');
      window.Utils.showGlobalAlert(`Se reemplazaron ${count} coincidencias.`, 'ok');
    } else {
      window.Utils.showGlobalAlert(`No se encontró la palabra en las salidas.`, 'err');
    }
  }

  // ==== AJUSTE FISICO ====
  buscarAjuste() {
    const code = document.getElementById('aj-code').value.trim();
    const info = document.getElementById('aj-info');
    const btn = document.getElementById('btn-ajustar');
    document.getElementById('aj-qty').value = '';
    
    if (!code) { 
      info.innerHTML = 'Escribe un código para ver su estado actual.'; 
      btn.disabled = true; 
      this.invService.currentAjuste = null; 
      return; 
    }
    
    const prod = this.invService.prodMap.get(code);
    if (!prod) {
      info.innerHTML = `<span style="color:var(--orange)">Código <b>${window.Utils.esc(code)}</b> no existe en el catálogo.</span><br>Se creará automáticamente.`;
      this.invService.currentAjuste = { code, isNew: true, currentStock: 0, arancel: '', desc: 'NUEVO (Falta descripción)', empaque: '' };
      this.checkAjusteBtn();
      return;
    }
    
    info.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;margin-top:5px">
        <div style="background:var(--card);padding:10px;border-radius:6px"><div>Entradas</div><strong style="color:var(--accent1)">${prod.entradas}</strong></div>
        <div style="background:var(--card);padding:10px;border-radius:6px"><div>Salidas</div><strong style="color:var(--red)">${prod.salidas}</strong></div>
        <div style="background:var(--card);padding:10px;border-radius:6px;border:1px solid var(--accent1)"><div>Stock</div><strong>${prod.stock}</strong></div>
      </div>
    `;
    this.invService.currentAjuste = { code, isNew: false, currentStock: prod.stock, arancel: prod.arancel, desc: prod.desc, empaque: prod.empaque };
    this.checkAjusteBtn();
  }

  calcularAjuste() {
    if (!this.invService.currentAjuste) return;
    this.checkAjusteBtn();
    
    const physicalQty = Number(document.getElementById('aj-qty').value);
    if (isNaN(physicalQty)) return;
    const diff = physicalQty - this.invService.currentAjuste.currentStock;
    const info = document.getElementById('aj-info');
    
    if (diff > 0) {
      info.innerHTML += `<div style="margin-top:10px;color:var(--green)">El sistema registrará una <b>ENTRADA</b> de <b>+${diff}</b>.</div>`;
    } else if (diff < 0) {
      info.innerHTML += `<div style="margin-top:10px;color:var(--red)">El sistema registrará una <b>SALIDA</b> de <b>${Math.abs(diff)}</b>.</div>`;
    } else {
      info.innerHTML += `<div style="margin-top:10px;color:var(--muted)">El stock está correcto.</div>`;
    }
  }

  checkAjusteBtn() {
    const q = document.getElementById('aj-qty').value;
    const d = document.getElementById('aj-fecha').value;
    document.getElementById('btn-ajustar').disabled = (!this.invService.currentAjuste || q === '' || !d);
  }

  async guardarAjuste() {
    if (!this.invService.currentAjuste) return;
    const physicalQty = Number(document.getElementById('aj-qty').value);
    const fecha = document.getElementById('aj-fecha').value;
    
    document.getElementById('btn-ajustar').disabled = true;
    try {
      const diff = await this.invService.guardarAjuste(physicalQty, fecha);
      if (diff === 0) {
        window.Utils.showGlobalAlert('El stock ya es igual al conteo.', 'ok');
      } else {
        this.uiManager.renderAll();
        this.syncChannel.postMessage('db_updated');
        window.Utils.showGlobalAlert(`Ajuste realizado con éxito. Nuevo stock es ${physicalQty}.`, 'ok');
        document.getElementById('aj-code').value = ''; 
        document.getElementById('aj-qty').value = '';
        this.buscarAjuste();
      }
    } catch (e) {
      window.Utils.showGlobalAlert('Error al guardar: ' + e.message, 'err');
      document.getElementById('btn-ajustar').disabled = false;
    }
  }

  // ==== AUDITORIA ====
  runAudit() {
    const tipo = (document.getElementById('aud-tipo').value || '').toLowerCase().trim();
    const codeStr = (document.getElementById('aud-code').value || '').toLowerCase().trim();
    const mostrar = document.getElementById('aud-mostrar').value;
    const tbody = document.getElementById('tbl-auditoria');

    if (!tipo && !codeStr) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Ingresa un filtro arriba para comparar (Ej: 315)</td></tr>';
      return;
    }

    const ent = this.invService.allEntradas.filter(x => 
      (!tipo || (x.tipo || '').toLowerCase().includes(tipo)) && 
      (!codeStr || (x.code || '').toLowerCase().includes(codeStr))
    );
    const sal = this.invService.allSalidas.filter(x => 
      (!tipo || (x.tipo || '').toLowerCase().includes(tipo)) && 
      (!codeStr || (x.code || '').toLowerCase().includes(codeStr))
    );

    const map = new Map();
    ent.forEach(x => {
      if (!map.has(x.code)) map.set(x.code, { ent: 0, sal: 0, arancel: x.arancel, desc: x.desc, empaque: x.empaque, tipo: x.tipo, fecha: x.fecha });
      map.get(x.code).ent += x.qty;
    });
    sal.forEach(x => {
      if (!map.has(x.code)) map.set(x.code, { ent: 0, sal: 0, arancel: x.arancel, desc: x.desc, empaque: x.empaque, tipo: x.tipo, fecha: x.fecha });
      map.get(x.code).sal += x.qty;
    });

    let html = '';
    let count = 0;
    
    for (let [code, data] of map.entries()) {
      const diff = data.ent - data.sal;
      if (mostrar === 'descuadrados' && diff === 0) continue;
      
      let estado = '';
      let color = '';
      let accion = '';
      
      if (diff === 0) {
        estado = 'OK - Cuadrado'; color = 'var(--green)';
        accion = '<span style="color:var(--muted);font-size:0.8rem">Ninguna</span>';
      } else if (diff > 0) {
        estado = `Faltan Salidas (+${diff})`; color = 'var(--red)';
        accion = `<button class="btn btn-primary" style="padding:4px 8px;font-size:0.7rem;margin:0" onclick="window.appController.fixAudit('${code}', ${diff}, 'salidas')">Crear Salida</button>`;
      } else {
        estado = `Faltan Entradas (${Math.abs(diff)})`; color = 'var(--orange)';
        accion = `<button class="btn btn-primary" style="padding:4px 8px;font-size:0.7rem;margin:0;background:var(--accent1);color:#111" onclick="window.appController.fixAudit('${code}', ${Math.abs(diff)}, 'entradas')">Crear Entrada</button>`;
      }

      html += `<tr>
        <td class="code">${window.Utils.esc(code)}</td>
        <td>${data.ent}</td>
        <td>${data.sal}</td>
        <td><strong style="color:${color}">${Math.abs(diff)}</strong></td>
        <td style="color:${color};font-weight:600">${estado}</td>
        <td>${accion}</td>
      </tr>`;
      count++;
    }

    if (!count) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No se encontraron resultados o todo está cuadrado.</td></tr>';
    } else {
      tbody.innerHTML = html;
    }
  }

  async fixAudit(code, qty, destino) {
    if (!confirm(`¿Deseas crear una ${destino.toUpperCase()} automática por ${qty} unidades para equilibrar el código ${code}?`)) return;
    
    const prod = this.invService.prodMap.get(code) || { desc: '', arancel: '', empaque: '' };
    const tipoFiltro = document.getElementById('aud-tipo').value.trim();
    
    const record = {
      code,
      qty,
      arancel: prod.arancel || '',
      desc: prod.desc || '',
      empaque: prod.empaque || '',
      fecha: new Date().toISOString().slice(0,10),
      tipo: tipoFiltro || 'AJUSTE-AUDIT'
    };
    
    await this.invService.dbService.putBatch(destino, [record]);
    await this.invService.loadFromDB();
    this.uiManager.renderAll();
    this.syncChannel.postMessage('db_updated');
    this.runAudit();
    window.Utils.showGlobalAlert(`Ajuste automático de ${qty} agregado a ${destino.toUpperCase()}.`, 'ok');
  }
}

window.appController = new AppController(window.inventoryService, window.excelService, window.uiManager);
