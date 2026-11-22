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

// Detalhes dos golpes (força, precisão, tipo e classe), um pedido por golpe.
// Golpes que a API não devolver viram null e são descartados depois.
export function fetchMoves(moveNames, signal) {
  return Promise.all(
    moveNames.map((name) =>
      requestJSON(`${API_BASE_URL}/move/${encodeURIComponent(name)}`, signal).catch(() => null),
    ),
  )
}

// A forma original da espécie, com os golpes que as formas alternativas não
// trazem. O caminho é pelo nome da espécie que o próprio Pokémon informa: o
// número da forma (10211, por exemplo) não serve para procurar a espécie.
export async function fetchSpeciesDefault(speciesName, signal) {
  const species = await requestJSON(
    `${API_BASE_URL}/pokemon-species/${encodeURIComponent(speciesName)}`, signal,
  ).catch(() => null)
  if (!species) return null

  const padrao = species.varieties?.find(({ is_default: isDefault }) => isDefault)
  if (!padrao) return null

  return requestJSON(`${API_BASE_URL}/pokemon/${padrao.pokemon.name}`, signal).catch(() => null)
}

// Nomes de todos os Pokémon de um tipo, em uma única consulta.
export async function fetchTypeMembers(type, signal) {
  const data = await requestJSON(`${API_BASE_URL}/type/${encodeURIComponent(type)}`, signal)
  return new Set(data.pokemon.map(({ pokemon }) => pokemon.name))
}
