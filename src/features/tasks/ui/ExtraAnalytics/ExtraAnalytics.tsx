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
import { AreaChart, BarChart, LineChart } from '@mantine/charts'

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

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#86efac',
  medium: '#fde68a',
  high: '#fca5a5',
}

type ExtraChartType = 'stacked' | 'line' | 'area'

export function ExtraAnalytics() {
  const [chartType, setChartType] = useState<ExtraChartType>('stacked')

  const { data } = useGetTasksQuery()

  const stackedData = useMemo(() => {
    if (!data) return []
    const byStatus: Record<TaskStatus, Record<TaskPriority, number>> =
      STATUS_ORDER.reduce(
        (acc, status) => ({
          ...acc,
          [status]: { low: 0, medium: 0, high: 0 },
        }),
        {} as Record<TaskStatus, Record<TaskPriority, number>>,
      )
    for (const t of data) {
      const status = t.status
      const priority = t.priority
      if (byStatus[status] && priority in byStatus[status]) {
        byStatus[status][priority] += 1
      }
    }
    return STATUS_ORDER.map((status) => ({
      status: STATUS_LABELS[status],
      Low: byStatus[status].low,
      Medium: byStatus[status].medium,
      High: byStatus[status].high,
    }))
  }, [data])

  const lineData = useMemo(() => {
    if (!stackedData.length) return []
    return stackedData.map((row) => ({
      status: row.status,
      low: row.Low,
      medium: row.Medium,
      high: row.High,
      total: row.Low + row.Medium + row.High,
    }))
  }, [stackedData])

  return (
    <Card
      shadow="sm"
      radius="lg"
      mt="lg"
      withBorder
      style={{ backgroundColor: '#fff7fb' }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={4} style={{ color: '#4b5563' }}>
              Статусы × приоритеты
            </Title>
            <Text size="xs" c="dimmed">
              Распределение задач по статусам и приоритетам
            </Text>
          </div>
          <SegmentedControl
            value={chartType}
            onChange={(v) => setChartType(v as ExtraChartType)}
            size="xs"
            data={[
              { label: 'Столбцы', value: 'stacked' },
              { label: 'Линия', value: 'line' },
              { label: 'Область', value: 'area' },
            ]}
          />
        </Group>

        <Box style={{ width: '100%', maxWidth: 900, paddingInline: 16 }}>
          {chartType === 'stacked' && (
            <BarChart
              h={260}
              data={stackedData}
              dataKey="status"
              type="stacked"
              series={[
                { name: 'Low', color: PRIORITY_COLORS.low },
                { name: 'Medium', color: PRIORITY_COLORS.medium },
                { name: 'High', color: PRIORITY_COLORS.high },
              ]}
              withLegend
              legendPosition="top"
              tickLine="y"
              gridAxis="y"
              barProps={{ radius: 4 }}
            />
          )}
          {chartType === 'line' && (
            <LineChart
              h={260}
              data={lineData}
              dataKey="status"
              series={[
                { name: 'low', color: PRIORITY_COLORS.low },
                { name: 'medium', color: PRIORITY_COLORS.medium },
                { name: 'high', color: PRIORITY_COLORS.high },
                { name: 'total', color: 'pink.5' },
              ]}
              withLegend
              legendPosition="top"
              curveType="monotone"
              tickLine="y"
              gridAxis="y"
            />
          )}
          {chartType === 'area' && (
            <AreaChart
              h={260}
              data={lineData}
              dataKey="status"
              series={[
                { name: 'low', color: PRIORITY_COLORS.low },
                { name: 'medium', color: PRIORITY_COLORS.medium },
                { name: 'high', color: PRIORITY_COLORS.high },
              ]}
              withLegend
              legendPosition="top"
              curveType="monotone"
              tickLine="y"
              gridAxis="y"
            />
          )}
        </Box>
      </Stack>
    </Card>
  )
}
