import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Employee, MatchResult, Project } from './types'

/** matches ストアの値。プロジェクト単位でマッチ結果一式をまとめて保持する。 */
export interface MatchRecord {
  projectId: string
  results: MatchResult[]
  computedAt: string
}

interface AnkenMatchDB extends DBSchema {
  projects: { key: string; value: Project }
  employees: { key: string; value: Employee }
  matches: { key: string; value: MatchRecord }
}

const DB_NAME = 'anken-match'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<AnkenMatchDB>> | null = null

function getDb(): Promise<IDBPDatabase<AnkenMatchDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AnkenMatchDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('projects', { keyPath: 'id' })
        db.createObjectStore('employees', { keyPath: 'id' })
        db.createObjectStore('matches', { keyPath: 'projectId' })
      },
    })
  }
  return dbPromise
}

export function newId(): string {
  return crypto.randomUUID()
}

type StoreName = 'projects' | 'employees' | 'matches'

/** 汎用put。呼び出し側が組み立てた新オブジェクトをそのまま書き込む（ミューテーション禁止）。 */
async function put<Name extends StoreName>(
  storeName: Name,
  value: AnkenMatchDB[Name]['value'],
): Promise<void> {
  const db = await getDb()
  await db.put(storeName, value)
}

/** 汎用get。 */
async function get<Name extends StoreName>(
  storeName: Name,
  key: AnkenMatchDB[Name]['key'],
): Promise<AnkenMatchDB[Name]['value'] | undefined> {
  const db = await getDb()
  return db.get(storeName, key)
}

/** 汎用getAll。 */
async function getAll<Name extends StoreName>(
  storeName: Name,
): Promise<AnkenMatchDB[Name]['value'][]> {
  const db = await getDb()
  return db.getAll(storeName)
}

/** 汎用delete。 */
async function del<Name extends StoreName>(
  storeName: Name,
  key: AnkenMatchDB[Name]['key'],
): Promise<void> {
  const db = await getDb()
  await db.delete(storeName, key)
}

/* --- 案件（projects） --- */

export async function putProject(project: Project): Promise<void> {
  await put('projects', project)
}

export async function getProject(id: string): Promise<Project | undefined> {
  return get('projects', id)
}

export async function getAllProjects(): Promise<Project[]> {
  const all = await getAll('projects')
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteProject(id: string): Promise<void> {
  await del('projects', id)
}

/* --- 人材（employees） --- */

export async function putEmployee(employee: Employee): Promise<void> {
  await put('employees', employee)
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  return get('employees', id)
}

export async function getAllEmployees(): Promise<Employee[]> {
  const all = await getAll('employees')
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteEmployee(id: string): Promise<void> {
  await del('employees', id)
}

/* --- マッチ結果（matches） --- */

export async function putMatchRecord(record: MatchRecord): Promise<void> {
  await put('matches', record)
}

export async function getMatchRecord(projectId: string): Promise<MatchRecord | undefined> {
  return get('matches', projectId)
}

export async function getAllMatchRecords(): Promise<MatchRecord[]> {
  return getAll('matches')
}

export async function deleteMatchRecord(projectId: string): Promise<void> {
  await del('matches', projectId)
}

/* --- 全削除（設定画面のデータ管理用） --- */

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  const stores = ['projects', 'employees', 'matches'] as const
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) {
    await tx.objectStore(store).clear()
  }
  await tx.done
}
