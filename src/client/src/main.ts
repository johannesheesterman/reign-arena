import './style.css';
import Config from '../../shared/config';
import Assets from './assets';
import { Action } from '../../shared/action';
import { GameObject, GameObjectType, PlayerInput } from '../../shared/gameObject';
import { Vector2 } from '../../shared/math';
import { Application, Container, ContainerChild, Graphics, Sprite, TilingSprite } from 'pixi.js';
import { Player } from './entities/player';
import { Entity } from './entities/entity';


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
    const bgSprite = new TilingSprite({
      texture: Assets['sand'],
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
  world.forEach((gameObject) => {
    const entity = worldContainer.getChildByName(gameObject.id) as Entity;
    entity.update(gameObject);   
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

