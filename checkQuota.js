export function getStorageEstimated() {
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

export async function checkQuota(max) {
  return getStorageEstimated().then((quota) => {
    const remaining = (typeof max ==='undefined' ? quota.quota : max) - quota.usage;
    if (remaining > 0) {
      return true
    }
    return false
  }, e => {
    console.log(e)
    return false
  })
}
