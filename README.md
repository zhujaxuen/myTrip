# 🌏 Minha viagem à China — globo 3D interativo

Site estático com um globo 3D (Three.js) mostrando os locais da viagem e as
rotas de avião/trem/ônibus entre eles. Sem build, sem backend — abre direto
no navegador e sobe no GitHub Pages.

## Como editar o roteiro

Tudo fica em **`data.js`**. Você não precisa mexer em mais nada.

```js
stops: [
  {
    id: "pequim",          // identificador único, sem espaços
    name: "Pequim",
    lat: 39.9042,           // latitude (pesquise "cidade lat long" no Google)
    lon: 116.4074,          // longitude
    date: "12–16 mar",
    tag: "Chegada",
    description: "Cidade Proibida, Muralha da China...",
  },
  // adicione quantos quiser
],

routes: [
  { from: "pequim", to: "xian", type: "trem" }, // type: "voo" | "trem" | "onibus"
],
```

- Para **adicionar um novo local**: copie um bloco dentro de `stops` e troque
  os valores.
- Para **adicionar um trajeto**: adicione uma linha em `routes` com os `id`
  de origem (`from`) e destino (`to`).
- A ordem dos `stops` é a ordem que aparece na linha do tempo lateral.

## Rodar localmente

Como o site usa `import`/`export` (ES modules), não dá pra abrir o
`index.html` direto no navegador (`file://`) — precisa de um servidor local
simples:

```bash
# Python
python3 -m http.server 8000

# ou Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub e suba estes arquivos (`index.html`,
   `style.css`, `main.js`, `data.js`, `README.md`).
2. No repositório, vá em **Settings → Pages**.
3. Em "Build and deployment", escolha **Deploy from a branch**.
4. Selecione a branch `main` e a pasta `/ (root)`. Salve.
5. Em alguns minutos o site estará em
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Esse é o link que você pode mandar para os amigos.

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
- **Velocidade de rotação do globo**: em `main.js`, procure
  `globeGroup.rotation.y += 0.0009` e mude o valor.
- **Textura da Terra**: em `main.js`, a constante `earthTexture` carrega uma
  imagem de satélite pública. Pode trocar por outra URL de imagem
  equirretangular (2:1) se quiser outro estilo de mapa.
