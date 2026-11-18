import { useEffect, useState } from 'react'

// Nem todo Pokémon tem ilustração: formas alternativas (Rattata de Alola, megas)
// costumam vir sem imagem na API, e um endereço pode falhar no meio do caminho.
// Nos dois casos entra o mesmo símbolo no lugar, em vez de um espaço vazio ou do
// ícone de imagem quebrada do navegador.
export default function PokemonArt({ src, alt, lazy = false }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return <span className="image-fallback" role="img" aria-label={alt}>?</span>
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : undefined}
      onError={() => setFailed(true)}
    />
  )
}
