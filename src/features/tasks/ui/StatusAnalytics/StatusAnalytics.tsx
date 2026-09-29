import { useMemo, useState } from 'react'
import { useGetTasksQuery } from '../../api/taskApi'
import type { TaskPriority, TaskStatus } from '../../types'
import {
  Box,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { BarChart, DonutChart, PieChart } from '@mantine/charts'

type ChartType = 'bar' | 'pie' | 'donut'
type Dimension = 'status' | 'priority'

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  development: 'Development',
  dev_done: 'Dev Done',
  test: 'Test',
  test_done: 'Test Done',
  review: 'Review',
  done: 'Done',
}

const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'development',
  'dev_done',
  'test',
  'test_done',
  'review',
  'done',
]

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_ORDER: TaskPriority[] = ['low', 'medium', 'high']

// Нежные цвета как фоны карточек
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#86efac', // чуть ярче зелёный low
  medium: '#fde68a', // чуть ярче жёлтый medium
  high: '#fca5a5', // чуть ярче красный high
}

export function StatusAnalytics() {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [dimension, setDimension] = useState<Dimension>('status')

  const { statusCounts, priorityCounts, total } = useGetTasksQuery(undefined, {
    selectFromResult: ({ data }) => {
      const statusBase: Record<TaskStatus, number> = {
        backlog: 0,
        development: 0,
        dev_done: 0,
        test: 0,
        test_done: 0,
        review: 0,
        done: 0,
      }
      const priorityBase: Record<TaskPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
      }

      if (!data) {
        return { statusCounts: statusBase, priorityCounts: priorityBase, total: 0 }
      }

      for (const t of data) {
        statusBase[t.status] += 1
        priorityBase[t.priority] += 1
      }
      return {
        statusCounts: statusBase,
        priorityCounts: priorityBase,
        total: data.length,
      }
    },
  })

  const statusBarData = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        label: STATUS_LABELS[status],
        count: statusCounts[status],
      })),
    [statusCounts],
  )

  const priorityBarData = useMemo(
    () => [
      {
        bucket: 'Priorities',
        Low: priorityCounts.low,
        Medium: priorityCounts.medium,
        High: priorityCounts.high,
      },
    ],
    [priorityCounts],
  )

  const pieData = useMemo(
    () =>
      (dimension === 'status'
        ? STATUS_ORDER.map((status, index) => ({
            name: STATUS_LABELS[status],
            value: statusCounts[status],
            color: ['pink', 'violet', 'grape', 'indigo', 'cyan', 'teal', 'orange'][
              index % 7
            ],
          }))
        : PRIORITY_ORDER.map((priority) => ({
            name: PRIORITY_LABELS[priority],
            value: priorityCounts[priority],
            color: PRIORITY_COLORS[priority],
          }))
      ).filter((item) => item.value > 0),
    [dimension, statusCounts, priorityCounts],
  )

  return (
    <Card
      shadow="sm"
      radius="lg"
      mt="lg"
      withBorder
      style={{
        backgroundColor: '#fff7fb',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <div>
            <Title order={4} style={{ color: '#4b5563' }}>
              Аналитика по {dimension === 'status' ? 'статусам' : 'приоритетам'}
            </Title>
            <Text size="xs" c="dimmed">
              Всего задач: {total}
            </Text>
          </div>
          <Group gap="xs">
            <SegmentedControl
              value={dimension}
              onChange={(value) => setDimension(value as Dimension)}
              size="xs"
              data={[
                { label: 'Статусы', value: 'status' },
                { label: 'Приоритеты', value: 'priority' },
              ]}
            />
            <SegmentedControl
              value={chartType}
              onChange={(value) => setChartType(value as ChartType)}
              size="xs"
              data={[
                { label: 'Bar', value: 'bar' },
                { label: 'Pie', value: 'pie' },
                { label: 'Donut', value: 'donut' },
              ]}
            />
          </Group>
        </Group>

        <Box
          style={{
            width: '100%',
            maxWidth: 800,
            paddingInline: 16,
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          {chartType === 'bar' ? (
            dimension === 'status' ? (
              <BarChart
                h={220}
                data={statusBarData}
                dataKey="label"
                series={[{ name: 'count', color: 'pink.6' }]}
                withLegend={false}
                tickLine="y"
                gridAxis="y"
                barProps={{ radius: 6 }}
              />
            ) : (
              <BarChart
                h={220}
                data={priorityBarData}
                dataKey="bucket"
                series={[
                  { name: 'Low', color: PRIORITY_COLORS.low },
                  { name: 'Medium', color: PRIORITY_COLORS.medium },
                  { name: 'High', color: PRIORITY_COLORS.high },
                ]}
                withLegend
                tickLine="y"
                gridAxis="y"
                barProps={{ radius: 6 }}
              />
            )
          ) : chartType === 'pie' ? (
            <PieChart
              data={pieData}
              size={160}
              withLabels
              labelsPosition="outside"
              labelsType="percent"
              withTooltip
            />
          ) : (
            <DonutChart
              data={pieData}
              size={160}
              withLabels
              labelsType="percent"
              withTooltip
            />
          )}
        </Box>
      </Stack>
    </Card>
  )
}

