# Pokemon

Ponto de partida para uma aplicacao React com Vite e Tailwind CSS. O objetivo do projeto e evoluir para uma experiencia acessivel e facil de usar que consulte a [PokeAPI](https://pokeapi.co/).

> Estado atual: scaffold inicial. A aplicacao mostra somente "Hello, world!"; nenhuma requisicao a API foi implementada ainda.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Executar localmente

```bash
npm install
npm run dev
```

O Vite informa no terminal o endereco local. Para validar a versao de producao:

```bash
npm run build
npm run preview
```

## Tecnologias

- React para a interface.
- Vite para desenvolvimento e build.
- Tailwind CSS para os estilos.
- PokeAPI como fonte de dados planejada: https://pokeapi.co/

## Acessibilidade e usabilidade

A acessibilidade e a usabilidade sao requisitos do produto, nao uma etapa final. As futuras telas devem considerar WCAG 2.2 nivel AA e as heuristicas de usabilidade de Jakob Nielsen:

1. **Visibilidade do estado do sistema:** informar carregamento, resultados e falhas das consultas.
2. **Correspondencia com o mundo real:** usar nomes, termos e organizacao reconheciveis por quem consulta Pokemon.
3. **Controle e liberdade:** permitir voltar, limpar filtros e recuperar-se de acoes sem surpresa.
4. **Consistencia e padroes:** manter convencoes, componentes e rotulos coerentes.
5. **Prevencao de erros:** validar entradas e deixar filtros e acoes claros antes de executa-los.
6. **Reconhecimento em vez de memorizacao:** manter opcoes e contexto visiveis.
7. **Flexibilidade e eficiencia:** oferecer busca e filtros praticos sem dificultar o uso inicial.
8. **Design estetico e minimalista:** priorizar conteudo relevante e evitar ruido visual.
9. **Ajuda para reconhecer, diagnosticar e recuperar-se de erros:** explicar o problema em linguagem simples e indicar o proximo passo.
10. **Ajuda e documentacao:** disponibilizar orientacoes curtas e proximas da tarefa quando necessario.

### Criterios para as interfaces

- Usar HTML semantico, hierarquia de titulos e rotulos associados aos campos.
- Garantir operacao por teclado, foco visivel e ordem de navegacao logica.
- Verificar contraste, ampliacao/reflow e uso com leitores de tela; nao depender apenas de cor para transmitir informacao.
- Anunciar estados dinamicos de carregamento e erro de forma acessivel, sem mover o foco inesperadamente.
- Fornecer texto alternativo util para imagens informativas e respeitar `prefers-reduced-motion`.
- Testar fluxos essenciais com teclado e tecnologias assistivas, alem de testes automatizados.

## Estrutura inicial

```text
src/
	App.jsx       # Tela inicial
	index.css     # Entrada do Tailwind CSS
	main.jsx      # Montagem da aplicacao React
index.html
vite.config.js
```

## Proximos passos

1. Definir quais informacoes Pokemon a primeira tela apresentara.
2. Implementar consulta a PokeAPI com estados de carregamento, vazio e erro.
3. Criar uma interface responsiva e acessivel, validando-a com usuarios e testes.