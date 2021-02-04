export const DB_NAME = 'sentinel3d';
export const ONE_MEG = 1000000;
export const TABLE_PREFIX = 'bag';
export const INDEX_TABLE_NAME = 'index_table';
export const DB_CONFIG = {
  maxBagNum: 3,
  expires: 7 * 24 * 60 * 60 * 1000
}

let ITEM_SIZE = 1;

export function setItemSize (v) {
  ITEM_SIZE = v;
}

export function getItemSize () {
  return ITEM_SIZE;
}

export function formatToMB(val) {
  const opts = {
    maximumFractionDigits: 0,
  };
  let result;
  try {
    result = new Intl.NumberFormat('en-us', opts).format(val / ONE_MEG);
  } catch (ex) {
    result = Math.round(val / ONE_MEG);
  }
  return `${result} MB`;
}

const textDecoder = new TextDecoder('utf-8');

function getArrayBuffer(size) {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  const len = view.length;
  for (let i = 0; i < len; i++) {
    view[i] = Math.random() * (126 - 33) + 33;
  }
  return buffer;
}

export function getRandomNumber(min, max) {
  return Math.round(Math.random() * max - min) + min;
}

export function getStr(size) {
  const buffer = getArrayBuffer(size);
  return textDecoder.decode(buffer);
}

export async function getData() {
  return new Promise(resolve => {
    setTimeout(() => {
      const data = getStr(ONE_MEG * ITEM_SIZE);
      resolve(data);
    }, getRandomNumber(1000, 3000))
  })
}