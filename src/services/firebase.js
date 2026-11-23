import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Configuração do projeto "pokedex-batalha" no Firebase.
//
// Estes valores NÃO são senha: todo site que usa o Firebase os entrega ao
// navegador, e qualquer pessoa consegue lê-los no código da página. Quem
// protege o banco são as regras de segurança, no console do Firebase, em
// Realtime Database > Regras. As regras que este projeto usa estão em
// firebase-rules.json, na raiz do repositório.
const firebaseConfig = {
  apiKey: 'AIzaSyB56RA3sITYk_FkSyhJr3KSDqN-uAzMPe4',
  authDomain: 'pokedex-batalha.firebaseapp.com',
  databaseURL: 'https://pokedex-batalha-default-rtdb.firebaseio.com',
  projectId: 'pokedex-batalha',
  storageBucket: 'pokedex-batalha.firebasestorage.app',
  messagingSenderId: '668332873130',
  appId: '1:668332873130:web:0ba851b83b2586463047d3',
}

export const database = getDatabase(initializeApp(firebaseConfig))
