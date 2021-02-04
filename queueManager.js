import { getCurTableInfo, getIdbCanUse, getCurTableData, setCurTableDataProxy } from './db.js'
import { getData } from './utils.js'

const STATUS = {
  CACHE: 0,
  FETCHING: 1,
  WAITING: 2,
}

export const queueManager = {
  maxLen: 5,
  running: false,
  stausMap: new Map(),
  runningMap: new Map(),
  holdMap: new Map(),
  waitQueue: [],
  promiseInstance: null,
  start() {
    this.running = true;
    if (this.holdMap.size) {
      this.holdContinue(true);    
    } else if (this.waitQueue.length) {
      this.loop()
    } else {
      this.stop()
    }
  },
  async onFetched(key, data) {
    try {
      await setCurTableDataProxy({ frameIndex: key, value: data })
      this.stausMap.set(key, STATUS.CACHE);
      this.runningMap.delete(key)
      this.checkfinishing()
      this.loop()
    } catch (e) {
      console.log(e)
    }
  },
  holdContinue(success) {
    this.running = success;
    for (let hold of this.holdMap.values()) {
      hold[success ? 'resolve' : 'reject']()
    }
  },
  run(key) {
    this.stausMap.set(key, STATUS.FETCHING);
    this.runningMap.set(key, this.fetch().then(async (data) => {
      if (this.running) {
        this.onFetched(key, data)
      } else {
        new Promise((resolve, reject) => {
          this.holdMap.set(key, { resolve, reject })
        }).then(() => {
          this.holdMap.delete(key)
          this.onFetched(key, data)
        }, () => {
          this.holdMap.delete(key)
        })
      }
      return data
    }))
  },
  checkfinishing() {
    if (this.waitQueue.length === 0 && this.runningMap.size === 0) {
      this.stop()
    }
  },
  loop() {
    if (this.running) {
      while(this.waitQueue.length) {
        if (this.maxLen - this.runningMap.size > 0) {
          const next = this.waitQueue.shift()
          this.run(next)
        } else {
          break;
        }
      }
    }
  },
  stop() {
    if (this.running) {
      this.running = false;
      this.onFinishi && this.onFinishi();
    }
  },
  async add(key) {
    if (getIdbCanUse()) {
      if (!this.stausMap.has(key)) {
        const curTableInfo = getCurTableInfo();
        if (curTableInfo.keys.has(key)) {
          this.stausMap.set(key, STATUS.CACHE);
        } else {
          this.waitQueue.push(key)
          this.stausMap.set(key, STATUS.WAITING);
          this.start()
        }
      }
    } else {
      this.stausMap.set(key, STATUS.WAITING);
      console.log('cache is not available')
    }
  },
  async get(key) {
    if (this.stausMap.has(key)) {
      switch(this.stausMap.get(key)) {
        case STATUS.WAITING:
          if (getIdbCanUse()) {
            return this.run(key)
          } else {
            return await this.fetch()
          }
        case STATUS.FETCHING:
          return this.runningMap.get(key)
        case STATUS.CACHE:
          return await getCurTableData(key)
      }
    } else {
      await this.add(key)
      return this.get(key)
    }
  },
  async fetch() {
    const dataList = await Promise.all(Array(6).fill(0).map(() => getData()))
    const data = dataList.join('|')
    return data;
  }
};
