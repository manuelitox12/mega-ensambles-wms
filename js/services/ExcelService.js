/**
 * Excel Service / Servicio de Excel
 * Handles importing and exporting operations using SheetJS and ExcelJS.
 * Maneja operaciones de importación y exportación usando SheetJS y ExcelJS.
 */

class ExcelService {
  constructor(inventoryService) {
    this.invService = inventoryService;
  }

  /**
   * Imports full catalog from an initial Excel backup.
   * Importa el catálogo completo desde un respaldo Excel inicial.
   */
  async importarInventarioBase(fileData) {
    const wb = XLSX.read(fileData, { type: 'array', cellFormulas: false, cellDates: true });
    
    // Import Productos
    const wsP = wb.Sheets['PRODUCTOS'] || wb.Sheets['PRODUCTO'];
    if (!wsP) throw new Error('Hoja PRODUCTOS no encontrada');
    const rangeP = XLSX.utils.decode_range(wsP['!ref']);
    const productos = [];
    for (let r = 1; r <= rangeP.e.r; r++) {
      const cA = wsP[XLSX.utils.encode_cell({ r, c: 0 })];
      if (!cA || !cA.v) continue;
      const code = String(cA.v).trim();
      if (!code) continue;
      
      const cB = wsP[XLSX.utils.encode_cell({ r, c: 1 })];
      const cC = wsP[XLSX.utils.encode_cell({ r, c: 2 })];
      const cD = wsP[XLSX.utils.encode_cell({ r, c: 3 })];
      
      productos.push({
        code,
        arancel: cB ? String(cB.v) : '',
        desc: cC ? String(cC.v) : '',
        empaque: cD ? String(cD.v) : '',
        entradas: 0,
        salidas: 0,
        stock: 0
      });
    }
    await this.invService.dbService.clear('productos');
    await this.invService.dbService.putBatch('productos', productos);

    // Import Entradas
    const wsE = wb.Sheets['ENTRADA'];
    const entradas = [];
    if (wsE) {
      const rangeE = XLSX.utils.decode_range(wsE['!ref']);
      for (let r = 1; r <= rangeE.e.r; r++) {
        const cA = wsE[XLSX.utils.encode_cell({ r, c: 0 })];
        if (!cA || !cA.v) continue;
        const code = String(cA.v).trim();
        if (!code) continue;
        
        const cB = wsE[XLSX.utils.encode_cell({ r, c: 1 })];
        const cF = wsE[XLSX.utils.encode_cell({ r, c: 5 })];
        const cG = wsE[XLSX.utils.encode_cell({ r, c: 6 })];
        
        const prod = productos.find(p => p.code === code);
        entradas.push({
          code,
          qty: cB ? Number(cB.v) || 0 : 0,
          arancel: prod ? prod.arancel : '',
          desc: prod ? prod.desc : '',
          empaque: prod ? prod.empaque : '',
          fecha: cF ? window.parseFecha(cF.v) : '',
          tipo: cG ? String(cG.v) : ''
        });
      }
    }
    await this.invService.dbService.clear('entradas');
    await this.invService.dbService.putBatch('entradas', entradas);

    // Import Salidas
    const wsS = wb.Sheets['SALIDA'];
    const salidas = [];
    if (wsS) {
      const rangeS = XLSX.utils.decode_range(wsS['!ref']);
      for (let r = 1; r <= rangeS.e.r; r++) {
        const cA = wsS[XLSX.utils.encode_cell({ r, c: 0 })];
        if (!cA || !cA.v) continue;
        const code = String(cA.v).trim();
        if (!code) continue;
        
        const cB = wsS[XLSX.utils.encode_cell({ r, c: 1 })];
        const cF = wsS[XLSX.utils.encode_cell({ r, c: 5 })];
        const cG = wsS[XLSX.utils.encode_cell({ r, c: 6 })];
        
        const prod = productos.find(p => p.code === code);
        salidas.push({
          code,
          qty: cB ? Number(cB.v) || 0 : 0,
          arancel: prod ? prod.arancel : '',
          desc: prod ? prod.desc : '',
          empaque: prod ? prod.empaque : '',
          fecha: cF ? window.parseFecha(cF.v) : '',
          tipo: cG ? String(cG.v) : ''
        });
      }
    }
    await this.invService.dbService.clear('salidas');
    await this.invService.dbService.putBatch('salidas', salidas);
    
    await this.invService.loadFromDB();
    return productos.length;
  }

  /**
   * Processes a transfer/order file.
   * Procesa un archivo de transferencia/pedido.
   */
  procesarMovimientoExterno(fileData, globalArancel) {
    const wb = XLSX.read(fileData, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:B1');
    
    let colCode = -1, colQty = -1, colDesc = -1, colEmp = -1;
    let headerRow = -1;
    
    // Auto-detect columns / Autodetectar columnas
    for (let r = range.s.r; r <= Math.min(range.e.r, 15); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v) {
          let val = String(cell.v).toUpperCase().trim();
          if (val.includes('CODIGO') || val.includes('REFERENCIA') || val === 'REF') { colCode = c; headerRow = Math.max(headerRow, r); }
          if (val.includes('CANTIDAD') || val === 'CANT.' || val === 'CANT' || val === 'QTY') { colQty = c; headerRow = Math.max(headerRow, r); }
          if (val.includes('DESCRIPCI')) colDesc = c;
          if (val.includes('EMPAQUE')) colEmp = c;
        }
      }
    }
    
    if (colCode === -1) colCode = 0;
    if (colQty === -1) colQty = 1;

    const skip = ['referencia', 'cantidad', 'mega', 'transferencia', 'pedido', 'fecha', 'documento', 'marca', 'explicacion', 'hojas', 'preparacion', 'detalle', 'empresa', 'codigoin'];
    let items = [];
    let startRow = headerRow !== -1 ? headerRow + 1 : range.s.r;
    
    for (let r = startRow; r <= range.e.r; r++) {
      const cA = ws[XLSX.utils.encode_cell({ r, c: colCode })];
      const cB = ws[XLSX.utils.encode_cell({ r, c: colQty })];
      const cDesc = colDesc !== -1 ? ws[XLSX.utils.encode_cell({ r, c: colDesc })] : null;
      const cEmp = colEmp !== -1 ? ws[XLSX.utils.encode_cell({ r, c: colEmp })] : null;
      
      if (!cA || !cA.v) continue;
      const code = String(cA.v).trim();
      if (!code || skip.some(w => code.toLowerCase() === w)) continue;
      
      let qty = cB && !isNaN(Number(cB.v)) ? Number(cB.v) : 0;
      if (qty < 0) continue; 
      
      let desc = cDesc && cDesc.v ? String(cDesc.v).trim() : '';
      let emp = cEmp && cEmp.v ? String(cEmp.v).trim() : '';
      
      items.push({ code, qty, desc, empaque: emp });
    }
    
    if (!items.length) throw new Error('No se encontraron items válidos en el archivo.');
    
    this.invService.pendingSalida = [];
    let countNuevos = 0;
    
    items.forEach(it => {
      const prod = this.invService.prodMap.get(it.code);
      if (prod) {
        let finalDesc = prod.desc;
        let finalArancel = prod.arancel;
        let needsUpdate = false;
        
        if ((!finalDesc || finalDesc.startsWith('NUEVO')) && it.desc && !it.desc.startsWith('NUEVO')) {
          finalDesc = it.desc;
          needsUpdate = true;
        }
        if ((!finalArancel || finalArancel.trim() === '' || finalArancel === 'NO EXISTE') && globalArancel) {
          finalArancel = globalArancel;
          needsUpdate = true;
        }
        
        this.invService.pendingSalida.push({
          ...it,
          desc: finalDesc,
          arancel: finalArancel,
          empaque: it.empaque || prod.empaque,
          isNew: false,
          _updateDesc: needsUpdate,
          _pk: prod._pk
        });
      } else { 
        let newDesc = it.desc ? it.desc : 'NUEVO (Falta descripción)';
        this.invService.pendingSalida.push({
          ...it,
          desc: newDesc,
          arancel: globalArancel,
          empaque: it.empaque,
          isNew: true
        }); 
        countNuevos++; 
      }
    });
    
    return { itemsCount: items.length, countNuevos };
  }

  /**
   * Generates and downloads a complete Excel Backup file.
   * Genera y descarga un archivo completo de Excel (Backup).
   */
  async exportarExcelCompleto() {
    if (!window.ExcelJS) throw new Error('Librería ExcelJS no cargada.');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mega Ensambles App';
    wb.created = new Date();

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } };
    const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };

    // ENTRADAS
    const wsEnt = wb.addWorksheet('ENTRADA');
    wsEnt.columns = [
      { key: 'code', width: 25 }, { key: 'qty', width: 12 }, { key: 'arancel', width: 15 },
      { key: 'desc', width: 50 }, { key: 'empaque', width: 15 }, { key: 'fecha', width: 15 }, { key: 'tipo', width: 10 }
    ];
    
    const entRows = this.invService.allEntradas.map(e => [
      e.code, e.qty, 
      { formula: `IFERROR(VLOOKUP(ENTRADA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 2, FALSE), "NO EXISTE")`, result: e.arancel },
      { formula: `IFERROR(VLOOKUP(ENTRADA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 3, FALSE), "NO EXISTE")`, result: e.desc },
      { formula: `IFERROR(VLOOKUP(ENTRADA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 4, FALSE), "")`, result: e.empaque },
      window.formatFecha(e.fecha), e.tipo
    ]);
    if (!entRows.length) entRows.push(['', '', '', '', '', '', '']);
    
    wsEnt.addTable({
      name: 'ENTRADA',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleLight9', showRowStripes: true },
      columns: [
        {name: 'CODIGO INTERNO'}, {name: 'CANTIDAD'}, {name: 'ARANCEL'},
        {name: 'DESCRIPCION'}, {name: 'EMPAQUE'}, {name: 'FECHA'}, {name: 'TIPO'}
      ],
      rows: entRows
    });

    // SALIDAS
    const wsSal = wb.addWorksheet('SALIDA');
    wsSal.columns = [
      { key: 'code', width: 25 }, { key: 'qty', width: 12 }, { key: 'arancel', width: 15 },
      { key: 'desc', width: 50 }, { key: 'empaque', width: 15 }, { key: 'fecha', width: 15 },
      { key: 'tipo', width: 10 }, { key: 'stock', width: 15 }
    ];

    const salRows = this.invService.allSalidas.map(s => {
      const pStock = this.invService.prodMap.has(s.code) ? this.invService.prodMap.get(s.code).stock : 0;
      return [
        s.code, s.qty, 
        { formula: `IFERROR(VLOOKUP(SALIDA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 2, FALSE), "NO EXISTE")`, result: s.arancel },
        { formula: `IFERROR(VLOOKUP(SALIDA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 3, FALSE), "NO EXISTE")`, result: s.desc },
        { formula: `IFERROR(VLOOKUP(SALIDA[[#This Row],[CODIGO INTERNO]], PRODUCTO, 4, FALSE), "")`, result: s.empaque },
        window.formatFecha(s.fecha), s.tipo,
        { formula: `INDEX(PRODUCTO[EXISTENCIA], MATCH(SALIDA[[#This Row],[CODIGO INTERNO]], PRODUCTO[CODIGO INTERNO], 0))`, result: pStock }
      ];
    });
    if (!salRows.length) salRows.push(['', '', '', '', '', '', '', '']);

    wsSal.addTable({
      name: 'SALIDA',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleLight10', showRowStripes: true },
      columns: [
        {name: 'CODIGO INTERNO'}, {name: 'CANTIDAD'}, {name: 'ARANCEL'},
        {name: 'DESCRIPCION'}, {name: 'EMPAQUE'}, {name: 'FECHA'},
        {name: 'TIPO'}, {name: 'STOCK ACTUAL'}
      ],
      rows: salRows
    });

    // PRODUCTOS
    const wsProd = wb.addWorksheet('PRODUCTOS');
    wsProd.columns = [
      { key: 'code', width: 25 }, { key: 'arancel', width: 15 }, { key: 'desc', width: 50 },
      { key: 'empaque', width: 15 }, { key: 'entradas', width: 12 }, { key: 'salidas', width: 12 }, { key: 'stock', width: 15 }
    ];

    const prodRows = this.invService.allProductos.map(p => [
      p.code, p.arancel, p.desc, p.empaque, 
      { formula: `SUMIF(ENTRADA[CODIGO INTERNO], PRODUCTO[[#This Row],[CODIGO INTERNO]], ENTRADA[CANTIDAD])`, result: p.entradas },
      { formula: `SUMIF(SALIDA[CODIGO INTERNO], PRODUCTO[[#This Row],[CODIGO INTERNO]], SALIDA[CANTIDAD])`, result: p.salidas },
      { formula: `PRODUCTO[[#This Row],[ENTRADAS]] - PRODUCTO[[#This Row],[SALIDAS]]`, result: p.stock }
    ]);
    if (!prodRows.length) prodRows.push(['', '', '', '', '', '', '']);

    wsProd.addTable({
      name: 'PRODUCTO',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleLight11', showRowStripes: true },
      columns: [
        {name: 'CODIGO INTERNO'}, {name: 'ARANCEL'}, {name: 'DESCRIPCION'},
        {name: 'EMPAQUE'}, {name: 'ENTRADAS'}, {name: 'SALIDAS'}, {name: 'EXISTENCIA'}
      ],
      rows: prodRows
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fechaStr = new Date().toISOString().slice(0, 10);
    saveAs(blob, `CONTROL_DE_INVENTARIO_BACKUP_${fechaStr}.xlsx`);
  }
}

window.excelService = new ExcelService(window.inventoryService);
