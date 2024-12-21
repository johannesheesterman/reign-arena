import * as uuid from "jsr:@std/uuid";
import { Action } from "../shared/action.ts";
import { GameObject, PlayerInput } from "../shared/gameObject.ts";
import { Vector2 } from "../shared/math.ts";

const players: Player[] = [];
const player_speed = 100;
const world: GameObject[] = [];
const worldSize = { width: 320, height: 180 };
const projectiles: Projectile[] = [];

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.addEventListener("open", (event) => {
    players.push(new Player(socket));
  });
  socket.addEventListener("message", (event) => {
    const action = JSON.parse(event.data) as Action;

    if (action.type === "join") {
      const player = players.find((player) => player.socket === socket);
      if (player) { handleJoin(player); }
    }
    else if (action.type === "input") {
      const player = players.find((player) => player.socket === socket);
      if (player && player.gameObject) handleInput(player, action);
    }
  });
  socket.addEventListener("close", (event) => {
    for (let i = 0; i < players.length; i++) {
      if (players[i].socket === socket) {
        for (let j = 0; j < world.length; j++) {
          if (world[j] === players[i].gameObject) {
            world.splice(j, 1);
            break;
          }
        }
        for (let j = 0; j < world.length; j++) {
          if (world[j] === players[i].weapon) {
            world.splice(j, 1);
            break;
          }
        }
        players.splice(i, 1);
        break
      }
    }
  });

  return response;
});

let lastTime = performance.now();

setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  for (const player of players) {
    updatePlayerPosition(player, dt);
  }

  for (const player of players) {
    updateProjectiles(player, dt);
  }

  broadcastWorldState();
}, 1000 / 30);

function updatePlayerPosition(player: Player, dt: number) {
  if (!player.gameObject) return;

  // Update player position
  let vel = new Vector2(0, 0);
  if (player.input.keys["ArrowLeft"] || player.input.keys["a"]) vel.x += -1;
  if (player.input.keys["ArrowRight"] || player.input.keys["d"]) vel.x += 1;
  if (player.input.keys["ArrowUp"] || player.input.keys["w"]) vel.y += -1;
  if (player.input.keys["ArrowDown"] || player.input.keys["s"]) vel.y += 1;
  vel = vel.normalized();
  player.gameObject.position.x += vel.x * player_speed * dt;
  player.gameObject.position.y += vel.y * player_speed * dt;
  if (vel.x < 0) player.gameObject.scale.x = -1;
  else if (vel.x > 0) player.gameObject.scale.x = 1;

  // Update weapon position
  const weapon = player.weapon;
  if (!weapon) return;
  const weaponOffset = new Vector2(10, 10);
  const rotation = player.input.rotation - (45 * Math.PI / 180);
  weapon.position.x = player.gameObject.position.x + weaponOffset.x * Math.cos(rotation) - weaponOffset.y * Math.sin(rotation);
  weapon.position.y = player.gameObject.position.y + weaponOffset.x * Math.sin(rotation) + weaponOffset.y * Math.cos(rotation);
  if (weapon.position.x < player.gameObject.position.x) weapon.scale.x = -1;
  else weapon.scale.x = 1;
  if (weapon.position.y < player.gameObject.position.y) weapon.scale.y = 1;
  else weapon.scale.y = -1;
  
}


function updateProjectiles(player: Player, dt: number) {
  player.attackCooldown -= dt;
  if (player.input.keys["mouse0"] && player.attackCooldown <= 0) {
    if (!player.weapon) return;
    player.attackCooldown = 0.5;
    const projectile = new Projectile(player);
    projectile.gameObject.position = { ...player.weapon.position };

    const projectile_speed = 100;
    const dx = player.gameObject!.position.x - player.weapon.position.x;
    const dy = player.gameObject!.position.y - player.weapon.position.y;
    projectile.velocity = new Vector2(-dx, -dy).normalized().scale(projectile_speed);
    projectile.gameObject.rotation = Math.atan2(dy, dx) - (90 * Math.PI / 180);
    world.push(projectile.gameObject);
    projectiles.push(projectile);
  }
 
  for (const projectile of projectiles) {
    projectile.update(dt);

    for (const player of players) {
      if (!player.gameObject) continue;
      if (player.gameObject === projectile.owner.gameObject) continue;
      if (projectile.gameObject.position.x > player.gameObject.position.x - 10 &&
          projectile.gameObject.position.x < player.gameObject.position.x + 10 &&
          projectile.gameObject.position.y > player.gameObject.position.y - 10 &&
          projectile.gameObject.position.y < player.gameObject.position.y + 10) {
        player.health -= 10;
        console.log('hit');
        projectile.remove();
      }
    }
  }  
}

function removeGameObject(obj: GameObject) {
  for (let i = 0; i < world.length; i++) {
    if (world[i] === obj) {
      world.splice(i, 1);
      break;
    }
  }
}

function handleJoin(player: Player) {
  player.gameObject = {
    id: uuid.v1.generate(),
    position: {
      x: Math.random() * worldSize.width,
      y: Math.random() * worldSize.height,
      z: 0
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "centurion",
  };

  player.weapon = {
    id: uuid.v1.generate(),
    position: {
      x: player.gameObject.position.x + 10,
      y: player.gameObject.position.y,
      z: 1
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "sword",
  };

  world.push(player.gameObject);
  world.push(player.weapon);

  player.socket.send(JSON.stringify(
    new Action("join", [player.gameObject.id])
  ));
}

function handleInput(player: Player, action: Action) {
  player.input = action.args[0] as PlayerInput;
}

function broadcastWorldState() {
  players.forEach((player) => {
    player.socket.send(JSON.stringify(
      new Action("update", [world])
    ));
  });
}

class Player {
  gameObject: GameObject | null = null;
  weapon: GameObject | null = null;
  health = 100;
  input = new PlayerInput();
  attackCooldown = 0;
  constructor(public socket: WebSocket) { }
}

class Projectile {
  gameObject: GameObject;
  velocity: Vector2;
  distanceTravelled: Vector2;
  constructor(public owner: Player) {
    this.gameObject = {
      id: uuid.v1.generate(),
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
      texture: "sword-projectile",
      rotation: 0
    };
    this.velocity = new Vector2(0, 0);
    this.distanceTravelled = new Vector2(0, 0);
  }

  update(dt: number) {
    this.gameObject.position.x += this.velocity.x * dt;
    this.gameObject.position.y += this.velocity.y * dt;
    this.distanceTravelled.x += this.velocity.x * dt;
    this.distanceTravelled.y += this.velocity.y * dt;
    if (this.distanceTravelled.length > 20) {
      this.remove();
    }
  }

  remove() {
    removeGameObject(this.gameObject);
    projectiles.splice(projectiles.indexOf(this), 1);
  }
}