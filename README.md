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
| Atirar / faca (de perto) | J / Z |
| Pular | K / X / Espaço |
| Granada | L / C |

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
    Player.ts           personagem principal
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
  ui/Hud.ts             HUD estilo arcade (pontos, barra, ARMS/BOMB, cronômetro, vidas)
  input/Controls.ts     mapeamento de teclas -> ações
```

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
