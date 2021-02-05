import { ITEM_SIZE, INDEX_TABLE_NAME } from './constant.js'
import { getStorageEstimated } from './checkQuota.js'
import { getDB } from './db.js'
import { formatToMB } from './utils.js'
import './updateCount.js'
import './data.js'

const elemQuota = document.getElementById('quota');
const elemUsed = document.getElementById('used');
const elemRemaining = document.getElementById('remaining');
const btnDbInit = document.getElementById('btnDbInit')
const elemCountIDB = document.getElementById('countIDB');
const elemItemSize = document.getElementById('itemSize');
const btnAddBag = document.getElementById('btnAddBag');
const btnGetData = document.getElementById('btnGetData')
const requestStatus = document.getElementById('requestStatus');
const btnClearDB = document.getElementById('btnClearDB')
const btnSearch = document.getElementById('searchKey')
const inputKey = document.getElementById('key')

function updateQuota() {
  getStorageEstimated().then((quota) => {
    const remaining = quota.quota - quota.usage;
    elemQuota.textContent = formatToMB(quota.quota);
    elemUsed.textContent = formatToMB(quota.usage);
    elemRemaining.textContent = formatToMB(remaining);
    setTimeout(() => {
      updateQuota();
    }, 500);    
  }).catch((err) => {
    console.error('*** Unable to update quota ***', err);
  });
}

function tdFact(t, p) {
  const td = document.createElement('td')
  td.textContent = t
  p.append(td)
  return td
}

const tableKeys = ['index', 'tableName', 'bagId', 'timeStamp']

export async function updateCount() {
  try {
    const db = await getDB();
    Array.from(elemCountIDB.children).forEach(child => child.remove());
    let datas = await db.transaction(INDEX_TABLE_NAME).store.getAll();
    datas.forEach((data) => {
      const tr = document.createElement('tr')
      tableKeys.forEach(key => tdFact(data[key], tr))
      elemCountIDB.append(tr)
    });
  } catch(e) {
    console.log(e);
  }
}

function toggleRequestStaus() {
  const {running} = queueManager
  requestStatus.textContent = running ? '开' : '关';
  btnGetData.classList.toggle('toggle-on', running);
}

function toggleRequestData() {
  if (queueManager.running) {
    queueManager.stop()
  } else {
    queueManager.start()
  }
  toggleRequestStaus()
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

(function main () {
  updateQuota()
  updateCount()
  initDb()

  elemItemSize.textContent = ITEM_SIZE;

  btnDbInit.addEventListener('click', initDb);
  btnGetData.addEventListener('click', toggleRequestData);
  btnSearch.addEventListener('click', async () => {
    const key = .value;
    console.log(key)
    if (key) {
      const data = await queueManager.get(parseInt(key))
      console.log(data)
    }
  })
  btnAddBag.addEventListener('click', async () => {
    try {
      const curTableInfo = await addBag() 
      setCurTableInfo(curTableInfo);
      for (let i = 0; i < bagInfo.size; i++) {
        await queueManager.add(i)
      }
      queueManager.onFinishi = updateCount
      toggleRequestStaus()
    } catch (e) {
      console.log(e.name)
    }
  })
  btnClearDB.addEventListener('click', () => {
    clearCurTableData();
  })
})()
