import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Desenha o QR Code do endereço da sala, para o amigo apontar a câmera.
export default function QrCode({ value, label }) {
  const [image, setImage] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setFailed(false)

    QRCode.toDataURL(value, { margin: 1, width: 320, color: { dark: '#173a32', light: '#ffffff' } })
      .then((url) => { if (active) setImage(url) })
      .catch(() => { if (active) setFailed(true) })

    return () => { active = false }
  }, [value])

  if (failed) {
    return <p className="qr-fallback">Não foi possível desenhar o QR Code. Use o código.</p>
  }

  return image
    ? <img className="qr-image" src={image} alt={label} />
    : <span className="qr-image qr-image-loading" aria-hidden="true" />
}
