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
| Usar terminal de upgrade | Cima |
| Esquiva (skill Rollback) | Shift / I |

## Como funciona (Metal Slug + Dead Cells)

Cada partida é uma **run**: você atravessa as 3 missões seguidas, cada uma terminando num **chefe**.
Morreu, a run acaba e você volta ao **Laboratório** — mas os fragmentos coletados ficam.

- **Vida (HP)**: o herói aguenta alguns golpes; buracos custam 2 de vida.
- **Skills**: terminais de upgrade na fase e após cada chefe oferecem **3 skills** — escolha 1.
- **Fragmentos de dados**: caem dos robôs, destrutíveis e chefes. No Laboratório compram
  melhorias permanentes (vida, pendrives, skill inicial, auto-reparo, mais fragmentos) e liberam novas skills.
- **Fases por trechos**: cada missão é montada a cada run com trechos embaralhados da fase original,
  uma sala de upgrade e a arena do chefe. Nenhuma run é igual.

### Skills

| Skill | Efeito |
|---|---|
| CLOCK ALTO | Disparos 20% mais rápidos (acumula) |
| MAIS RAM | +2 de vida máxima |
| STACK OVERFLOW | 15% de chance de dano x3 |
| BACKUP | +4 pendrives EMP |
| TECLADO MECANICO | Golpe do MacBook x3 e com mais alcance |
| CACHE HIT | Ímã de fragmentos e +50% de valor |
| GARBAGE COLLECTOR | Robôs podem soltar kits de reparo |
| MULTITHREAD | +1 projétil por disparo |
| DEEP LINK | Tiros atravessam robôs |
| RICOCHETE* | Tiros quicam em paredes e chão |
| FIREWALL* | Escudo que bloqueia 1 golpe (recarrega) |
| KERNEL PANIC* | Solta um EMP ao ser atingido |
| SUDO JUMP* | Pulo duplo |
| FORK()* | Tiros se dividem ao acertar |
| ROLLBACK* | Esquiva invencível (SHIFT / I) |
| PENDRIVE CLUSTER* | EMP solta 3 mini-EMPs |

\* liberadas no Laboratório.

### Chefes

| Missão | Chefe | Padrões |
|---|---|---|
| 1 | **Sentinela S-01** | Mecha bípede: rajada de plasma, chuva de mísseis com alvos no chão, pisão com ondas de choque |
| 2 | **Forjador** | Fornalha-mãe: martelos no teto, metal derretido em arco, núcleo exposto (ponto fraco) |
| 3 | **O Olho** | A própria IA: laser que varre o chão, anéis de projéteis, mergulho e invocação de robôs |

Todos entram na fase 2 abaixo de 50% de vida. Partes blindadas mostram "BLOQUEADO".

## Missões

| # | Missão | Ambiente |
|---|---|---|
| 1 | **Ruínas de Neo-SP** | Metrópole em ruínas à noite: chuva, relâmpagos, neon, Torre da IA, monotrilho, carros voadores |
| 2 | **Fábrica de Sintéticos** | Galpão onde os robôs são fabricados: linha de montagem, fornalhas, esteiras, prensas |
| 3 | **Núcleo da IA** | O coração digital: o Olho gigante, torres de servidores, chuva de dados e interferências |

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
    MenuScene.ts        tela de título
    LabScene.ts         Laboratório (melhorias e skills entre runs)
    GameScene.ts        gameplay: câmera, colisões, run, chefes
  level/
    types.ts            formato de uma fase (LevelData)
    mission1..3.ts      fases fonte (bibliotecas de trechos)
    generator.ts        corta as fases em trechos e monta uma fase nova por run
    missions.ts         campanha: pontos de corte, salas de upgrade e arenas
  run/
    RunState.ts         estado da run (vida, skills, fragmentos)
    skills.ts           catálogo de skills e efeitos
    save.ts             progresso permanente (localStorage) e melhorias do Laboratório
    art.ts              escudo, fragmentos, cura, terminal de upgrade
  bosses/
    Boss.ts             base: zonas fracas/blindadas, fase 2, morte
    Sentinel.ts, Forger.ts, Eye.ts
    art.ts              arte dos chefes em peças animadas
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

As fases fonte (`src/level/mission1..3.ts`) posicionam chão (e buracos), plataformas, perigos,
destrutíveis, interativos, inimigos, emboscadas, itens e decoração por coordenadas x (o chão fica em y=226).
Em `src/level/missions.ts`, os `cuts` dizem onde cortar em trechos — escolha pontos em chão contínuo,
sem elementos atravessando o corte. Salas de upgrade e arenas são trechos declarados ali mesmo.

Em modo de desenvolvimento (`npm run dev`), as teclas **1**, **2** e **3** no menu começam uma run direto na missão.

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
