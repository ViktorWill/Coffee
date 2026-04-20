import { useMemo } from 'react'
import { Extraction } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExtractionChartProps {
  extractions: Extraction[]
  beanType: 'espresso' | 'filter'
}

export function ExtractionChart({ extractions, beanType }: ExtractionChartProps) {
  const chartData = useMemo(() => {
    return [...extractions]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((extraction, index) => ({
        index: index + 1,
        date: format(extraction.timestamp, 'MM/dd'),
        grind: extraction.grindSetting,
        time: extraction.timeSeconds,
        output: extraction.outputGrams,
        ratio: extraction.dosingWeight 
          ? parseFloat((extraction.outputGrams / extraction.dosingWeight).toFixed(2))
          : null,
        isPerfect: extraction.tasteNotes.includes('perfect') || extraction.tasteNotes.includes('balanced')
      }))
  }, [extractions])

  if (extractions.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Extraction Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Log at least 2 extractions to see trends
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grind Setting Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: 'Grind Setting', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="grind" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Extraction Time & Output</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="time" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                name="Time (s)"
                dot={{ fill: 'hsl(var(--accent))', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="output" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Output (g)"
                dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {beanType === 'espresso' && chartData.some(d => d.ratio !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brew Ratio History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  domain={[1, 3]}
                  label={{ value: 'Ratio (1:x)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isPerfect ? 6 : 4}
                        fill={payload.isPerfect ? 'hsl(var(--accent))' : 'hsl(var(--chart-3))'}
                        stroke={payload.isPerfect ? 'hsl(var(--accent-foreground))' : 'none'}
                        strokeWidth={payload.isPerfect ? 2 : 0}
                      />
                    )
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Perfect shots highlighted with larger dots
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
