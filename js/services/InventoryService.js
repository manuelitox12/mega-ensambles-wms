/**
 * Inventory Service / Servicio de Inventario
 * Handles core business logic, application state, and stock calculations.
 * Maneja la lógica de negocio central, estado de la aplicación y cálculos de stock.
 */

class InventoryService {
  constructor(dbService) {
    this.dbService = dbService;
    this.allProductos = [];
    this.allEntradas = [];
    this.allSalidas = [];
    this.prodMap = new Map();
    this.pendingSalida = [];
    this.currentAjuste = null;
  }

  /**
   * Loads data from DB into memory.
   * Carga los datos de la base de datos a memoria.
   */
  async loadFromDB() {
    this.allProductos = await this.dbService.getAllWithKeys('productos');
    this.allEntradas = await this.dbService.getAllWithKeys('entradas');
    this.allSalidas = await this.dbService.getAllWithKeys('salidas');
    
    this.allProductos.forEach((x, i) => x._idx = i);
    this.allEntradas.forEach((x, i) => x._idx = i);
    this.allSalidas.forEach((x, i) => x._idx = i);
    
    this.recalcStock();
  }

  /**
   * Recalculates stock for all products.
   * Recalcula el inventario (stock) para todos los productos.
   */
  recalcStock() {
    const entMap = {}, salMap = {};
    
    this.allEntradas.forEach(e => {
      const c = e.code;
      entMap[c] = (entMap[c] || 0) + (Number(e.qty) || 0);
    });
    
    this.allSalidas.forEach(s => {
      const c = s.code;
      salMap[c] = (salMap[c] || 0) + (Number(s.qty) || 0);
    });
    
    this.prodMap.clear();
    
    this.allProductos.forEach(p => {
      p.entradas = entMap[p.code] || 0;
      p.salidas = salMap[p.code] || 0;
      p.stock = p.entradas - p.salidas;
      if (!this.prodMap.has(p.code)) {
        this.prodMap.set(p.code, p);
      }
    });
  }

  /**
   * Balances a single record by duplicating it to the opposite table.
   * Equilibra un registro duplicándolo en la tabla opuesta.
   */
  async duplicarMovimiento(origen, idx) {
    const arr = origen === 'entradas' ? this.allEntradas : this.allSalidas;
    const destino = origen === 'entradas' ? 'salidas' : 'entradas';
    const item = arr.find(x => x._idx === idx);
    
    if (!item) return false;
    
    const nuevoMov = { 
      code: item.code, 
      qty: item.qty, 
      arancel: item.arancel || '', 
      desc: item.desc || '', 
      empaque: item.empaque || '', 
      fecha: item.fecha, 
      tipo: item.tipo || '' 
    };
    
    await this.dbService.putBatch(destino, [nuevoMov]);
    await this.loadFromDB();
    return true;
  }

  /**
   * Balances a batch of filtered records.
   * Equilibra un lote completo de registros filtrados.
   */
  async equilibrarFiltrados(origen, filteredItems) {
    if (!filteredItems || !filteredItems.length) return false;
    
    const destino = origen === 'entradas' ? 'salidas' : 'entradas';
    const lote = filteredItems.map(item => ({
      code: item.code, 
      qty: item.qty, 
      arancel: item.arancel || '', 
      desc: item.desc || '', 
      empaque: item.empaque || '', 
      fecha: item.fecha, 
      tipo: item.tipo || ''
    }));
    
    await this.dbService.putBatch(destino, lote);
    await this.loadFromDB();
    return lote.length;
  }

  /**
   * Edita el código de un movimiento específico.
   * Edits the code of a specific movement.
   */
  async editarMovimiento(origen, pk, newCode) {
    if (pk === undefined || pk === null) return false;
    
    const items = origen === 'entradas' ? this.allEntradas : this.allSalidas;
    const item = items.find(x => x._pk === pk);
    if (!item) return false;

    item.code = newCode;
    
    if (!this.prodMap.has(newCode)) {
      await this.dbService.putBatch('productos', [{
        code: newCode,
        desc: 'NUEVO (Falta descripción)',
        arancel: '',
        empaque: ''
      }]);
    }

    await this.dbService.putBatch(origen, [item]);
    await this.loadFromDB();
    return true;
  }

  /**
   * Deletes a single movement.
   * Elimina un único movimiento.
   */
  async eliminarMovimiento(origen, pk) {
    if (pk === undefined || pk === null) return false;
    await this.dbService.delete(origen, pk);
    await this.loadFromDB();
    return true;
  }

  /**
   * Deletes a batch of filtered records.
   * Elimina un lote de registros filtrados.
   */
  async eliminarFiltrados(origen, filteredItems) {
    if (!filteredItems || !filteredItems.length) return false;
    const keys = filteredItems.map(item => item._pk).filter(pk => pk !== undefined && pk !== null);
    if (!keys.length) return false;
    await this.dbService.deleteBatch(origen, keys);
    await this.loadFromDB();
    return keys.length;
  }

  /**
   * Confirms pending movements and saves them to DB.
   * Confirma los movimientos pendientes y los guarda en base de datos.
   */
  async confirmarMovimiento(destino, fecha, tipoFinal) {
    const salBatch = this.pendingSalida.map(s => ({
      code: s.code,
      qty: s.qty,
      arancel: s.arancel || '',
      desc: s.desc || '',
      empaque: s.empaque || '',
      fecha,
      tipo: tipoFinal
    }));

    if (salBatch.length) {
      await this.dbService.putBatch(destino, salBatch);
    }
    
    const toSaveProds = [];
    const seen = new Set();
    
    this.pendingSalida.forEach(s => {
      if (s.isNew) {
        if (!seen.has(s.code)) {
          seen.add(s.code);
          toSaveProds.push({
            code: s.code,
            desc: s.desc || 'NUEVO (Falta descripción)',
            arancel: s.arancel || '',
            empaque: s.empaque || ''
          });
        }
      } else if (s._updateDesc) {
        if (!seen.has(s.code)) {
          seen.add(s.code);
          toSaveProds.push({
            _pk: s._pk,
            code: s.code,
            desc: s.desc,
            arancel: s.arancel,
            empaque: s.empaque
          });
        }
      }
    });
    
    if (toSaveProds.length) {
      await this.dbService.putBatch('productos', toSaveProds);
    }

    await this.loadFromDB();
    const result = { ops: this.pendingSalida.length, prods: toSaveProds.length };
    this.pendingSalida = [];
    return result;
  }

  /**
   * Applies find and replace globally in pending items.
   * Aplica buscar y reemplazar en los items pendientes.
   */
  applyReplace(findText, replaceText) {
    let replacedCount = 0;
    this.pendingSalida.forEach(s => {
      if (s.code.includes(findText)) {
        s.code = s.code.replace(new RegExp(window.Utils.escapeRegExp(findText), 'g'), replaceText);
        replacedCount++;
        
        const prod = this.prodMap.get(s.code);
        if (prod) {
          s.desc = prod.desc;
          s.arancel = prod.arancel;
          s.empaque = prod.empaque;
          s.isNew = false;
        } else {
          s.desc = 'NUEVO (Falta descripción)';
          s.arancel = '';
          s.empaque = '';
          s.isNew = true;
        }
      }
    });
    return replacedCount;
  }

  /**
   * Saves a physical stock adjustment.
   * Guarda un ajuste físico de inventario.
   */
  async guardarAjuste(physicalQty, fecha) {
    if (!this.currentAjuste) return false;
    
    const diff = physicalQty - this.currentAjuste.currentStock;
    if (diff === 0) return 0;
    
    const qty = Math.abs(diff);
    const item = {
      code: this.currentAjuste.code,
      qty: qty,
      arancel: this.currentAjuste.arancel,
      desc: this.currentAjuste.desc,
      empaque: this.currentAjuste.empaque,
      fecha: fecha,
      tipo: 'A'
    };
    
    if (diff > 0) {
      await this.dbService.putBatch('entradas', [item]);
    } else {
      await this.dbService.putBatch('salidas', [item]);
    }
    
    if (this.currentAjuste.isNew) {
      await this.dbService.putBatch('productos', [{
        code: this.currentAjuste.code,
        desc: 'NUEVO (Falta descripción)',
        arancel: '',
        empaque: ''
      }]);
    }
    
    await this.loadFromDB();
    return diff;
  }
}

window.inventoryService = new InventoryService(window.dbService);
