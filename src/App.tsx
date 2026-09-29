import { AppShell, Container, Group, Text } from '@mantine/core'
import { TaskBoard } from './features/tasks/components/TaskBoard'

function App() {
  return (
    <AppShell
      padding="xs"
      header={{ height: 56 }}
      withBorder={false}
      styles={{
        root: {
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 55%), #ffe4f2',
        },
        main: {
          maxWidth: '100%',
        },
      }}
      >
      <AppShell.Header
        style={{
          backgroundColor: '#fff7fb', // молочный с розовым оттенком
          boxShadow: '0 12px 30px rgba(190, 24, 93, 0.08)',
        }}
      >
        <Container size="lg" py="xs">
          <Group justify="space-between">
              <Text
                fw={700}
                size="lg"
                style={{
                  letterSpacing: '0.03em',
                  color: '#be185d', // контрастный розовый
                }}
              >
                Task Flow Board
              </Text>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl">
          <TaskBoard />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
