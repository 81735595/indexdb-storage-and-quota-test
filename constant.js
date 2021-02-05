export const DB_NAME = 'sentinel3d'
export const ONE_MEG = 1000000
export const TABLE_PREFIX = 'bag'
export const INDEX_TABLE_NAME = 'index_table'
export const DB_CONFIG = {
  name: DB_NAME,
  version: 1,
  maxBagNum: 3,
  maxSize: 5 * 1024 * ONE_MEG,
  expires: 7 * 24 * 60 * 60 * 1000
}
export const ITEM_SIZE = 1
export const QUEUE_STATUS = {
  CACHE: 0,
  FETCHING: 1,
  WAITING: 2,
}
