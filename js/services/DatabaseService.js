/**
 * Database Service / Servicio de Base de Datos
 * Handles IndexedDB operations and schema management.
 * Maneja las operaciones y el esquema de IndexedDB.
 */

class DatabaseService {
  constructor() {
    this.DB_NAME = 'MegaInventarioDB_v3';
    this.DB_VER = 1;
    this.db = null;
  }

  /**
   * Initializes the database.
   * Inicializa la base de datos.
   */
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VER);
      
      request.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('productos')) {
          const s = d.createObjectStore('productos', { autoIncrement: true });
          s.createIndex('code', 'code', { unique: false });
          s.createIndex('desc', 'desc', { unique: false });
        }
        if (!d.objectStoreNames.contains('entradas')) {
          const s = d.createObjectStore('entradas', { autoIncrement: true });
          s.createIndex('code', 'code', { unique: false });
          s.createIndex('fecha', 'fecha', { unique: false });
        }
        if (!d.objectStoreNames.contains('salidas')) {
          const s = d.createObjectStore('salidas', { autoIncrement: true });
          s.createIndex('code', 'code', { unique: false });
          s.createIndex('fecha', 'fecha', { unique: false });
        }
      };
      
      request.onsuccess = e => {
        this.db = e.target.result;
        resolve(this.db);
      };
      
      request.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Puts multiple items into a store.
   * Inserta múltiples elementos en un almacén.
   */
  putBatch(storeName, items) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      items.forEach(i => {
        if (i._pk !== undefined) {
          let k = i._pk;
          delete i._pk;
          store.put(i, k);
          i._pk = k;
        } else {
          store.put(i);
        }
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Retrieves all items from a store without keys.
   * Recupera todos los elementos de un almacén sin sus claves primarias.
   */
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Retrieves all items from a store including keys.
   * Recupera todos los elementos de un almacén incluyendo sus claves primarias.
   */
  getAllWithKeys(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.openCursor();
      const arr = [];
      
      request.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          val._pk = cursor.key;
          arr.push(val);
          cursor.continue();
        } else {
          resolve(arr);
        }
      };
      
      request.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Clears a store completely.
   * Limpia un almacén completamente.
   */
  clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Deletes an item by its primary key.
   * Elimina un elemento por su clave primaria.
   */
  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  /**
   * Deletes multiple items by their primary keys.
   * Elimina múltiples elementos por sus claves primarias.
   */
  deleteBatch(storeName, keys) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      keys.forEach(k => store.delete(k));
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }
}

window.dbService = new DatabaseService();
