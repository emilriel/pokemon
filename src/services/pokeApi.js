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
  return data.results
}

export function fetchPokemonDetails(pokemonEntries, signal) {
  return Promise.all(
    pokemonEntries.map(({ name }) =>
      requestJSON(`${API_BASE_URL}/pokemon/${encodeURIComponent(name)}`, signal),
    ),
  )
}