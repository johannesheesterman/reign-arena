  import './style.css';
import centurionPng from '../public/centurion.png';
import { Application, Assets, Sprite } from 'pixi.js';


(async () =>
{
    const app = new Application();
    await app.init({ 
      background: '#323232', 
      width:320,
      height: 180,
      roundPixels: true,
      resolution: 1
    });

    app.renderer.view.autoDensity = true;
    document.body.appendChild(app.canvas);
    scaleToWindow(app);
    window.addEventListener('resize', () => scaleToWindow(app));

    const centurionTexture = await Assets.load(centurionPng);

    const player = new Sprite(centurionTexture);
    app.stage.addChild(player);
    player.anchor.set(0.5);
    player.x = app.screen.width / 2;
    player.y = app.screen.height / 2;

})();

function scaleToWindow(app: Application) {
  console.log('scaleToWindow');
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