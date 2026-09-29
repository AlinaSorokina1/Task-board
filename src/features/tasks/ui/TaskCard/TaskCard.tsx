import { useDraggable } from '@dnd-kit/core'
import { Badge, Card, Group, Select, Stack, Text, Title } from '@mantine/core'
import type { Task, TaskPriority, TaskStatus } from '../../types'

const PRIORITY_COLORS: Record<
  TaskPriority,
  { background: string; border: string; text: string }
> = {
  low: {
    background: '#ecfdf3',
    border: '#bbf7d0',
    text: '#15803d',
  },
  medium: {
    background: '#fffbeb',
    border: '#fef3c7',
    text: '#92400e',
  },
  high: {
    background: '#fee2e2',
    border: '#fca5a5',
    text: '#b91c1c',
  },
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  development: 'Development',
  dev_done: 'Dev Done',
  test: 'Test',
  test_done: 'Test Done',
  review: 'Review',
  done: 'Done',
}

interface TaskCardProps {
  task: Task
  onStatusChange: (status: TaskStatus) => void
  /** Если true, карточка рендерится в DragOverlay — без drag-атрибутов */
  noDrag?: boolean
}

export function TaskCard({ task, onStatusChange, noDrag }: TaskCardProps) {
  const colors = PRIORITY_COLORS[task.priority]

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: String(task.id),
    data: { task },
  })

  return (
    <Card
      ref={noDrag ? undefined : setNodeRef}
      withBorder
      radius="md"
      shadow="sm"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        height: 250,
        display: 'flex',
        flexDirection: 'column',
        opacity: !noDrag && isDragging ? 0.5 : 1,
      }}
    >
      <Stack gap={6} style={{ flex: 1, justifyContent: 'space-between' }}>
        <Group
          justify="space-between"
          align="flex-start"
          style={{ cursor: noDrag ? undefined : 'grab' }}
          {...(noDrag ? {} : { ...listeners, ...attributes })}
        >
          <Title
            order={5}
            style={{
              color: colors.text,
            }}
          >
            {task.title}
          </Title>
          <Badge
            size="xs"
            variant="outline"
            style={{
              color: colors.text,
              borderColor: colors.text,
            }}
          >
            {task.priority}
          </Badge>
        </Group>
        {task.description && (
          <Text
            size="sm"
            lineClamp={3}
            style={{ color: '#4b5563' }}
          >
            {task.description}
          </Text>
        )}
        <Group justify="space-between" mt="xs">
          <Select
            size="xs"
            data={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            value={task.status}
            onChange={(value) => {
              if (!value || value === task.status) return
              onStatusChange(value as TaskStatus)
            }}
          />
          <Text size="xs" style={{ color: '#4b5563' }}>
            ID: {task.id}
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}

