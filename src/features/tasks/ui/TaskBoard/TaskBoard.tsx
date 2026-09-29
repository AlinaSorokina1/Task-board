import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Box, Button, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import {
  useGetTasksQuery,
  useUpdateTaskStatusMutation,
} from '../../api/taskApi'
import type { Task, TaskStatus } from '../../types'
import { TaskColumn } from '../TaskColumn/TaskColumn'
import { TaskCard } from '../TaskCard/TaskCard'
import { StatusAnalytics } from '../StatusAnalytics/StatusAnalytics'
import { ExtraAnalytics } from '../ExtraAnalytics/ExtraAnalytics'
import {
  captureFrontendException,
  getTelemetryContext,
  logFrontendEvent,
  startNewTrace,
} from '../../../../observability/telemetry'

const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'development',
  'dev_done',
  'test',
  'test_done',
  'review',
  'done',
]

export function TaskBoard() {
  const { data, isLoading, isError } = useGetTasksQuery()
  const [updateStatus, { isLoading: isUpdating }] = useUpdateTaskStatusMutation()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const grouped = useMemo(() => {
    const groups = STATUS_ORDER.reduce(
      (acc, status) => ({ ...acc, [status]: [] as typeof data }),
      {} as Record<TaskStatus, typeof data>,
    )
    if (!data) return groups
    data.forEach((task) => {
      groups[task.status]?.push(task)
    })
    return groups
  }, [data])

  const handleDragStart = (event: DragStartEvent) => {
    // Начинаем новую трассу пользовательского действия для корреляции логов.
    startNewTrace()
    const taskId = Number(event.active.id)
    const task = data?.find((t) => Number(t.id) === taskId)
    if (task) {
      setActiveTask(task)
      // Логируем начало drag-операции.
      void logFrontendEvent('action_submitted', 'info', {
        action: 'drag_start',
        task_id: task.id,
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const taskId = Number(event.active.id)
    const overId = event.over?.id
    if (overId == null) return
    const status = STATUS_ORDER.includes(String(overId) as TaskStatus)
      ? (String(overId) as TaskStatus)
      : null
    if (status == null) return
    const task = data?.find((t) => Number(t.id) === taskId)
    if (task && task.status !== status) {
      // Логируем смену статуса через drag-and-drop.
      void logFrontendEvent('action_submitted', 'info', {
        action: 'drag_drop_status_change',
        task_id: taskId,
        from_status: task.status,
        to_status: status,
      })
      updateStatus({ id: taskId, status })
        .unwrap()
        .catch((error) => {
          // Ошибку мутации отправляем в Sentry и общий телеметрический поток.
          void captureFrontendException(error, 'task_status_update')
        })
    }
  }

  const handleStatusChange = (taskId: number, nextStatus: TaskStatus) => {
    const task = data?.find((item) => item.id === taskId)
    // Начинаем отдельную трассу для изменения статуса из селектора.
    startNewTrace()
    // Логируем действие пользователя до запроса к backend.
    void logFrontendEvent('action_submitted', 'info', {
      action: 'select_status_change',
      task_id: taskId,
      from_status: task?.status,
      to_status: nextStatus,
    })
    updateStatus({ id: taskId, status: nextStatus })
      .unwrap()
      .catch((error) => {
        // Ошибку мутации отправляем в Sentry и общий телеметрический поток.
        void captureFrontendException(error, 'task_status_update')
      })
  }

  const handleTestRuntimeError = () => {
    // Искусственная ошибка для e2e-проверки интеграции с Sentry.
    throw new Error('Synthetic runtime error for Sentry e2e check')
  }

  const handleTestLogEvent = () => {
    // Ручной тест доменного события для Faro/Loki/Sentry breadcrumb.
    startNewTrace()
    const context = getTelemetryContext()
    void logFrontendEvent('action_submitted', 'info', {
      action: 'manual_test_event',
      message: 'Manual test event from UI button',
      ...context,
    })
  }

  if (isLoading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    )
  }

  if (isError) {
    return (
      <Box mt="xl" ta="center">
        <Title order={4}>Не удалось загрузить задачи</Title>
        <Text c="dimmed" mt="xs">
          Убедись, что запущен локальный backend (`npm run server`).
        </Text>
      </Box>
    )
  }

  return (
    <Box p="sm">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2} style={{ color: '#4b5563' }}>
            Task Flow Board
          </Title>
          <Text size="sm" style={{ color: '#4b5563' }}>
            Лёгкий kanban c RTK Query и json-server
          </Text>
        </div>
        <Group>
          <Button
            variant="filled"
            style={{
              backgroundColor: '#fff7fb',
              color: '#be185d',
              borderRadius: '999px',
              boxShadow: '0 10px 25px rgba(190, 24, 93, 0.15)',
            }}
            onClick={handleTestLogEvent}
          >
            Test log event
          </Button>
          <Button color="red" variant="light" onClick={handleTestRuntimeError}>
            Test runtime error
          </Button>
        </Group>
      </Group>

      <Stack gap="lg">
        <DndContext
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: STATUS_ORDER.length }}
            spacing={5}
          >
            {STATUS_ORDER.map((status) => (
              <TaskColumn
                key={status}
                status={status}
                tasks={grouped[status] ?? []}
                onTaskStatusChange={handleStatusChange}
              />
            ))}
          </SimpleGrid>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                noDrag
                onStatusChange={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {isUpdating && (
          <Text size="xs" mt="sm" style={{ color: '#4b5563' }}>
            Сохраняем изменения статусов…
          </Text>
        )}

        <StatusAnalytics />
        <ExtraAnalytics />
      </Stack>
    </Box>
  )
}

