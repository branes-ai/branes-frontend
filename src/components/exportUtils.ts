/**
 * Export utilities for SVG-based charts (Recharts).
 * Extracts the SVG from a container, converts to PNG via canvas.
 */

export function getSvgFromContainer(
  container: HTMLDivElement | null,
): SVGSVGElement | null {
  return container?.querySelector('svg') ?? null
}

export function svgToString(svg: SVGSVGElement): string {
  // Clone to avoid mutating the live DOM
  const clone = svg.cloneNode(true) as SVGSVGElement
  // Ensure xmlns is set for standalone SVG
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // Inline computed styles for text elements
  const texts = clone.querySelectorAll('text')
  texts.forEach((t) => {
    if (!t.getAttribute('fill')) t.setAttribute('fill', '#666')
    if (!t.getAttribute('font-size')) t.setAttribute('font-size', '12')
  })
  return new XMLSerializer().serializeToString(clone)
}

export function svgToPngDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  return new Promise((resolve) => {
    const svgStr = svgToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = svg.clientWidth * scale
      canvas.height = svg.clientHeight * scale
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve('data:,')
    }
    img.src = url
  })
}
