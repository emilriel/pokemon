import { createFighter, pickMoveCandidates, toBattleMoves } from './battle.js'
import { fetchMoves, fetchPokemonDetails } from './pokeApi.js'

// Monta o lutador completo a partir do Pokémon da API: atributos no nível 50,
// vida cheia e os golpes já escolhidos.
export async function buildFighter(pokemon, signal) {
  const details = await fetchMoves(pickMoveCandidates(pokemon), signal)
  return createFighter(pokemon, toBattleMoves(details))
}

// O mesmo, partindo só do número do Pokémon.
export async function buildFighterById(id, signal) {
  const [pokemon] = await fetchPokemonDetails([{ name: String(id) }], signal)
  return buildFighter(pokemon, signal)
}
