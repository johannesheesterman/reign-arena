import './style.css';
import centurionPng from '/centurion.png?url';
import { Action } from '../../shared/action';
import { GameObject } from '../../shared/gameObject';
import { Application, Assets, Sprite } from 'pixi.js';

const app = new Application();
const ws = new WebSocket('ws://localhost:8000');


const assets: { [key: string]: any } = {};

(async () => {
    await initApplication();
    await loadAssets();
    await setupSocketConnection();

    sendJoinMessage('Player 1');

    // const player = new Sprite(assets['centurion']);
    // app.stage.addChild(player);
    // player.anchor.set(0.5);
    // player.x = app.screen.width / 2;
    // player.y = app.screen.height / 2;

})();

async function initApplication() {
  await app.init({
    background: '#323232',
    width: 320,
    height: 180,
    roundPixels: true,
    resolution: 1
  });

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
  const centurionTexture = await Assets.load(centurionPng);
  assets['centurion'] = centurionTexture;
}

function setupSocketConnection(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ws.onopen = () => {
      console.log('connected');
      resolve();
    };
    ws.onmessage = (event) => {

      const action = JSON.parse(event.data) as Action;
      if (action.type === 'update') {
        const world = action.args[0] as GameObject[];
        const ids = world.map((gameObject) => gameObject.id);
         
        // Remove items from stage that are not in the world
        app.stage.children.forEach((child) => {
          if (!ids.includes(child.label)) {
            app.stage.removeChild(child);
          }
        });

        // Add items to stage that are in the world
        world.forEach((gameObject) => {
          let sprite = app.stage.getChildByName(gameObject.id) as Sprite;
          if (!sprite) {
            sprite = new Sprite(assets[gameObject.texture]);
            sprite.label = gameObject.id;
            app.stage.addChild(sprite);
          }
          sprite.anchor.set(0.5);
          sprite.x = gameObject.position.x;
          sprite.y = gameObject.position.y;
          sprite.scale.x = gameObject.scale.x;
          sprite.scale.y = gameObject.scale.y;
        });
      }
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

function sendJoinMessage(playerName: string) {
  ws.send(JSON.stringify(new Action('join', [playerName])));
}