import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'db.json')

const raw = fs.readFileSync(dbPath, 'utf8')
const db = JSON.parse(raw)

const tasks = Array.isArray(db.tasks) ? db.tasks : []
const existingIds = tasks.map((t) => Number(t.id))
const startId = (existingIds.length ? Math.max(...existingIds) : 0) + 1

const COUNT = 176

for (let i = 0; i < COUNT; i += 1) {
  const id = String(startId + i)
  tasks.push({
    id,
    title: `Большая задача #${id}`,
    description: `Сгенерированная тестовая задача для профилирования и виртуализации. Номер ${id}.`,
    status: 'test_done',
    priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
    dueDate: null,
  })
}

db.tasks = tasks
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')

// eslint-disable-next-line no-console
console.log(`Добавлено ${COUNT} задач, всего теперь: ${db.tasks.length}`)

