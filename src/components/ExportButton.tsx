import { useCallback, type RefObject } from 'react'
import html2canvas from 'html2canvas'

interface Props {
  targetRef: RefObject<HTMLDivElement | null>
  filename?: string
}

async function exportPng(el: HTMLElement, filename: string) {
  const canvas = await html2canvas(el, { backgroundColor: '#ffffff' })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function exportSvg(el: HTMLElement, filename: string) {
  // Try to find an SVG element inside the container (Recharts, Cytoscape)
  const svg = el.querySelector('svg')
  if (svg) {
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${filename}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
    return
  }
  // Fall back to PNG if no SVG found (Plotly uses canvas/WebGL)
  await exportPng(el, filename)
}

async function copyToClipboard(el: HTMLElement) {
  const canvas = await html2canvas(el, { backgroundColor: '#ffffff' })
  canvas.toBlob(async (blob) => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {
      // Fallback: clipboard API not available
    }
  })
}

export default function ExportButton({ targetRef, filename = 'chart' }: Props) {
  const handlePng = useCallback(() => {
    if (targetRef.current) exportPng(targetRef.current, filename)
  }, [targetRef, filename])

  const handleSvg = useCallback(() => {
    if (targetRef.current) exportSvg(targetRef.current, filename)
  }, [targetRef, filename])

  const handleCopy = useCallback(() => {
    if (targetRef.current) copyToClipboard(targetRef.current)
  }, [targetRef])

  return (
    <div className="flex gap-1">
      <button
        onClick={handlePng}
        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        title="Export as PNG"
      >
        PNG
      </button>
      <button
        onClick={handleSvg}
        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        title="Export as SVG"
      >
        SVG
      </button>
      <button
        onClick={handleCopy}
        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        title="Copy to clipboard"
      >
        Copy
      </button>
    </div>
  )
}
