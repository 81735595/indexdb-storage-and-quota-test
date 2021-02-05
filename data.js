import { getDB, setCurTableInfo, clearCurTableData, clearQuota, setIdbCanUse } from './db.js'
import { getStr, getRandomNumber, INDEX_TABLE_NAME, DB_CONFIG } from './utils.js'
import { updateCount } from './updateCount.js'
import { queueManager } from './queueManager.js'

async function addBag() {
  try {
    const db = await getDB();
    const datas = await db.transaction(INDEX_TABLE_NAME).store.getAll();
    datas.sort((a, b) => a.timeStamp - b.timeStamp)
    let newData, tableName;
    const sameBag = datas.find(d => d.bagId === bagInfo.id)
    if (sameBag) {
      tableName = sameBag.tableName
      if (Date.now() - sameBag.timeStamp > DB_CONFIG.expires) {
        await db.clear(tableName)
        newData = {
          ...sameBag,
          timeStamp: Date.now(),
        }
      } else {
        newData = {
          ...sameBag,
        }
      }
    } else {
      const oldest = datas[0];
      const { timeStamp } = oldest
      tableName = oldest.tableName
      if (timeStamp) {
        await db.clear(tableName)
      }
      newData = {
        ...oldest,
        tableName,
        timeStamp: Date.now(),
        bagId: bagInfo.id,
      }
    }
    if (await clearQuota()) {
      await db.put(INDEX_TABLE_NAME, newData)
    } else {
      setIdbCanUse(false)
    }
    const keys = await db.getAllKeys(tableName)
    newData.keys = new Set(keys)
    return newData;
  } catch (e) {
    console.error(e.name)
  }
}
