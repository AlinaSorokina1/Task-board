export type TaskStatus =
  | 'backlog'
  | 'development'
  | 'dev_done'
  | 'test'
  | 'test_done'
  | 'review'
  | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
}

