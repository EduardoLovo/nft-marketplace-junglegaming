/**
 * Reduz uma imagem para um quadrado de `size` px (recorte central) em WebP.
 * O avatar é exibido no máximo em 96px; enviar a foto original da câmera
 * (vários MB) seria desperdício de rede e de armazenamento.
 */
export async function resizeToSquare(file: File, size = 256): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponível')
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  )
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (!blob) throw new Error('Não foi possível processar a imagem')
  return new File([blob], 'avatar.webp', { type: 'image/webp' })
}
