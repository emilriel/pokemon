import data from '../data/evolution.json'

// Os dados vêm de scripts/generate-evolution-data.mjs. O estágio segue o critério
// da PokeAPI: quem não evolui de ninguém é o 1º estágio (Pichu), quem evolui de
// um 1º estágio é o 2º (Pikachu), e assim por diante.

const species = data.species.map(([name, parentId], index) => ({
  id: index + 1,
  name,
  parentId,
  children: [],
  stage: 1,
}))

for (const item of species) {
  if (item.parentId) species[item.parentId - 1].children.push(item)
}

for (const item of species) {
  let current = item
  while (current.parentId) {
    current = species[current.parentId - 1]
    item.stage += 1
  }
}

const speciesByName = new Map(species.map((item) => [item.name, item]))

function findSpecies(pokemonName) {
  const formSpeciesId = data.forms[pokemonName]
  return formSpeciesId ? species[formSpeciesId - 1] : speciesByName.get(pokemonName) || null
}

// 'stage-1' | 'stage-2' | 'stage-3' | 'none' (não evolui) | null (sem dados)
export function getEvolutionCategory(pokemonName) {
  const item = findSpecies(pokemonName)
  if (!item) return null
  if (!item.parentId && !item.children.length) return 'none'
  return `stage-${item.stage}`
}

// Devolve a família inteira agrupada por estágio, para exibir na ficha.
export function getEvolutionFamily(pokemonName) {
  const current = findSpecies(pokemonName)
  if (!current) return null

  let root = current
  while (root.parentId) root = species[root.parentId - 1]

  const stages = []
  let members = [root]
  while (members.length) {
    stages.push(members)
    members = members.flatMap((member) => member.children)
  }

  return { current, stages }
}
