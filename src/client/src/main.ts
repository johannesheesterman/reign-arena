import './style.css';
import Config from '../../server/shared/config';
import Assets from './assets';
import { Action } from '../../server/shared/action';
import { GameObject, GameObjectType, PlayerInput } from '../../server/shared/gameObject';
import { Terrain } from '../../server/shared/terrain';
import { Vector2 } from '../../server/shared/math';
import { CraftRecipe, Hotbar, Inventory } from '../../server/shared/hotbar';
import { Application, applyMatrix, Container, ContainerChild, Graphics, Sprite, Texture, Ticker, TilingSprite, Text, TextOptions } from 'pixi.js';
import { Player } from './entities/player';
import { Entity } from './entities/entity';
import config from '../../server/shared/config';


document.addEventListener('contextmenu', event => event.preventDefault());

const worldWidth = config.window.width * config.worldScale;
const worldHeight = config.window.height * config.worldScale;
const app = new Application();
let hotbar: Container;
let inventoryOpen: boolean = false;
let inventory: Container | null = null;

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
    await setupSocketConnection();

    // Hotbar
    hotbar = new Container();
    hotbar.label = 'hotbar';
    hotbar.position.set(app.screen.width / 2, app.screen.height - hotbar.height / 2);
    hotbar.position.y -= 16;


    const hotbarSprite = new Sprite(Assets['hotbar']);
    hotbarSprite.anchor.set(0.5, 0.5);
    hotbarSprite.alpha = 0.8;
    hotbar.addChild(hotbarSprite);
    app.stage.addChild(hotbar);


    // const bgSprite = new TilingSprite({
    //   texture: Assets['sand'],
    //   width: app.screen.width,
    //   height: app.screen.height,
    //   zIndex: -1
    // });
    // app.stage.addChild(bgSprite);
    

    sendJoinMessage('Player 1');
    initInputListener();
    initInputBroadcast();

    generateTerrain();



})();

function generateTerrain() {
  const terrain = new Terrain(123);
  
    
  const backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = worldWidth;
  backgroundCanvas.height = worldHeight;
  const backgroundCtx = backgroundCanvas.getContext('2d');
  const imageData = backgroundCtx!.createImageData(worldWidth, worldHeight);

  for (let y = -(worldHeight / 2); y < (worldHeight / 2); y++) {
    for (let x = -(worldWidth / 2); x < (worldWidth / 2); x++) {      

      const e = terrain.e(x, y);
      const ny = y + worldHeight / 2;
      const nx = x + worldWidth / 2;

      if (terrain.isGrass(e)) { // grass
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
      else if (e > terrain.SAND_HEIGHT) { // sand
        const v = smoothStep((e - terrain.SAND_HEIGHT) / (terrain.GRASS_HEIGHT - terrain.SAND_HEIGHT));
        

        const i = ((ny % sandTexture.height) * sandTexture.width + (nx % sandTexture.width)) * 4;
        imageData.data[(ny * worldWidth + nx) * 4] = grassPixels[i] * v + sandPixels[i] * (1 - v);
        imageData.data[(ny * worldWidth + nx) * 4 + 1] = grassPixels[i + 1] * v + sandPixels[i + 1] * (1 - v);
        imageData.data[(ny * worldWidth + nx) * 4 + 2] = grassPixels[i + 2] * v + sandPixels[i + 2] * (1 - v);
        imageData.data[(ny * worldWidth + nx) * 4 + 3] = grassPixels[i + 3] * v + sandPixels[i + 3] * (1 - v);
      } 
      else { // water
        const i = ((ny % waterTexture.height) * waterTexture.width + (nx % waterTexture.width)) * 4;
        imageData.data[(ny * worldWidth + nx) * 4] = waterPixels[i];
        imageData.data[(ny * worldWidth + nx) * 4 + 1] = waterPixels[i + 1];
        imageData.data[(ny * worldWidth + nx) * 4 + 2] = waterPixels[i + 2];
        imageData.data[(ny * worldWidth + nx) * 4 + 3] = waterPixels[i + 3];
      }
    }
  }


  const backgroundTexture = Texture.from(backgroundCanvas);
  backgroundTexture.source.scaleMode = 'nearest';

  const backgroundSprite = new Sprite(backgroundTexture);
  backgroundSprite.zIndex = -1;
  backgroundSprite.label = 'background';

  backgroundCtx!.putImageData(imageData, 0, 0);
  backgroundTexture.update();

  worldContainer.addChild(backgroundSprite);


}


async function initApplication() {
  await app.init({
    background: '#323232',
    width: Config.window.width,
    height: Config.window.height,
    roundPixels: true,
    resolution: 2,
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
  else if (action.type === 'hotbar') {
    updateHotbar(action.args[0] as Hotbar);
  }
  else if (action.type === 'inventory') {
    toggleInventory(action.args[0] as Inventory, action.args[1] as CraftRecipe[]);

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
  for (let key in updatedHotbar) {
    const item = updatedHotbar[key];
    if (item == null) continue;

    let slot = hotbar.getChildByName(key);
    if (!slot) {
      slot = new Container();
      slot.label = key;
      const hotbarWidth = hotbar.width;
      const slotWidth = 23;
      const x = (parseInt(key) - 1) * (slotWidth) - (hotbarWidth / 2) + slotWidth / 2;
      slot.position.set(x, 0);   
      const sprite = new Sprite(Assets[item.texture]);
      sprite.anchor.set(0.5, 0.5);
      slot.addChild(sprite);
      hotbar.addChild(slot);
    }

    let border = slot!.getChildByName('border');

    if (item.selected && !border) {
      // Add border
      border = new Graphics()
        .rect(0, 0, 21, 21)
        .stroke(0xa53030);
      border.label = 'border';
      border.pivot.set(10, 10);
      border.position.set(0, -1);
      slot!.addChild(border);
    }   
    else if (!item.selected && border) {
      slot!.removeChild(border);
    }
  }  
}

function toggleInventory(inventoryData: Inventory, craftRecipes?: CraftRecipe[]) {
  console.log('toggling inventory', inventoryOpen, inventoryData, craftRecipes);

  if (inventoryOpen) { 
    if (!!inventory) app.stage.removeChild(inventory);
    inventoryOpen = false;
  }
  else {
    inventory = new Container();
    inventory.label = 'inventory';
    inventory.position.set(app.screen.width / 2, app.screen.height / 2);
    inventory.position.y -= 16;

    const inventorySprite = new Sprite(Assets['inventory']);
    inventorySprite.anchor.set(0.5, 0.5);
    inventorySprite.alpha = 0.8;
    inventory.addChild(inventorySprite);
    app.stage.addChild(inventory);
    inventoryOpen = true;

    const slotWidth = 23;
    const slotHeight = 23;
    const inventoryWidth = 6;
    const inventoryHeight = 4;

    for (let i = 0; i < inventoryData.length; i++) {
      const item = inventoryData[i];
      const x = Math.floor((i % inventoryWidth) * slotWidth - (inventoryWidth * slotWidth / 2) + slotWidth / 2);
      const y = Math.floor(i / inventoryWidth) * slotHeight - (inventoryHeight * slotHeight / 2) + slotHeight / 2;
      const slot = new Container();
      slot.position.set(x, y);
      slot.label = i.toString();
      const sprite = new Sprite(Assets[item.item]);
      sprite.width = 16;
      sprite.height = 16;
      sprite.anchor.set(0.5, 0.5);
      slot.addChild(sprite);

      // Quantity text
      const quantityText = new Text({
        text: item.count.toString(),
        style: {
          fontSize: 6,
          fill: 0xffffff,
          stroke: 0x000000,
        }
      });

      quantityText.anchor.set(1, 1);
      quantityText.position.set(8, 8);
      slot.addChild(quantityText);

      inventory.addChild(slot as Container);
    }

    // Render "Inventory" title"
    const titleText = new Text({
      text: 'Inventory',
      
      style: {
        fontSize: 10,
        fill: 0xffffff,
        stroke: {
          color: 0x000000,
          width: 1
        }
      }
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.position.set(- (inventoryWidth * slotWidth / 2) + 22, -(inventoryHeight * slotHeight / 2) - 10);
    inventory.addChild(titleText);  

    // Crafting recipes
    if (craftRecipes) {
      // Render "Crafting Recipes" title
      const titleText = new Text({
        text: 'Crafting',
        style: {
          fontSize: 10,
          fill: 0xffffff,
          stroke: 0x000000,
        }
      } );
      titleText.anchor.set(0.5, 0.5);
      titleText.position.set((inventoryWidth * slotWidth / 2) + 24, -(inventoryHeight * slotHeight / 2) - 10);
      inventory.addChild(titleText);

      // Render crafting recipes as a list on the right side of the inventory
      for (let i = 0; i < craftRecipes.length; i++) {
        const recipe = craftRecipes[i];
        const x = (inventoryWidth * slotWidth / 2) + 16;
        const y = (i * slotHeight) - (craftRecipes.length * slotHeight / 2) + slotHeight / 2;
        const recipeContainer = new Container();
        recipeContainer.position.set(x, y);
        recipeContainer.label = `recipe-${i}`;

        const resultSprite = new Sprite(Assets[recipe.item]);
        resultSprite.width = 16;
        resultSprite.height = 16;
        resultSprite.anchor.set(0.5, 0.5);
        recipeContainer.addChild(resultSprite);

        // Render title of the recipe
        const titleText = new Text({
          text: recipe.item,
          style: {
              fontSize: 10,
            fill: 0xffffff,
            stroke: 0x000000
          }
        });
        titleText.anchor.set(0, 0.5);
        titleText.position.set(20, 0);
        recipeContainer.addChild(titleText);

   
        // Hover effect to highlight recipe
        recipeContainer.eventMode = 'static';
        recipeContainer.on('mouseover', () => {
          recipeContainer.children.forEach((child) => {
            if (child instanceof Sprite) {
              child.tint = 0xaaaaaa;
              child.width *= 1.1;
              child.height *= 1.1;
            }
            if (child instanceof Text) {
              child.style.fontSize = 12;
            }
          });
        });
        recipeContainer.on('mouseout', () => {
          recipeContainer.children.forEach((child) => {
            if (child instanceof Sprite) {
              child.tint = 0xffffff;
              child.width /= 1.1;
              child.height /= 1.1;
            }
            if (child instanceof Text) {
              child.style.fontSize = 10;
            }
          });
        });
        // On click, send craft action to server
        recipeContainer.on('pointerdown', () => {
          sendAction(new Action('craft', [recipe.item]));
        });

        inventory.addChild(recipeContainer);
      }
    }

  }
}

function initInputListener() {
  window.addEventListener('keydown', (event) => {
    input.keys[event.key] = {pressed: true, justPressed: true};
  });
  window.addEventListener('keyup', (event) => {
    input.keys[event.key] = {pressed: false, justPressed: false};
  });

  window.addEventListener('mousedown', (event) => {
    input.keys['mouse0'] = {pressed: true, justPressed: true};
  });
  window.addEventListener('mouseup', (event) => {
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

    if (!inventoryOpen || (input.keys['i'] && input.keys['i'].justPressed)) {
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

