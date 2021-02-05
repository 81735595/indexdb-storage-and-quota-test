import { openDB, deleteDB } from 'https://cdn.jsdelivr.net/npm/idb@6.0.0/build/esm/index.js';
import { DB_NAME, TABLE_PREFIX, INDEX_TABLE_NAME, DB_CONFIG } from './constant.js';
import { queueManager } from './queueManager.js'
import { checkQuota } from './checkQuota.js';

let dbInstance;
let curTableInfo;
let idbCanUse = false;










export class LocalCache {
  #_db = null
  #queue = null
  #config = null
  #curTableInfo = null
  #usable = true
  #full = false
  async constructor(config) {
    const { maxTableNum, name, version } = config
    this.#config = config
    this.#queue = new QueueManager()
    this.#_db = openDB(name, version, {
      upgrade: async (db, oldVersion, newVersion, transaction) => {
        // TODO: 感觉得把版本用上
        db.createObjectStore(INDEX_TABLE_NAME, { keyPath: 'index' })
        for (let i = 0; i < maxTableNum; i++) {
          const tableName = `${TABLE_PREFIX}_${i}`;
          db.createObjectStore(tableName, { keyPath: 'frameIndex' });
          const store = transaction.objectStore(INDEX_TABLE_NAME);
          await store.add({
            index: i,
            tableName,
            bagId: '',
            timeStamp: 0,
          })
        }
      },
      terminated: () => {
        this.#usable = false
        console.log('something wrong with indexedDb, cache unable')
      }
    })
    this.checkQuota()
  }
  async get db() {
    return (await this.#_db)
  }
  async destroy() {
    const db = await this.db
    try {
      if (db) {
        db.close();
        await deleteDB(this.#config.name, {
          blocked(e) {
            console.log('something wrong', e)
          }
        })
      }
    } catch (e) {
      console.log('destroy failed', e); 
    } finally {
      this.#usable = false
    }
  }
  async checkQuota() {
    this.#full = await checkQuota(this.#config.maxSize) 
    return this.#full
  }
  async clearCurTableData() {
    const { tableName } = this.#curTableInfo
    const db = await this.db
    await db.clear(tableName)
  }
  async getCurTableData(key) {
    const { tableName } = this.#curTableInfo
    const db = await this.db
    const data = await db.get(tableName, key)
    const { value } = data
    return value
  }
  async getCanClearTableInfo(clearCurTable) {
    const db = await this.db
    const tables = await db.getAll(INDEX_TABLE_NAME)
    let tablesCanClear = tables.filter(t => t.timeStamp !== 0)
    if (clearCurTable) {
      const { bagId } = this.#curTableInfo
      tablesCanClear = tablesCanClear.filter(t => t.bagId !== bagId)
    }
    tablesCanClear.sort((a, b) => a.timeStamp - b.timeStamp)
    return tablesCanClear
  }
  async setCurTableDataProxy(data) {
    try {
      await this.#setCurTableData(data)
      if (!this.#queue.running) {
        this.#queue.holdContinue(true);
      }
    } catch (e) {
      this.#queue.holdContinue(false);
      throw e;
    }
  }
  async #setCurTableData(data) {
    const { tableName } = this.#curTableInfo
    const db = await this.db
    try {
      await db.put(tableName, data)
    } catch (e) {
      this.#queue.stop()
      if (e.name === 'QuotaExceededError' && this.#usable) {
        await this.clearQuota(true)
        if (!this.#full) {
          await this.#setCurTableData(data)
        } else {
          this.#usable = false;
          throw e
        }
      } else {
        this.#usable = false;
        throw e
      }
      console.log(`*** IndexedDB: '${e.name}' ***`, e);
    }
  }
  async clearQuota(clearCurTable) {
    const infoList = []
    let alwaysNotEnough = true
    const db = await this.db
    const hasQuota = await this.checkQuota()
    if (hasQuota) {
      alwaysNotEnough = false
    } else {
      const tableInfos = await getCanClearTableInfo(clearCurTable)
      while (tableInfos.length) {
        const tableInfo = tableInfos.shift()
        const { tableName } = tableInfo
        await db.clear(tableName)
        infoList.push(tableInfo)
        if (await checkQuota()) {
          alwaysNotEnough = false
          break
        }
      }
      while (infoList.length) {
        const info = infoList.shift()
        await db.put(INDEX_TABLE_NAME, {...info, bagId: '', timeStamp: 0})
      }
    }
    return !alwaysNotEnough
  }
}

export default {
  localCache: new LocalCache(DB_CONFIG),
  bagInfo: null,
  init(bagInfo) {
    this.bagInfo = bagInfo;
    this.localCache
  },
  get(key) {

  },
  add() {

  },
  async clear() {
    localCache
  }
};