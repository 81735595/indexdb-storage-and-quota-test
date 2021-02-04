import { formatToMB } from './utils.js'

const elemQuota = document.getElementById('quota');
const elemUsed = document.getElementById('used');
const elemRemaining = document.getElementById('remaining');

function getStorageEstimated() {
  if (navigator.storage) {
    return navigator.storage.estimate();
  } else if (webkitStorageInfo) {
    return new Promise((resolve, reject) => {
      webkitStorageInfo.queryUsageAndQuota(
        webkitStorageInfo.TEMPORARY, 
        (used, remaining) => {
          resolve({ usage: used, quota: used + remaining });
        }, (e) => {
          reject(e);
        }
      );
    });
  }
  return Promise.reject(new Error('have no estimate fun'));
}

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

export async function checkQuota() {
  return getStorageEstimated().then((quota) => {
    const remaining = quota.quota - quota.usage;
    console.log(quota.quota, quota.usage)
    if (remaining > 0) {
      return true
    }
    return false
  }, e => {
    console.log(e)
    return false
  })
}

updateQuota();
