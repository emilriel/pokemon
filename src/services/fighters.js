import { createFighter, pickMoveCandidates, toBattleMoves } from './battle.js'
import { fetchMoves, fetchPokemonDetails, fetchSpeciesDefault } from './pokeApi.js'

// Formas alternativas (as Gmax, as Mega, algumas regionais) vêm sem nenhum
// golpe na API. Nesse caso usamos os golpes da forma original da espécie, que
// é o que elas usariam de qualquer maneira.
async function moveNamesFor(pokemon, signal) {
  const proprios = pickMoveCandidates(pokemon)
  if (proprios.length) return proprios

  if (!pokemon.species?.name) return []

  try {
    const base = await fetchSpeciesDefault(pokemon.species.name, signal)
    return base ? pickMoveCandidates(base) : []
  } catch {
    return []
  }
}

// Monta o lutador completo a partir do Pokémon da API: atributos no nível 50,
// vida cheia e os golpes já escolhidos.
export async function buildFighter(pokemon, signal) {
  const nomes = await moveNamesFor(pokemon, signal)
  const details = nomes.length ? await fetchMoves(nomes, signal) : []
  return createFighter(pokemon, toBattleMoves(details))
}

// O mesmo, partindo só do número do Pokémon.
export async function buildFighterById(id, signal) {
  const [pokemon] = await fetchPokemonDetails([{ name: String(id) }], signal)
  return buildFighter(pokemon, signal)
}
