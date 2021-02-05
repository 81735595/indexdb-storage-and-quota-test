import { ONE_MEG, ITEM_SIZE } from './constant'

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

export function getBag() {
  return {
    id: getStr(8),
    size: 20,
  }
}