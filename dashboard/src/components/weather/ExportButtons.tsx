import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import weatherService from '@/services/weather'

export interface ExportButtonsProps {
  disabled?: boolean
}

export function ExportButtons({ disabled }: ExportButtonsProps) {
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isExportingXlsx, setIsExportingXlsx] = useState(false)

  const handleExportCsv = async () => {
    setIsExportingCsv(true)
    try {
      const blob = await weatherService.exportCsv()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `weather-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setIsExportingCsv(false)
    }
  }

  const handleExportXlsx = async () => {
    setIsExportingXlsx(true)
    try {
      const blob = await weatherService.exportXlsx()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `weather-data-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting XLSX:', error)
    } finally {
      setIsExportingXlsx(false)
    }
  }

  return (
    <div className="flex gap-2" data-testid="export-buttons">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCsv}
        disabled={disabled || isExportingCsv}
        data-testid="export-csv-btn"
      >
        {isExportingCsv ? (
          <Download className="h-4 w-4 mr-2 animate-pulse" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Exportar CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportXlsx}
        disabled={disabled || isExportingXlsx}
        data-testid="export-xlsx-btn"
      >
        {isExportingXlsx ? (
          <Download className="h-4 w-4 mr-2 animate-pulse" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        Exportar XLSX
      </Button>
    </div>
  )
}
