import './style.css';
import Config from '../../server/shared/config';
import Assets from './assets';
import { Action } from '../../server/shared/action';
import { GameObject, GameObjectType, PlayerInput } from '../../server/shared/gameObject';
import { Terrain } from '../../server/shared/terrain';
import { Vector2 } from '../../server/shared/math';
import { CraftRecipe, Hotbar, Inventory } from '../../server/shared/hotbar';
import { Application, Container, Texture, Ticker } from 'pixi.js';
import { Player } from './entities/player';
import { Entity } from './entities/entity';
import config from '../../server/shared/config';
import { HotbarUI } from './ui/hotbar';
import { DragManager } from './ui/dragManager';
import { InventoryUI } from './ui/inventory';
import { buildTerrainBackground } from './world/terrain';


document.addEventListener('contextmenu', event => event.preventDefault());

const worldWidth = config.window.width * config.worldScale;
const worldHeight = config.window.height * config.worldScale;
const app = new Application();
let hotbarUI: HotbarUI;
let dragManager: DragManager;
let inventoryUI: InventoryUI;

(window as any).__PIXI_DEVTOOLS__ = {
  app: app,
  // If you are not using a pixi app, you can pass the renderer and stage directly
  // renderer: myRenderer,
  // stage: myStage,
};

const ticker = Ticker.shared;
ticker.autoStart = true;
app.stage.eventMode = 'static';
const ws = new WebSocket(`ws://${Config.host}`);
const worldContainer = new Container();
worldContainer.label = 'World';
let playerId: string | null = null;
let playerEntity: Player | undefined;
const mousePosition = new Vector2(0, 0);



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

    hotbarUI = new HotbarUI();
    hotbarUI.container.position.set(
      app.screen.width / 2,
      app.screen.height - hotbarUI.container.height / 2 - 16
    );
    app.stage.addChild(hotbarUI.container);

    dragManager = new DragManager(app, hotbarUI, {
      onAssign: (slotKey, payload) => {
        sendAction(new Action('hotbar-assign', [slotKey, payload.index]));
      },
      onReturn: (payload) => {
        sendAction(new Action('hotbar-unassign', [payload.slotKey]));
      }
    });

    inventoryUI = new InventoryUI(app, dragManager, (itemId) => {
      sendAction(new Action('craft', [itemId]));
    });
    dragManager.registerInventoryDropTarget((x, y) => inventoryUI.containsPoint(x, y));
    hotbarUI.setDragHandler((event, slotKey, hotbarItem) => {
      const dragItem = { item: hotbarItem.texture, count: hotbarItem.count ?? 1 };
      dragManager.startDrag(event, dragItem, {
        source: { type: 'hotbar', slotKey },
        onDropSuccess: () => hotbarUI.clearSlot(slotKey),
      });
    });

    await setupSocketConnection();

    sendJoinMessage('Player 1');
    initInputListener();
    initInputBroadcast();

    const terrain = new Terrain(123);
    const terrainSprite = buildTerrainBackground(
      terrain,
      worldWidth,
      worldHeight,
      {
        grass: grassTexture,
        sand: sandTexture,
        water: waterTexture,
      },
      {
        grass: grassPixels,
        sand: sandPixels,
        water: waterPixels,
      }
    );
    worldContainer.addChild(terrainSprite);
})();

async function initApplication() {
  await app.init({
    background: '#323232',
    width: Config.window.width,
    height: Config.window.height,
    roundPixels: true,
    resolution: 3, // TODO(johannes): this should depend on screen DPI
    autoDensity: true
  });



  app.stage.addChild(worldContainer);  
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
  else if (action.type === 'hotbar') {
    updateHotbar(action.args[0] as Hotbar);
  }
  else if (action.type === 'inventory') {
    toggleInventory(action.args[0] as Inventory, action.args[1] as CraftRecipe[]);
  }
  else if (action.type === 'inventory-update') {
    refreshInventory(action.args[0] as Inventory, action.args[1] as CraftRecipe[]);
  }
}

function updateWorldState(nextWorldState: GameObject[]) {
  const ids = nextWorldState.map((gameObject) => gameObject.id);

  // Remove items from stage that are not in the world
  worldContainer.children.forEach((child) => {
    if (!ids.includes(child.label) && child.label != 'background') {
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
    worldContainer.pivot.set(
      playerEntity.position.x - config.window.width/2, 
      playerEntity.position.y - config.window.height/2
    ); 
  }
  
}

function updateHotbar(updatedHotbar: Hotbar) {
  if (!hotbarUI) return;
  hotbarUI.update(updatedHotbar);
}

function toggleInventory(inventoryData: Inventory, craftRecipes?: CraftRecipe[]) {
  if (!inventoryUI) return;
  inventoryUI.toggle(inventoryData, craftRecipes);
}

function refreshInventory(inventoryData: Inventory, craftRecipes?: CraftRecipe[]) {
  if (!inventoryUI) return;
  inventoryUI.update(inventoryData, craftRecipes);
}

function initInputListener() {
  window.addEventListener('keydown', (event) => {
    input.keys[event.key] = {pressed: true, justPressed: true};
  });
  window.addEventListener('keyup', (event) => {
    input.keys[event.key] = {pressed: false, justPressed: false};
  });

  window.addEventListener('mousedown', () => {
    input.keys['mouse0'] = {pressed: true, justPressed: true};
  });
  window.addEventListener('mouseup', () => {
    input.keys['mouse0'] = {pressed: false, justPressed: false};
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

    const inventoryVisible = inventoryUI?.isOpen() ?? false;
    if (!inventoryVisible || (input.keys['i'] && input.keys['i'].justPressed)) {
      sendAction(new Action('input', [input]));
    }

    for (let key in input.keys) {
      input.keys[key].justPressed = false;
    }
  }, 1000 / 30);
  
}

function updatePlayerRotationInput() {
  if (playerEntity == undefined) return;
  const dx = mousePosition.x + worldContainer.pivot.x - playerEntity.position.x;
  const dy = mousePosition.y + worldContainer.pivot.y - playerEntity.position.y;
  input.rotation = Math.atan2(dy, dx);
}

function sendJoinMessage(playerName: string) {
  sendAction(new Action('join', [playerName]));
}

function sendAction(action: Action) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(action));
}
