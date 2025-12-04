import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Thermometer, Activity, Sparkles } from 'lucide-react'
import { WeatherInsights } from '@/types'
import { weatherService } from '@/services/weather'

export interface InsightsPanelProps {
  insights: WeatherInsights | null
  isLoading?: boolean
  selectedState?: string | null
  selectedCity?: string | null
  onAIAnalysisGenerated?: (analysis: string | null, recommendations: string[]) => void
}

const classificationLabels: Record<string, string> = {
  cold: 'Frio',
  cool: 'Fresco',
  pleasant: 'Agradável',
  warm: 'Quente',
  hot: 'Muito Quente',
}

const classificationColors: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-800',
  cool: 'bg-cyan-100 text-cyan-800',
  pleasant: 'bg-green-100 text-green-800',
  warm: 'bg-orange-100 text-orange-800',
  hot: 'bg-red-100 text-red-800',
}

function TrendIcon({ trend }: { trend: 'rising' | 'falling' | 'stable' }) {
  if (trend === 'rising') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'falling') return <TrendingDown className="h-4 w-4 text-blue-500" />
  return <Minus className="h-4 w-4 text-gray-500" />
}

function getTrendLabel(trend: 'rising' | 'falling' | 'stable'): string {
  if (trend === 'rising') return 'Subindo'
  if (trend === 'falling') return 'Caindo'
  return 'Estável'
}

export function StatisticsCard({ insights, isLoading }: InsightsPanelProps) {
  return (
    <Card data-testid="statistics-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Estatísticas</CardTitle>
        <CardDescription>Médias e extremos do período</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights?.statistics ? (
          <div className="space-y-2" data-testid="statistics-content">
            <div className="flex justify-between" data-testid="avg-temperature">
              <span className="text-muted-foreground">Temp. Média:</span>
              <span className="font-medium">{insights.statistics.avgTemperature?.toFixed(1) ?? '--'}°C</span>
            </div>
            <div className="flex justify-between" data-testid="max-temperature">
              <span className="text-muted-foreground">Temp. Máxima:</span>
              <span className="font-medium">{insights.statistics.maxTemperature?.toFixed(1) ?? '--'}°C</span>
            </div>
            <div className="flex justify-between" data-testid="min-temperature">
              <span className="text-muted-foreground">Temp. Mínima:</span>
              <span className="font-medium">{insights.statistics.minTemperature?.toFixed(1) ?? '--'}°C</span>
            </div>
            <div className="flex justify-between" data-testid="avg-humidity">
              <span className="text-muted-foreground">Umidade Média:</span>
              <span className="font-medium">{insights.statistics.avgHumidity?.toFixed(1) ?? '--'}%</span>
            </div>
            <div className="flex justify-between" data-testid="avg-wind-speed">
              <span className="text-muted-foreground">Vento Médio:</span>
              <span className="font-medium">{insights.statistics.avgWindSpeed?.toFixed(1) ?? '--'} km/h</span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}

export function TrendsCard({ insights, isLoading }: InsightsPanelProps) {
  return (
    <Card data-testid="trends-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tendências</CardTitle>
        <CardDescription>Direção das mudanças</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights?.trends ? (
          <div className="space-y-3" data-testid="trends-content">
            <div className="flex items-center justify-between" data-testid="temperature-trend">
              <span className="text-muted-foreground">Temperatura:</span>
              <div className="flex items-center gap-2">
                <TrendIcon trend={insights.trends.temperatureTrend || 'stable'} />
                <span className="font-medium">{getTrendLabel(insights.trends.temperatureTrend || 'stable')}</span>
              </div>
            </div>
            <div className="flex items-center justify-between" data-testid="humidity-trend">
              <span className="text-muted-foreground">Umidade:</span>
              <div className="flex items-center gap-2">
                <TrendIcon trend={insights.trends.humidityTrend || 'stable'} />
                <span className="font-medium">{getTrendLabel(insights.trends.humidityTrend || 'stable')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}

export function ClassificationBadge({ insights, isLoading }: InsightsPanelProps) {
  const classification = insights?.classification || 'pleasant'
  const label = classificationLabels[classification] || classification
  const colorClass = classificationColors[classification] || 'bg-gray-100 text-gray-800'

  return (
    <Card data-testid="classification-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Thermometer className="h-4 w-4" />
          Classificação
        </CardTitle>
        <CardDescription>Condição geral do clima</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights ? (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
            data-testid="classification-badge"
          >
            {label}
          </span>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}


export function AlertsCard({ insights, isLoading }: InsightsPanelProps) {
  return (
    <Card data-testid="alerts-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alertas
        </CardTitle>
        <CardDescription>Condições extremas detectadas</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights ? (
          <div data-testid="alerts-content">
            {insights.alerts && insights.alerts.length > 0 ? (
              <ul className="space-y-2" data-testid="alerts-list">
                {insights.alerts.map((alert, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-md"
                    data-testid={`alert-item-${index}`}
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-green-600" data-testid="no-alerts">
                Nenhum alerta no momento
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}

export function ComfortScoreGauge({ insights, isLoading }: InsightsPanelProps) {
  const score = insights?.comfortScore ?? 0
  const percentage = Math.min(100, Math.max(0, score))

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-lime-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bom'
    if (score >= 40) return 'Moderado'
    if (score >= 20) return 'Desconfortável'
    return 'Ruim'
  }

  return (
    <Card data-testid="comfort-score-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Índice de Conforto
        </CardTitle>
        <CardDescription>Avaliação geral das condições</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights ? (
          <div className="space-y-2" data-testid="comfort-score-content">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="comfort-score-value">
                {score}
              </span>
              <span className="text-sm text-muted-foreground" data-testid="comfort-score-label">
                {getScoreLabel(score)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5" data-testid="comfort-score-gauge">
              <div
                className={`h-2.5 rounded-full ${getScoreColor(score)}`}
                style={{ width: `${percentage}%` }}
                data-testid="comfort-score-fill"
              />
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}

export function SummaryCard({ insights, isLoading }: InsightsPanelProps) {
  const locationName = insights?.locationName

  return (
    <Card data-testid="summary-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Resumo {locationName && <span className="text-muted-foreground font-normal">- {locationName}</span>}
        </CardTitle>
        <CardDescription>Análise em linguagem natural</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : insights ? (
          <p className="text-sm leading-relaxed" data-testid="summary-text">
            {insights.summary}
          </p>
        ) : (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        )}
      </CardContent>
    </Card>
  )
}

export function AIAnalysisCard({ 
  insights, 
  isLoading,
  selectedState,
  selectedCity,
  onAIAnalysisGenerated,
}: InsightsPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [localAnalysis, setLocalAnalysis] = useState<string | null>(null)
  const [localRecommendations, setLocalRecommendations] = useState<string[]>([])

  const analysis = localAnalysis || insights?.aiAnalysis
  const recommendations = localRecommendations.length > 0 ? localRecommendations : insights?.recommendations || []

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    try {
      const result = await weatherService.generateAIAnalysis({
        state: selectedState || undefined,
        city: selectedCity || undefined,
      })
      setLocalAnalysis(result.analysis)
      setLocalRecommendations(result.recommendations)
      onAIAnalysisGenerated?.(result.analysis, result.recommendations)
    } catch (error) {
      console.error('Erro ao gerar análise AI:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card data-testid="ai-analysis-card" className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Análise IA
            </CardTitle>
            <CardDescription>Análise e recomendações geradas por IA</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAI}
            disabled={isGenerating || isLoading || !insights}
            data-testid="generate-ai-btn"
          >
            <Sparkles className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Gerando...' : 'Gerar Análise'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : !insights ? (
          <div className="text-muted-foreground">Sem dados disponíveis</div>
        ) : analysis ? (
          <div className="space-y-4" data-testid="ai-analysis-content">
            <p className="text-sm leading-relaxed">{analysis}</p>
            {recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recomendações:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            Clique em "Gerar Análise" para obter insights da IA sobre os dados climáticos.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InsightsPanel({ insights, isLoading, selectedState, selectedCity, onAIAnalysisGenerated }: InsightsPanelProps) {
  const locationName = insights?.locationName

  return (
    <div className="space-y-4" data-testid="insights-panel">
      <h2 className="text-xl font-semibold">
        AI Insights {locationName && <span className="text-muted-foreground text-base font-normal">- {locationName}</span>}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatisticsCard insights={insights} isLoading={isLoading} />
        <TrendsCard insights={insights} isLoading={isLoading} />
        <ClassificationBadge insights={insights} isLoading={isLoading} />
        <AlertsCard insights={insights} isLoading={isLoading} />
        <ComfortScoreGauge insights={insights} isLoading={isLoading} />
        <SummaryCard insights={insights} isLoading={isLoading} />
        <AIAnalysisCard 
          insights={insights} 
          isLoading={isLoading} 
          selectedState={selectedState}
          selectedCity={selectedCity}
          onAIAnalysisGenerated={onAIAnalysisGenerated}
        />
      </div>
    </div>
  )
}
