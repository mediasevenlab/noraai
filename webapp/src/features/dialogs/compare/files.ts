const DB_NAME = 'nora-document-compares'
const STORE = 'files'
const memory = new Map<string, Blob>()

function key(id: string, side: 'left' | 'right') {
  return `${id}:${side}`
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const call = indexedDB.open(DB_NAME, 1)
    call.onupgradeneeded = () => {
      if (!call.result.objectStoreNames.contains(STORE)) call.result.createObjectStore(STORE)
    }
    call.onsuccess = () => resolve(call.result)
    call.onerror = () => reject(call.error)
  })
}

export async function saveCompareFiles(id: string, left: Blob, right: Blob) {
  memory.set(key(id, 'left'), left)
  memory.set(key(id, 'right'), right)
  try {
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(left, key(id, 'left'))
        tx.objectStore(STORE).put(right, key(id, 'right'))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  } catch {
    // The pages stay available until this tab is closed.
  }
}

export async function readCompareFile(id: string, side: 'left' | 'right') {
  const cached = memory.get(key(id, side))
  if (cached) return cached
  try {
    const db = await openDb()
    try {
      const stored = await new Promise<Blob | undefined>((resolve, reject) => {
        const call = db.transaction(STORE, 'readonly').objectStore(STORE).get(key(id, side))
        call.onsuccess = () => resolve(call.result as Blob | undefined)
        call.onerror = () => reject(call.error)
      })
      return stored ?? null
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

export async function forgetCompareFiles(id: string) {
  memory.delete(key(id, 'left'))
  memory.delete(key(id, 'right'))
  try {
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(key(id, 'left'))
        tx.objectStore(STORE).delete(key(id, 'right'))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  } catch {
    // The text of the comparison is already gone.
  }
}
