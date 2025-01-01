import './style.css';
import Config from '../../shared/config';
import Assets from './assets';
import { Action } from '../../shared/action';
import { GameObject, GameObjectType, PlayerInput } from '../../shared/gameObject';
import { Vector2 } from '../../shared/math';
import { Application, Container, ContainerChild, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { Player } from './entities/player';
import { Entity } from './entities/entity';

import { createNoise2D } from './simplex-noise';
import config from '../../shared/config';


document.addEventListener('contextmenu', event => event.preventDefault());

const app = new Application();
app.stage.eventMode = 'static';
const ws = new WebSocket(`ws://${Config.host}`);
const worldContainer = new Container();
let playerId: string | null = null;
let playerEntity: Player | undefined;
const mousePosition = new Vector2(0, 0);

const input = new PlayerInput();


(async () => {
    await initApplication();
    await loadAssets();
    await setupSocketConnection();


    // const bgSprite = new TilingSprite({
    //   texture: Assets['sand'],
    //   width: app.screen.width,
    //   height: app.screen.height,
    //   zIndex: -1
    // });
    // app.stage.addChild(bgSprite);

    generateTerrain();

    sendJoinMessage('Player 1');
    initInputListener();
    initInputBroadcast();
})();

function generateTerrain() {
  const gen = createNoise2D();
  const noise = (nx: number, ny: number) => gen(nx, ny) / 2 + 0.5;

  const sandTexture = Assets['sand'] as Texture;
  const sandPixels = app.renderer.extract.pixels(sandTexture).pixels;
  const waterTexture = Assets['water'] as Texture;
  const waterPixels = app.renderer.extract.pixels(waterTexture).pixels;
  const grassTexture = Assets['grass'] as Texture;
  const grassPixels = app.renderer.extract.pixels(grassTexture).pixels;

  let value: number[][][] = [];   
  for (let y = 0; y < config.window.height; y++) {
    value[y] = [];
    for (let x = 0; x < config.window.width; x++) {      
      let nx = x/config.window.width - 0.5, ny = y/config.window.height - 0.5;
      let e =      1 * noise(0.7 * nx, 0.7 * ny);
                +  0.5 * noise(2 * nx, 2 * ny);
                +  0.25 * noise(4 * nx, 4 * ny);
                
      e = e / (1 + 0.5 + 0.25);
      e = Math.pow(e, 1.5);

      if (e > 0.1) {
        const i = (y%grassTexture.width * grassTexture.width + x%grassTexture.width) * 4;
        const r = grassPixels[i];
        const g = grassPixels[i + 1];
        const b = grassPixels[i + 2];
        const a = grassPixels[i + 3];
        value[y][x] = [r, g, b, a];
      }
      else if (e > 0.07) {
        const i = (y%sandTexture.width * sandTexture.width + x%sandTexture.width) * 4;
        const r = sandPixels[i];
        const g = sandPixels[i + 1];
        const b = sandPixels[i + 2];
        const a = sandPixels[i + 3];
        value[y][x] = [r, g, b, a];
      } 
      else {
        const i = (y%waterTexture.width * waterTexture.width + x%waterTexture.width) * 4;
        const r = waterPixels[i];
        const g = waterPixels[i + 1];
        const b = waterPixels[i + 2];
        const a = waterPixels[i + 3];
        value[y][x] = [r, g, b, a];
      }

      //value[y][x] = [e * 255, e * 255, e * 255, 255];
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = config.window.width;
  canvas.height = config.window.height;
  const ctx = canvas.getContext('2d');
  if (ctx == null) return;
  const imageData = ctx.createImageData(config.window.width, config.window.height);

  for (let y = 0; y < config.window.height; y++) {
    for (let x = 0; x < config.window.width; x++) {
      const i = (y * config.window.width + x) * 4;
      imageData.data[i] = value[y][x][0];
      imageData.data[i + 1] = value[y][x][1];
      imageData.data[i + 2] = value[y][x][2];
      imageData.data[i + 3] = value[y][x][3];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = Texture.from(canvas);
  const sprite = new Sprite(texture);
  sprite.zIndex = -1;
  app.stage.addChild(sprite);
}


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

function updateWorldState(nextWorldState: GameObject[]) {
  const ids = nextWorldState.map((gameObject) => gameObject.id);

  // Remove items from stage that are not in the world
  worldContainer.children.forEach((child) => {
    if (!ids.includes(child.label)) {
      worldContainer.removeChild(child);
    }
  });

  // Add items to stage that are in the world
  nextWorldState.forEach((gameObject) => {
    let entity = worldContainer.getChildByName(gameObject.id) as Container;    
    if (entity) return;
    
    if (gameObject.type == GameObjectType.Player) {
      entity = new Player(gameObject);
      if (gameObject.id == playerId) {
        playerEntity = entity as Player;
      }
    } else {
      entity = new Entity(gameObject);
    }    

    worldContainer.addChild(entity);
  });

  // Update items in the stage that are in the world
  // TODO: interpolate position and scale
  nextWorldState.forEach((gameObject) => {
    const entity = worldContainer.getChildByName(gameObject.id) as Entity;
    entity.setNextState(gameObject);   
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

