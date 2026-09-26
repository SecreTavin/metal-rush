# Metal Rush

Jogo run-and-gun 2D no estilo Metal Slug, feito com **Phaser 3 + TypeScript + Vite** e publicado no **Cloudflare**.

**Jogar agora:** https://metal-rush.metal-rush.workers.dev

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

## Missões

| # | Missão | Ambiente |
|---|---|---|
| 1 | **Ruínas de Neo-SP** | Metrópole em ruínas à noite: chuva, relâmpagos, neon, Torre da IA, monotrilho, carros voadores, holofotes e drones |
| 2 | **Fábrica de Sintéticos** | Galpão onde os robôs são fabricados: linha de montagem, fornalhas, engrenagens, ponte rolante, solda e metal derretido |
| 3 | **Núcleo da IA** | O coração digital: o Olho gigante que segue o jogador, torres de servidores, chuva de dados e interferências |

Ao terminar uma missão, ENTER leva à próxima (pontos e vidas continuam). No menu, as teclas **1**, **2** e **3** escolhem a missão.

### Elementos dinâmicos das fases

- **Plataformas**: móveis (elevadores, carga suspensa), que desabam ao pisar e de luz sólida que aparecem e somem
- **Perigos**: esteiras que empurram, prensas hidráulicas, grades de laser, cabos energizados em poças, respiros de vapor que lançam o jogador
- **Destrutíveis**: barris explosivos, carros, geradores e nós de dados — as explosões ferem robôs e detonam objetos próximos (reação em cadeia)
- **Interativos**: câmeras que seguem o jogador, painéis holográficos que falham ao levar tiro, postes e letreiros de neon que quebram, sirenes de alarme
- **Emboscadas**: a câmera trava, soa o alarme e robôs chegam por teletransporte em ondas; ao limpar, aparece "GO"

## Estrutura

```
src/
  config.ts             constantes (resolução, gravidade, chão)
  main.ts               configuração do Phaser
  scenes/
    BootScene.ts        carrega sprites, gera texturas e animações
    MenuScene.ts        tela de título e escolha de missão
    GameScene.ts        gameplay: câmera, colisões, progressão entre missões
  level/
    types.ts            formato de uma fase (LevelData)
    mission1..3.ts      layout de cada missão
    missions.ts         ordem da campanha
  themes/
    Theme.ts            interface de tema, camadas de parallax, profundidades
    city.ts             Missão 1: cidade (arte, fundo animado, chuva)
    factory.ts          Missão 2: fábrica
    core.ts             Missão 3: núcleo da IA
    draw.ts             desenho compartilhado (janelas, neon, cabos, grafite)
  world/
    World.ts            elementos dinâmicos e interativos das fases
    art.ts              arte desses elementos (barril, câmera, laser, prensa...)
  entities/
    Player.ts           personagem principal (corpo + MacBook giratório + aura)
    Enemy.ts            IA dos robôs (atirador e garras), brilho dos olhos, destruição
    enemyTypes.ts       catálogo de inimigos
    weapons.ts          catálogo de armas
  gfx/
    effects.ts          explosão, clarão, faíscas, poeira, textos
    art/                kit de pixel-art procedural + efeitos do herói/robôs + HUD
  ui/Hud.ts             HUD estilo arcade
  input/Controls.ts     mapeamento de teclas -> ações
```

### Criando ou editando uma fase

Cada missão é um objeto `LevelData` em `src/level/`. Nele você posiciona chão (e buracos),
plataformas, plataformas móveis, perigos, destrutíveis, interativos, inimigos, emboscadas,
itens e decoração — tudo por coordenadas x (e y quando necessário; o chão fica em y=226).
O visual vem do tema indicado em `theme`.

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

### Inimigos: robôs-esqueleto corrompidos

Endoesqueletos cromados humanoides (crânio metálico com olhos vermelhos, costelas vazadas com um
núcleo vermelho, coluna segmentada, pistões nas pernas), corrompidos por um vírus (manchas vermelhas,
surtos de interferência). Ao serem destruídos, desmontam: o crânio e as peças voam e o corpo desaba.

| Tipo | Comportamento |
|---|---|
| **Exterminador** (`exterminator`) | Anda devagar, mantém distância e dispara plasma com o rifle |
| **Rastreador** (`hunter`) | Corre curvado até o jogador e ataca com as garras |

Os sprites são gerados por um "rig" de ossos a partir do esboço em `tools/enemy/reference_east.png`:

```bash
python3 tools/enemy/build_enemy.py
```

Poses, proporções e novas variantes ficam nesse script; os atributos (vida, velocidade, alcance) em
`src/entities/enemyTypes.ts`.

### Visual

Toda a arte de cenário é **original e gerada por código** ao iniciar cada missão: o cenário é
desenhado com formas e gradientes e depois reduzido a uma paleta limitada com dithering, o que dá
o aspecto de pixel-art de arcade. Os temas ficam em `src/themes/`.

O cronômetro no topo desce 1 unidade a cada 1,5 s; ao zerar, o jogador perde uma vida (como no arcade).

### Adicionando um inimigo

1. Crie a entrada em `src/entities/enemyTypes.ts` (textura, vida, velocidade, comportamento).
2. Gere o spritesheet (40x56, mesma ordem de quadros) e carregue-o no `BootScene`.
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
