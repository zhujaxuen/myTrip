# Minha viagem à China - globo 3D interativo

> **Acesse o site:** [zhujaxuen.github.io/myTrip](https://zhujaxuen.github.io/myTrip/)

Globo 3D interativo feito com Three.js para visualizar o roteiro da viagem,
seus locais e os trajetos de avião e trem. O projeto e um site estatico: nao
usa backend nem precisa de etapa de build.

## Roteiro atual

O percurso passa por Curitiba, Sao Paulo, Istambul, Guangzhou, Beijing,
Nanjing, Yangzhou e Shanghai, com retorno ao Brasil por Istambul.

No mapa, e possivel:

- clicar nos locais da linha do tempo para destacar cada parada;
- arrastar o globo para girar manualmente e usar a roda do mouse para aproximar;
- iniciar ou parar o giro automatico pelo botao no cabecalho;
- filtrar as rotas por tipo de transporte.

## Como editar o roteiro

Tudo fica em **`data.js`**. Você não precisa mexer em mais nada.

```js
stops: [
  {
    id: "cidade",       // identificador unico, sem espacos
    name: "Nome da cidade",
    lat: 39.9042,        // latitude
    lon: 116.4074,       // longitude
    date: "12-16 out",
    tag: "Parada",
    description: "Descricao da parada",
  },
  // adicione quantos quiser
],

routes: [
  { from: "cidade", to: "outra-cidade", type: "trem" },
  // type: "voo" | "trem" | "onibus"
],
```

- Para **adicionar um novo local**: copie um bloco dentro de `stops` e troque
  os valores.
- Para **adicionar um trajeto**: adicione uma linha em `routes` com os `id`
  de origem (`from`) e destino (`to`).
- A ordem dos `stops` é a ordem que aparece na linha do tempo lateral.

## Rodar localmente

Como o site usa `import`/`export` (ES modules), nao e possivel abrir o
`index.html` diretamente no navegador (`file://`). Use um servidor local:

```bash
# Python no Windows
python -m http.server 8000

# Python no macOS/Linux
python3 -m http.server 8000

# ou Node
npx serve .
```

Depois, acesse [http://localhost:8000](http://localhost:8000).

## Publicar no GitHub Pages

1. No repositorio, abra **Settings -> Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)`. Clique em **Save**.
4. Aguarde alguns minutos para a primeira publicacao.

Neste projeto, o endereco publicado e:

[https://zhujaxuen.github.io/myTrip/](https://zhujaxuen.github.io/myTrip/)

## Estrutura dos arquivos

```
├── index.html   → estrutura da página
├── style.css    → visual (cores, tipografia, painel lateral)
├── data.js      → SEUS DADOS: locais e trajetos da viagem
├── main.js      → lógica do globo 3D (Three.js)
└── README.md    → este arquivo
```

## Personalizações rápidas

- **Cores das rotas**: em `data.js`, no objeto `ROUTE_STYLES`.
- **Giro automatico**: em `main.js`, altere `isAutoRotating` para definir o
  estado inicial ou mude `0.0009` para ajustar a velocidade.
- **Textura da Terra**: em `main.js`, as texturas sao carregadas de URLs
  publicas. Elas podem ser trocadas por imagens equiretangulares (2:1).
