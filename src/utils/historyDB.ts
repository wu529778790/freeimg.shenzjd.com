import type { HistoryItem } from '../types'

const DB_NAME = 'freeimg'
const STORE_NAME = 'history'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 打开（或创建）IndexedDB 数据库。
 * 使用单例避免重复打开。
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // 用 id 作为主键，并建立 createdAt 索引用于排序
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

/**
 * 读取全部历史记录，按创建时间倒序（最新在前）。
 */
export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('createdAt')
      const request = index.getAll()

      request.onsuccess = () => {
        const items = (request.result as HistoryItem[]).sort(
          (a, b) => b.createdAt - a.createdAt
        )
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('读取历史记录失败：', err)
    return []
  }
}

/**
 * 新增一条历史记录。
 */
export async function addHistory(item: HistoryItem): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('保存历史记录失败：', err)
  }
}

/**
 * 删除指定 id 的历史记录。
 */
export async function removeHistory(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('删除历史记录失败：', err)
  }
}

/**
 * 清空全部历史记录。
 */
export async function clearHistory(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('清空历史记录失败：', err)
  }
}