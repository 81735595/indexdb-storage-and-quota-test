import { openDB, deleteDB } from 'https://cdn.jsdelivr.net/npm/idb@6.0.0/build/esm/index.js';
import { DB_NAME, TABLE_PREFIX, INDEX_TABLE_NAME, DB_CONFIG } from './utils.js';
import { queueManager } from './queueManager.js'
import { checkQuota } from './checkQuota.js';

let dbInstance;
let curTableInfo;
let idbCanUse = false;

async function dbInit ({ maxBagNum }) {
  const db = await openDB(DB_NAME, 1, {
    upgrade: async (db, oldVersion, newVersion, transaction) => {
      db.createObjectStore(INDEX_TABLE_NAME, { keyPath: 'index' })
      for (let i = 0; i < maxBagNum; i++) {
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
    terminated() {
      setIdbCanUse(false)
      console.log('something wrong with indexedDb, closes cache')
    }
  })
  return db
}

export async function getDB() {
  return (await dbInstance);
}

export async function initDb() {
  try {
    if (!dbInstance) {
      dbInstance = dbInit(DB_CONFIG);
      setIdbCanUse(true);
    } else {
      const db = await getDB();
      const nameList = Array.from(db.objectStoreNames);
      nameList.forEach(async (name) => {
        await db.clear(name)
      })
      const { maxBagNum } = DB_CONFIG
      const tableList = Array(maxBagNum).fill().map((v, i) => `${TABLE_PREFIX}_${i}`)
      const tx = db.transaction(INDEX_TABLE_NAME, 'readwrite')
      const txList = tableList.map((tableName, i) => tx.store.add({
        index: i,
        tableName,
        bagId: '',
        timeStamp: 0,
      }))
      txList.push(tx.done)
      Promise.all(txList)
    }
  } catch (e) {
    console.log(e); 
    setIdbCanUse(false);
  }
}

export async function delDB() {
  try {
    const db = await getDB();
    if (db) {
      db.close();
      await deleteDB(DB_NAME, {
        blocked(e) {
          console.log(e, 'something')
        }
      })
    }
  } catch (e) {
    console.log(e); 
  } finally {
    setIdbCanUse(false);
  }
}

export function setCurTableInfo(info) {
  curTableInfo = info
}

export function getCurTableInfo() {
  return curTableInfo
}

export function getIdbCanUse() {
  return idbCanUse;
}

export function setIdbCanUse(state) {
  idbCanUse = state;
}

export async function clearCurTableData() {
  const curTableInfo = getCurTableInfo()
  const db = await getDB()
  const { tableName } = curTableInfo
  db.clear(tableName)
}

export async function getCurTableData(key) {
  const { tableName } = getCurTableInfo()
  const db = await getDB()
  const data = await db.get(tableName, key)
  const { value } = data
  return value
}

async function getCanClearTableInfo(clearCurTable) {
  const db = await getDB()
  const tables = await db.getAll(INDEX_TABLE_NAME)
  let tablesCanClear = tables.filter(t => t.timeStamp !== 0)
  if (clearCurTable) {
    const curTableInfo = getCurTableInfo()
    const { bagId } = curTableInfo
    tablesCanClear = tablesCanClear.filter(t => t.bagId !== bagId)
  }
  tablesCanClear.sort((a, b) => a.timeStamp - b.timeStamp)
  return tablesCanClear
}

export async function clearQuota(clearCurTable) {
  const infoList = []
  let alwaysNotEnough = true
  const db = await getDB()
  const hasQuota = await checkQuota()
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

export async function setCurTableData(data) {
  const { tableName } = getCurTableInfo()
  try {
    const db = await getDB();
    await db.put(tableName, data)
  } catch (e) {
    queueManager.stop()
    console.log(`*** IndexedDB: '${e.name}' ***`, e);
    if (e.name === 'QuotaExceededError' && getIdbCanUse()) {
      if (await clearQuota(true)) {
        await setCurTableData(data)
      } else {
        setIdbCanUse(false);
        throw e
      }
    } else if (e.name !== 'QuotaExceededError' && getIdbCanUse()) {
      setIdbCanUse(false);
      throw e
    } else {
      throw e
    }
  }
}

export async function setCurTableDataProxy(data) {
  try {
    await setCurTableData(data)
    if (!queueManager.running) {
      queueManager.holdContinue(true);
    }
  } catch (e) {
    queueManager.holdContinue(false);
    throw e;
  }
}

// const btnDbDel = document.getElementById('btnDbDel')
const btnDbInit = document.getElementById('btnDbInit')

// btnDbDel.addEventListener('click', delDB);
btnDbInit.addEventListener('click', initDb);

initDb();
