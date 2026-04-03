import { useCallback } from 'react'

interface Props {
  /** Returns a data URL (image/png) for the chart */
  onExportPng?: () => Promise<string> | string
  /** Returns an SVG string for the chart */
  onExportSvg?: () => Promise<string> | string
  filename?: string
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export default function ExportButton({
  onExportPng,
  onExportSvg,
  filename = 'chart',
}: Props) {
  const handlePng = useCallback(async () => {
    if (!onExportPng) return
    const dataUrl = await onExportPng()
    downloadDataUrl(dataUrl, `${filename}.png`)
  }, [onExportPng, filename])

  const handleSvg = useCallback(async () => {
    if (!onExportSvg) return
    const svg = await onExportSvg()
    downloadBlob(svg, `${filename}.svg`, 'image/svg+xml;charset=utf-8')
  }, [onExportSvg, filename])

  const handleCopy = useCallback(async () => {
    if (!onExportPng) return
    try {
      const dataUrl = await onExportPng()
      const blob = await dataUrlToBlob(dataUrl)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {
      // Clipboard API not available or denied
    }
  }, [onExportPng])

  return (
    <div className="flex gap-1">
      {onExportPng && (
        <button
          onClick={handlePng}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          title="Export as PNG"
        >
          PNG
        </button>
      )}
      {onExportSvg && (
        <button
          onClick={handleSvg}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          title="Export as SVG"
        >
          SVG
        </button>
      )}
      {onExportPng && (
        <button
          onClick={handleCopy}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          title="Copy to clipboard"
        >
          Copy
        </button>
      )}
    </div>
  )
}
