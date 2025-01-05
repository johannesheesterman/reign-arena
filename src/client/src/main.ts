import './style.css';
import Config from '../../shared/config';
import Assets from './assets';
import { Action } from '../../shared/action';
import { GameObject, GameObjectType, PlayerInput } from '../../shared/gameObject';
import { Terrain } from '../../shared/terrain';
import { Vector2 } from '../../shared/math';
import { Application, applyMatrix, Container, ContainerChild, Graphics, Sprite, Texture, Ticker, TilingSprite } from 'pixi.js';
import { Player } from './entities/player';
import { Entity } from './entities/entity';

import config from '../../shared/config';


document.addEventListener('contextmenu', event => event.preventDefault());

const worldWidth = config.window.width * config.worldScale;
const worldHeight = config.window.height * config.worldScale;
const app = new Application();
const ticker = Ticker.shared;
ticker.autoStart = true;
app.stage.eventMode = 'static';
const ws = new WebSocket(`ws://${Config.host}`);
const worldContainer = new Container();
let playerId: string | null = null;
let playerEntity: Player | undefined;
const mousePosition = new Vector2(0, 0);
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.width = worldWidth;
backgroundCanvas.height = worldHeight;
const backgroundCtx = backgroundCanvas.getContext('2d');

const texture = Texture.from(backgroundCanvas);
const sprite = new Sprite(texture);
sprite.zIndex = -1;
app.stage.addChild(sprite);

let sandTexture: Texture;
let waterTexture: Texture;
let grassTexture: Texture;
let sandPixels: Uint8ClampedArray;
let waterPixels: Uint8ClampedArray;
let grassPixels: Uint8ClampedArray;

const input = new PlayerInput();


(async () => {
    await initApplication();

    sandTexture = Assets['sand'] as Texture;
    sandPixels = app.renderer.extract.pixels(sandTexture).pixels;
    waterTexture = Assets['water'] as Texture;
    waterPixels = app.renderer.extract.pixels(waterTexture).pixels;
    grassTexture = Assets['grass'] as Texture;
    grassPixels = app.renderer.extract.pixels(grassTexture).pixels;


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

  const terrain = new Terrain(123);
  
  const imageData = backgroundCtx!.createImageData(worldWidth, worldHeight);

  for (let y = -(worldHeight / 2); y < (worldHeight / 2); y++) {
    for (let x = -(worldWidth / 2); x < (worldWidth / 2); x++) {      
  
      const e = terrain.e(x, y);
      const ny = y + worldHeight / 2;
      const nx = x + worldWidth / 2;
  
      if (e > 0.8) { // grass
        const i = ((ny % grassTexture.height) * grassTexture.width + (nx % grassTexture.width)) * 4;
        const r = grassPixels[i];
        const g = grassPixels[i + 1];
        const b = grassPixels[i + 2];
        const a = grassPixels[i + 3];
  
        imageData.data[(ny * worldWidth + nx) * 4] = r;
        imageData.data[(ny * worldWidth + nx) * 4 + 1] = g;
        imageData.data[(ny * worldWidth + nx) * 4 + 2] = b;
        imageData.data[(ny * worldWidth + nx) * 4 + 3] = a;
      }
      else if (e > 0.75) { // sand
        const i = ((ny % sandTexture.height) * sandTexture.width + (nx % sandTexture.width)) * 4;
        const r = sandPixels[i];
        const g = sandPixels[i + 1];
        const b = sandPixels[i + 2];
        const a = sandPixels[i + 3];
  
        imageData.data[(ny * worldWidth + nx) * 4] = r;
        imageData.data[(ny * worldWidth + nx) * 4 + 1] = g;
        imageData.data[(ny * worldWidth + nx) * 4 + 2] = b;
        imageData.data[(ny * worldWidth + nx) * 4 + 3] = a;
      } 
      else { // water
        const i = ((ny % waterTexture.height) * waterTexture.width + (nx % waterTexture.width)) * 4;
        const r = waterPixels[i];
        const g = waterPixels[i + 1];
        const b = waterPixels[i + 2];
        const a = waterPixels[i + 3];
  
        imageData.data[(ny * worldWidth + nx) * 4] = r;
        imageData.data[(ny * worldWidth + nx) * 4 + 1] = g;
        imageData.data[(ny * worldWidth + nx) * 4 + 2] = b;
        imageData.data[(ny * worldWidth + nx) * 4 + 3] = a;
      }
    }
  }

  backgroundCtx!.putImageData(imageData, 0, 0);
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

function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

async function loadAssets() {
  
}

function setupSocketConnection(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.log('connecting');
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

    if (ws.readyState === ws.OPEN) {
      console.log('already connected');
      resolve();
      return;
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


  if (playerEntity != undefined) {
    app.stage.pivot.set(
      playerEntity.position.x - config.window.width/2, 
      playerEntity.position.y - config.window.height/2
    ); 
  }
  
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
  const dx = mousePosition.x + app.stage.pivot.x - playerEntity.position.x;
  const dy = mousePosition.y + app.stage.pivot.y - playerEntity.position.y;
  input.rotation = Math.atan2(dy, dx);
}

function sendJoinMessage(playerName: string) {
  sendAction(new Action('join', [playerName]));
}

function sendAction(action: Action) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(action));
}

