import { getItemSize, setItemSize, INDEX_TABLE_NAME } from './utils.js'
import { getDB } from './db.js'

const elemCountIDB = document.getElementById('countIDB');
const elemItemSize = document.getElementById('itemSize');

elemItemSize.value = getItemSize();
elemItemSize.addEventListener('change', (e) => {
  setItemSize(e.target.value);
})

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

updateCount();
