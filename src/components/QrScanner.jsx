import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Lê o QR Code pela câmera. Só é montado quando a pessoa pede, porque abrir a
// câmera exige permissão e acende a luz do aparelho.
export default function QrScanner({ onRead, onCancel }) {
  const regionId = useId().replace(/:/g, '')
  const [error, setError] = useState('')
  const scanner = useRef(null)
  const alreadyRead = useRef(false)

  useEffect(() => {
    let active = true
    const instance = new Html5Qrcode(regionId, { verbose: false })
    scanner.current = instance

    instance
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (alreadyRead.current) return
          const match = String(text).match(/(\d{6})/)
          if (!match) return
          alreadyRead.current = true
          onRead(match[1])
        },
        () => {},
      )
      .catch(() => {
        if (!active) return
        setError('Não conseguimos abrir a câmera. Verifique a permissão ou digite o código.')
      })

    return () => {
      active = false
      // stop() reclama se a câmera nem chegou a abrir, e aí não há o que parar.
      instance.stop().then(() => instance.clear()).catch(() => {})
    }
  }, [onRead, regionId])

  return (
    <div className="qr-scanner">
      <div id={regionId} className="qr-scanner-view" />
      {error && <p className="qr-scanner-error" role="alert">{error}</p>}
      <button className="secondary-button" type="button" onClick={onCancel}>
        Fechar a câmera
      </button>
    </div>
  )
}
