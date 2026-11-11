// Gera src/data/evolution.json com a linha evolutiva de cada espécie.
//
// A PokeAPI não informa o estágio de evolução diretamente: cada espécie só diz
// de qual espécie ela evolui. Consultar as 1.025 espécies no navegador seria
// lento, então este script lê as tabelas oficiais da PokeAPI (os mesmos dados
// que alimentam a API) e salva um arquivo pequeno dentro do projeto.
//
// Uso:
//   npm run dados:evolucao              # baixa as tabelas do GitHub da PokeAPI
//   npm run dados:evolucao -- ./pasta   # usa pokemon.csv e pokemon_species.csv locais
//
// Rode de novo quando a PokeAPI receber uma geração nova.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '../src/data/evolution.json')
const MAX_STAGE = 3

async function readTable(name, localDirectory) {
  let text

  if (localDirectory) {
    text = await readFile(join(localDirectory, `${name}.csv`), 'utf8')
  } else {
    const response = await fetch(`${SOURCE_URL}/${name}.csv`)
    if (!response.ok) throw new Error(`Não foi possível baixar ${name}.csv (erro ${response.status}).`)
    text = await response.text()
  }

  const [header, ...lines] = text.trim().split(/\r?\n/)
  const columns = header.split(',')

  return lines.map((line) => {
    const values = line.split(',')
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]))
  })
}

function stageOf(speciesId, parentById) {
  let stage = 1
  let currentId = speciesId

  while (parentById.get(currentId)) {
    currentId = parentById.get(currentId)
    stage += 1
    if (stage > MAX_STAGE) throw new Error(`A espécie ${speciesId} passou de ${MAX_STAGE} estágios.`)
  }

  return stage
}

const localDirectory = process.argv[2]
const [speciesRows, pokemonRows] = await Promise.all([
  readTable('pokemon_species', localDirectory),
  readTable('pokemon', localDirectory),
])

speciesRows.sort((a, b) => Number(a.id) - Number(b.id))
speciesRows.forEach((row, index) => {
  if (Number(row.id) !== index + 1) throw new Error(`Os números das espécies têm um salto em ${row.id}.`)
})

const parentById = new Map(
  speciesRows.map((row) => [Number(row.id), Number(row.evolves_from_species_id) || 0]),
)
const speciesNameById = new Map(speciesRows.map((row) => [Number(row.id), row.identifier]))

// Cada espécie vira [nome, número da espécie anterior]; 0 significa "não evolui de ninguém".
// O número da espécie é a posição na lista + 1.
const species = speciesRows.map((row) => [row.identifier, parentById.get(Number(row.id))])

// Pokémon cujo nome na API difere do nome da espécie (formas regionais, megas etc.).
const forms = {}
for (const row of pokemonRows) {
  const speciesId = Number(row.species_id)
  if (!speciesNameById.has(speciesId)) throw new Error(`${row.identifier} aponta para uma espécie desconhecida.`)
  if (row.identifier !== speciesNameById.get(speciesId)) forms[row.identifier] = speciesId
}

const stageCounts = {}
for (const [id] of parentById) {
  const stage = stageOf(id, parentById)
  stageCounts[stage] = (stageCounts[stage] || 0) + 1
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true })
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({ source: `${SOURCE_URL}/pokemon_species.csv`, species, forms })}\n`,
)

console.log(`${species.length} espécies e ${Object.keys(forms).length} formas salvas em src/data/evolution.json`)
console.log('Espécies por estágio:', stageCounts)
