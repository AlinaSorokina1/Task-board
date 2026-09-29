import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDroppable } from '@dnd-kit/core'
import { Badge, Box, Card, Group, Stack, Text, Title } from '@mantine/core'
import type { Task, TaskStatus } from '../../types'
import { TaskCard } from '../TaskCard/TaskCard'

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  development: 'Development',
  dev_done: 'Dev Done',
  test: 'Test',
  test_done: 'Test Done',
  review: 'Review',
  done: 'Done',
}

interface TaskColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskStatusChange: (taskId: number, status: TaskStatus) => void
}

const CARD_HEIGHT = 250
const GAP = 8
const ITEM_SIZE = CARD_HEIGHT + GAP

export function TaskColumn({ status, tasks, onTaskStatusChange }: TaskColumnProps) {
  const count = tasks.length
  const parentRef = useRef<HTMLDivElement | null>(null)

  const { setNodeRef, isOver } = useDroppable({ id: status })

  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      parentRef.current = el
      setNodeRef(el)
    },
    [setNodeRef],
  )

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_SIZE,
    overscan: 5,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <Stack
      gap="sm"
      style={{
        width: 179,
        minWidth: 179,
      }}
    >
      <Group justify="space-between">
        <Group gap="xs">
          <Title order={4} style={{ color: '#4b5563' }}>
            {STATUS_LABELS[status]}
          </Title>
          <Badge
            size="sm"
            variant="filled"
            style={{
              backgroundColor: '#fff7fb',
              color: '#be185d',
            }}
          >
            {count}
          </Badge>
        </Group>
      </Group>

      <Box
        ref={setScrollRef}
        style={{
          minHeight: 120,
          maxHeight: count > 0 ? CARD_HEIGHT * 3 + GAP * 2 : undefined,
          overflowY: count > 0 ? 'auto' : undefined,
          borderRadius: 'var(--mantine-radius-md)',
          backgroundColor: isOver ? 'rgba(190, 24, 93, 0.06)' : undefined,
          transition: 'background-color 0.15s ease',
        }}
      >
        {count === 0 ? (
          <Card
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: '#fff7fb',
              borderColor: '#ffe4f2',
            }}
          >
            <Text c="dimmed" size="sm">
              Здесь пока пусто — перетащи задачу или создай новую.
            </Text>
          </Card>
        ) : (
          <Box
            style={{
              height: totalSize,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const task = tasks[virtualRow.index]
              return (
                <Box
                  key={task.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: GAP,
                  }}
                >
                  <TaskCard
                    task={task}
                    onStatusChange={(nextStatus) =>
                      onTaskStatusChange(Number(task.id), nextStatus)
                    }
                  />
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Stack>
  )
}
