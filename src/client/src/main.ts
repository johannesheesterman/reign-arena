import './style.css';
import centurionPng from '/centurion.png?url';
import sandPng from '/sand.png?url';
import { Action } from '../../shared/action';
import { GameObject, PlayerInput } from '../../shared/gameObject';
import { Application, Assets, Container, Sprite, TilingSprite } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';

const app = new Application();
const ws = new WebSocket('ws://localhost:8000');
const worldContainer = new Container();
let playerId: string | null = null;
let playerObject: GameObject | undefined = undefined;

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
    width: 320,
    height: 180,
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
    const world = action.args[0] as GameObject[];
    const ids = world.map((gameObject) => gameObject.id);
     
    // Remove items from stage that are not in the world
    worldContainer.children.forEach((child) => {
      if (!ids.includes(child.label)) {
        worldContainer.removeChild(child);
      }
    });

    // Add items to stage that are in the world
    world.forEach((gameObject) => {
      let sprite = worldContainer.getChildByName(gameObject.id) as Sprite;
      if (!sprite) {
        sprite = new Sprite(assets[gameObject.texture]);
        // sprite.filters = [new OutlineFilter({
        //   color: 0x000000,
        //   thickness: 1
        // })];
        sprite.anchor.set(0.5);
        sprite.label = gameObject.id;
        worldContainer.addChild(sprite);
      }
    });

    // Update items in the stage that are in the world
    // TODO: interpolate position and scale
    world.forEach((gameObject) => {
      const sprite = worldContainer.getChildByName(gameObject.id) as Sprite;
      sprite.x = gameObject.position.x;
      sprite.y = gameObject.position.y;
      sprite.scale.x = gameObject.scale.x 
      sprite.scale.y = gameObject.scale.y;
    });

    if (playerObject == null && playerId != null) {
      playerObject = world.find((gameObject) => gameObject.id === playerId);
    }
  }
}

function initInputListener() {
  window.addEventListener('keydown', (event) => {
    input.keys[event.key] = true;
  });
  window.addEventListener('keyup', (event) => {
    input.keys[event.key] = false;
  });
}

function initInputBroadcast() {
  setInterval(() => {
    if (playerObject == null) return;
    sendAction(new Action('input', [input]));
  }, 1000 / 30);
  
}

function sendJoinMessage(playerName: string) {
  sendAction(new Action('join', [playerName]));
}

function sendAction(action: Action) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(action));
}