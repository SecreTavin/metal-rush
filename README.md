# Metal Rush

Jogo run-and-gun 2D no estilo Metal Slug, feito com **Phaser 3 + TypeScript + Vite** e publicado no **Cloudflare**.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Use `?debug` na URL para ver as caixas de colisão.

## Controles

| Ação | Teclas |
|---|---|
| Mover | Setas / WASD |
| Mirar | Cima (e Baixo no ar) |
| Atirar / golpe com o MacBook (de perto) | J / Z |
| Pular | K / X / Espaço |
| Pendrive EMP (granada) | L / C |

## Estrutura

```
src/
  config.ts             constantes (resolução, gravidade, chão)
  main.ts               configuração do Phaser
  scenes/
    BootScene.ts        gera texturas e animações
    MenuScene.ts        tela de título
    GameScene.ts        gameplay: fase, câmera, colisões, HUD
  entities/
    Player.ts           personagem principal (corpo + MacBook giratório + aura)
    Enemy.ts            IA dos inimigos
    enemyTypes.ts       catálogo de inimigos (stats e comportamento)
    weapons.ts          catálogo de armas
  level/level1.ts       layout da fase: chão, coberturas, plataformas, inimigos, itens, decoração
  gfx/
    textures.ts         personagens e armas (placeholders) + chama os geradores de arte
    effects.ts          explosão, clarão do tiro, faíscas, poeira, textos
    art/
      kit.ts            pixel-art procedural: quantização em paleta com dithering
      palettes.ts       paletas por camada (névoa ao fundo, cores quentes na frente)
      primitives.ts     folhagem, cipós, blocos de pedra, colunas, troncos, cabeça esculpida
      scenery.ts        camadas de parallax (céu, selva distante, plano médio, ruínas)
      props.ts          chão, buracos, plataformas, coberturas, decoração, primeiro plano
      fx.ts             sprites de efeitos e peças do HUD
      heroFx.ts         efeitos do herói: projéteis de código, bits, EMP, aura, teletransporte
  ui/Hud.ts             HUD estilo arcade (pontos, barra, ARMS/BOMB, cronômetro, vidas)
  input/Controls.ts     mapeamento de teclas -> ações
```

### Personagem principal

Dev de moletom roxo com capuz, óculos inteligentes e um **MacBook como arma**, com toques cibernéticos
(circuitos brilhantes no moletom, aura holográfica, anel de hover nos pés, varredura e rastro de luz).

- **CODE BOLT** (padrão): o MacBook dispara projéteis `</>`; no lugar de cápsulas, saltam bits "0/1" do teclado.
- **OVERCLOCK** (caixa "H"): rajada rápida de projéteis `>>` magenta; a aura muda de cor.
- **Golpe**: inimigo colado leva uma pancada com o MacBook.
- **Pendrive EMP**: a granada é um pendrive que explode num pulso eletromagnético.
- Ao ser atingido, o personagem "glitcha"; ao voltar, é teletransportado por um feixe de luz.

O sprite nasce do esboço em `tools/hero/reference_east.png`. Para regenerar após mudanças:

```bash
pip install pillow
python3 tools/hero/build_hero.py
```

O script recolore o moletom, separa o MacBook (que vira uma peça giratória para mirar), desenha as
pernas de cada quadro de animação e adiciona os circuitos. Saída em `public/sprites/`.

### Visual

Toda a arte é **original e gerada por código** ao abrir o jogo (~200 ms): o cenário é desenhado com
formas e gradientes e depois reduzido a uma paleta limitada com dithering, o que dá o aspecto de
pixel-art de arcade. Para mudar a cena de uma fase, ajuste `decor`, `blocks`, `platforms` e
`foreground` em `src/level/level1.ts`, ou a semente/paletas em `src/gfx/art/`.

O cronômetro no topo desce 1 unidade a cada 1,5 s; ao zerar, o jogador perde uma vida (como no arcade).

### Adicionando um inimigo

1. Crie a entrada em `src/entities/enemyTypes.ts` (textura, vida, velocidade, comportamento).
2. Gere a textura em `src/gfx/textures.ts` (lista `CHARACTERS`) ou carregue um spritesheet no `BootScene`.
3. Posicione na fase em `src/level/level1.ts` (`spawns`).

## Deploy no Cloudflare

Manual:

```bash
npx wrangler login
npm run deploy
```

Automático (GitHub Actions, a cada push na `main`): em *Settings → Secrets and variables → Actions* do repositório, crie os secrets
`CLOUDFLARE_API_TOKEN` (token com permissão *Workers Scripts: Edit*) e `CLOUDFLARE_ACCOUNT_ID`.
Sem esses secrets, o workflow apenas compila o projeto.
