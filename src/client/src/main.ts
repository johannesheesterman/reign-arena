import './style.css';
import Config from '../../shared/config';
import centurionPng from '/centurion.png?url';
import sandPng from '/sand.png?url';
import swordPng from '/sword.png?url';
import bowPng from '/bow.png?url';
import swordProjectilePng from '/sword-projectile.png?url';
import arrowPng from '/arrow.png?url';
import cratePng from '/crate.png?url';
import chestPng from '/chest.png?url';
import { Action } from '../../shared/action';
import { GameObject, PlayerInput } from '../../shared/gameObject';
import { Vector2 } from '../../shared/math';
import { Application, Assets, Container, ContainerChild, Graphics, Sprite, TilingSprite } from 'pixi.js';


const app = new Application();
app.stage.eventMode = 'static';
const ws = new WebSocket(`ws://${Config.host}`);
const worldContainer = new Container();
let playerId: string | null = null;
let playerEntity: Container | undefined = undefined;
const mousePosition = new Vector2(0, 0);

const assets: { [key: string]: any } = {};
const input = new PlayerInput();


(async () => {
    await initApplication();
    await loadAssets();
    await setupSocketConnection();
    const bgSprite = new TilingSprite({
      texture: assets['sand'],
      width: app.screen.width,
      height: app.screen.height,
      zIndex: -1
    });
    app.stage.addChild(bgSprite);
    sendJoinMessage('Player 1');
    initInputListener();
    initInputBroadcast();
})();

async function initApplication() {
  await app.init({
    background: '#323232',
    width: Config.window.width,
    height: Config.window.height,
    roundPixels: true,
    resolution: 1
  });



  app.stage.addChild(worldContainer);
  app.renderer.view.autoDensity = true;
  document.body.appendChild(app.canvas);
  scaleToWindow();
  window.addEventListener('resize', () => scaleToWindow());

}

function scaleToWindow() {
  const canvas = app.canvas;
  let scaleX, scaleY, scale, center;
  scaleX = window.innerWidth / canvas.offsetWidth;
  scaleY = window.innerHeight / canvas.offsetHeight;
  scale = Math.min(scaleX, scaleY);
  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = "scale(" + scale + ")";
  if (canvas.offsetWidth > canvas.offsetHeight) {
  if (canvas.offsetWidth * scale < window.innerWidth) { center = "horizontally" }
  else { center = "vertically" };
  } else {
  if (canvas.offsetHeight * scale < window.innerHeight) { center = "vertically" }
  else { center = "horizontally"; };
  };
  let margin;
  if (center === "horizontally") {
      margin = (window.innerWidth - canvas.offsetWidth * scale) / 2;
      canvas.style .marginTop = 0 + "px";canvas.style .marginBottom = 0 + "px";
      canvas.style .marginLeft = margin + "px";canvas.style .marginRight = margin + "px";
  };
  if (center === "vertically") {
      margin = (window.innerHeight - canvas.offsetHeight * scale) / 2;
      canvas.style .marginTop  = margin + "px";canvas.style .marginBottom = margin + "px";
      canvas.style .marginLeft = 0      + "px";canvas.style .marginRight  = 0      + "px";
  };
  canvas.style.paddingLeft = 0 + "px";canvas.style.paddingRight  = 0 + "px";
  canvas.style.paddingTop  = 0 + "px";canvas.style.paddingBottom = 0 + "px";
  canvas.style.display = "-webkit-inline-box";
  return scale;
}; 

async function loadAssets() {
  assets['centurion'] = await Assets.load(centurionPng);
  assets['sand'] = await Assets.load(sandPng);
  assets['sword'] = await Assets.load(swordPng);
  assets['sword-projectile'] = await Assets.load(swordProjectilePng);
  assets['arrow'] = await Assets.load(arrowPng);
  assets['bow'] = await Assets.load(bowPng);
  assets['crate'] = await Assets.load(cratePng);
  assets['chest'] = await Assets.load(chestPng);
}

function setupSocketConnection(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ws.onopen = () => {
      console.log('connected');
      resolve();
    };
    ws.onmessage = (event) => {
      const action = JSON.parse(event.data) as Action;
      handleAction(action);
    };
    ws.onclose = () => {
      console.log('disconnected');
    };
    ws.onerror = (error) => {
      console.log(error);
      reject();
    }
  });
}

function handleAction(action: Action) {
  if (action.type === 'join') {
    playerId = action.args[0] as string;
    console.log('playerId', playerId);  
  }
  else if (action.type === 'update') {
    updateWorldState(action.args[0] as GameObject[]);
  }
}

function updateWorldState(world: GameObject[]) {
  const ids = world.map((gameObject) => gameObject.id);

  // Remove items from stage that are not in the world
  worldContainer.children.forEach((child) => {
    if (!ids.includes(child.label)) {
      worldContainer.removeChild(child);
    }
  });

  // Add items to stage that are in the world
  world.forEach((gameObject) => {
    let entity = worldContainer.getChildByName(gameObject.id) as Container;
    
    if (!entity) {
      entity = new Container();
      entity.label = gameObject.id;

      const sprite = new Sprite(assets[gameObject.texture]);
      sprite.anchor.set(0.5);
      entity.addChild(sprite);

      if (gameObject.health != undefined && gameObject.maxHealth != undefined) {
        const healthBarBackground = new Graphics()
          .rect(-11, -16, 22, 5)
          .fill(0x000000)
          .rect(-10, -15, 20, 3)
          .fill(0xff0000);
          entity.addChild(healthBarBackground);

        const healthBar = new Graphics()
          .rect(-10, -15, 20, 3)
          .fill(0x00ff00);
          entity.addChild(healthBar);
      }

      worldContainer.addChild(entity);
      if (gameObject.id === playerId) { playerEntity = entity; }
    }
  });

  // Update items in the stage that are in the world
  // TODO: interpolate position and scale
  world.forEach((gameObject) => {
    const entity = worldContainer.getChildByName(gameObject.id) as Container;

    entity.x = gameObject.position.x;
    entity.y = gameObject.position.y;
    entity.zIndex = gameObject.position.z;

    const sprite = entity.children[0] as Sprite;
    sprite.texture = assets[gameObject.texture];
    sprite.scale.x = gameObject.scale.x;
    sprite.scale.y = gameObject.scale.y;
    entity.rotation = gameObject.rotation;

    if (gameObject.health != undefined && gameObject.maxHealth != undefined) {
      const healthBar = entity.children[2] as Graphics;
      healthBar
        .clear()
        .rect(-10, -15,  20 * (gameObject.health / gameObject.maxHealth), 3)
        .fill(0x00ff00);
    }
  });
}

function initInputListener() {
  window.addEventListener('keydown', (event) => {
    input.keys[event.key] = true;
  });
  window.addEventListener('keyup', (event) => {
    input.keys[event.key] = false;
  });

  window.addEventListener('mousedown', (event) => {
    input.keys['mouse0'] = true;
  });
  window.addEventListener('mouseup', (event) => {
    input.keys['mouse0'] = false;
  });

  app.stage.on('mousemove', (event) => {
    mousePosition.x = event.global.x;
    mousePosition.y = event.global.y;
    updatePlayerRotationInput();
  });
}

function initInputBroadcast() {
  setInterval(() => {
    if (playerEntity == undefined) return;
    updatePlayerRotationInput();
    sendAction(new Action('input', [input]));
  }, 1000 / 30);
  
}

function updatePlayerRotationInput() {
  if (playerEntity == undefined) return;
  const dx = mousePosition.x - playerEntity.position.x;
  const dy = mousePosition.y - playerEntity.position.y;
  input.rotation = Math.atan2(dy, dx);
}

function sendJoinMessage(playerName: string) {
  sendAction(new Action('join', [playerName]));
}

function sendAction(action: Action) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(action));
}