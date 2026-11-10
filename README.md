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
# Pokédex

Pokédex modular construída com React, Vite e Tailwind CSS, usando a [PokeAPI](https://pokeapi.co/) como fonte de dados. O projeto será desenvolvido em módulos; o Módulo 1 entrega o catálogo básico e servirá de base para as próximas etapas.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Executar localmente

```bash
npm install
npm run dev
```

O Vite informa no terminal o endereço local. Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Módulo 1

- Lista Pokémon em cartões com ilustrações e tipos.
- Pesquisa por nome em todo o catálogo.
- Exibe detalhes, medidas e atributos base em uma janela acessível.
- Carrega os resultados em lotes com o botão “Carregar mais”.
- Apresenta estados de carregamento, erro e resultado vazio.

O módulo aplica componentes, props, `useState`, `useEffect`, `fetch` e renderização de listas. A busca filtra os nomes do catálogo carregado e solicita à API os detalhes dos resultados; a paginação carrega detalhes em lotes de 24.

## Tecnologias

- React para a interface.
- Vite para desenvolvimento e build.
- Tailwind CSS para os estilos.
- PokeAPI como fonte de dados: https://pokeapi.co/

## Acessibilidade e usabilidade

A acessibilidade e a usabilidade são requisitos do produto, não uma etapa final. As interfaces consideram WCAG 2.2 nível AA e as heurísticas de usabilidade de Jakob Nielsen:

1. **Visibilidade do estado do sistema:** informar carregamento, resultados e falhas das consultas.
2. **Correspondência com o mundo real:** usar nomes e termos reconhecíveis por quem consulta Pokémon.
3. **Controle e liberdade:** permitir limpar a busca e fechar os detalhes sem surpresa.
4. **Consistência e padrões:** manter convenções, componentes e rótulos coerentes.
5. **Prevenção de erros:** deixar entradas e ações claras antes de executá-las.
6. **Reconhecimento em vez de memorização:** manter opções e contexto visíveis.
7. **Flexibilidade e eficiência:** oferecer busca e carregamento progressivo.
8. **Design estético e minimalista:** priorizar conteúdo relevante e evitar ruído visual.
9. **Ajuda para reconhecer, diagnosticar e recuperar-se de erros:** explicar falhas e oferecer nova tentativa.
10. **Ajuda e documentação:** disponibilizar orientações próximas da tarefa quando necessário.

### Critérios para as interfaces

- Usar HTML semântico, hierarquia de títulos e rótulos associados aos campos.
- Garantir operação por teclado, foco visível e ordem de navegação lógica.
- Verificar contraste e uso com leitores de tela; não depender apenas de cor para transmitir informação.
- Anunciar estados dinâmicos de carregamento e erro de forma acessível.
- Fornecer texto alternativo para imagens e respeitar `prefers-reduced-motion`.
- Testar fluxos essenciais com teclado e tecnologias assistivas, além de testes automatizados.

## Estrutura

```text
src/
	components/   # Cartões, grade e detalhes do Pokémon
	hooks/        # Estado e efeitos do catálogo
	services/     # Comunicação com a PokeAPI
	App.jsx       # Composição da tela do catálogo
	index.css     # Tailwind CSS e estilos responsivos
	main.jsx      # Montagem da aplicação React
index.html
vite.config.js
```

## Próximos módulos

As próximas funcionalidades serão definidas incrementalmente, preservando a modularidade e os critérios de acessibilidade e usabilidade estabelecidos para o projeto.