const API_BASE_URL = 'https://pokeapi.co/api/v2'

async function requestJSON(url, signal) {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`A API respondeu com o erro ${response.status}.`)
  }

  return response.json()
}

export async function fetchPokemonCatalog(signal) {
  const data = await requestJSON(`${API_BASE_URL}/pokemon?limit=2000`, signal)

  // O número do Pokémon vem no fim do endereço: .../pokemon/25/
  return data.results.map(({ name, url }) => ({
    name,
    url,
    id: Number(url.match(/\/(\d+)\/?$/)?.[1]),
  }))
}

export function fetchPokemonDetails(pokemonEntries, signal) {
  return Promise.all(
    pokemonEntries.map(({ name }) =>
      requestJSON(`${API_BASE_URL}/pokemon/${encodeURIComponent(name)}`, signal),
    ),
  )
}

// Nomes de todos os Pokémon de um tipo, em uma única consulta.
export async function fetchTypeMembers(type, signal) {
  const data = await requestJSON(`${API_BASE_URL}/type/${encodeURIComponent(type)}`, signal)
  return new Set(data.pokemon.map(({ pokemon }) => pokemon.name))
}
