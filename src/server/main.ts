import * as uuid from "jsr:@std/uuid";
import Config from "./shared/config.ts";
import { Action } from "./shared/action.ts";
import { GameObject, GameObjectType, PlayerInput } from "./shared/gameObject.ts";
import { Vector2 } from "./shared/math.ts";
import config from "./shared/config.ts";
import { Terrain } from "./shared/terrain.ts";
import { Hotbar, Inventory } from "./shared/hotbar.ts";

const players: Player[] = [];
const player_speed = 100;
const world: GameObject[] = [];
const worldSize = { width: Config.window.width * Config.worldScale, height: Config.window.height * Config.worldScale };
const projectiles: Projectile[] = [];
const obstacles: GameObject[] = [];

const terrain = new Terrain(123);

// Initialie random world
for (let i = 0; i < 3; i++) {
  let crate = {
    id: uuid.v1.generate(),
    position: {
      x: (worldSize.width / config.worldScale) +  (Math.random() * (worldSize.width / config.worldScale)),
      y: (worldSize.height / config.worldScale) +  (Math.random() * (worldSize.height / config.worldScale)),
      z: 0
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "crate",
    type: GameObjectType.Obstacle,
    collisionSize: { width: 16, height: 16 }
  };
  crate.position.z = crate.position.y;
  let overlap = false;
  for (let j = 0; j < world.length; j++) {
    if (crate.position.x < world[j].position.x + 16 &&
        crate.position.x + 16 > world[j].position.x &&
        crate.position.y < world[j].position.y + 16 &&
        crate.position.y + 16 > world[j].position.y) {
      overlap = true;
      break;
    }
  }
  if (!overlap)  {
    world.push(crate);
    obstacles.push(crate);
  }

}
// add chest
world.push({
  id: uuid.v1.generate(),
  position: {
    x: worldSize.width/2,
    y: worldSize.height/2,
    z: worldSize.height/2
  },
  rotation: 0,
  scale: { x: 1, y: 1 },
  texture: "chest",
  type: GameObjectType.Obstacle
});

// Add random walls
for (let i = 0; i < 4; i++) {
  let wall = {
    id: uuid.v1.generate(),
    position: {
      x: i * 32 + worldSize.width / 2,
      y: worldSize.height / 2 - 48,
      z: worldSize.height / 2 - 48
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "wood-wall",
    type: GameObjectType.Obstacle,
    collisionSize: { width: 32, height: 8 }
  };
  world.push(wall);
  obstacles.push(wall);
}

// Add random trees
for (let i = 0; i < 10; i++) {
  let tree: GameObject = {
    id: uuid.v1.generate(),
    position: {
      x: (worldSize.width / config.worldScale) +  (Math.random() * (worldSize.width / config.worldScale)),
      y: (worldSize.height / config.worldScale) +  (Math.random() * (worldSize.height / config.worldScale)),
      z: 0
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "tree",
    health: 30,
    maxHealth: 30,
    type: GameObjectType.Obstacle,
    collisionSize: { width: 9, height: 8 },
    collisionOffset: { x: -1, y: 37 }
  };
  tree.position.z = tree.position.y + (96/2);
  
  //if (!terrain.isGrass(terrain.e(tree.position.x, tree.position.y))) continue;

  console.log(tree.position.x, tree.position.y);
  world.push(tree);
  obstacles.push(tree);
}


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
  if (isPressed(player.input, 'ArrowLeft')  || isPressed(player.input, "a")) vel.x += -1;
  if (isPressed(player.input, "ArrowRight") || isPressed(player.input, "d")) vel.x += 1;
  if (isPressed(player.input, "ArrowUp")    || isPressed(player.input, "w")) vel.y += -1;
  if (isPressed(player.input, "ArrowDown")  || isPressed(player.input, "s")) vel.y += 1;
  vel = vel.normalized();

  const dx = vel.x * player_speed * dt;
  const dy = vel.y * player_speed * dt;
  player.gameObject.position.x += dx;
  player.gameObject.position.y += dy;
  player.gameObject.position.z = player.gameObject.position.y + 26/2;
  if (vel.x < 0) player.gameObject.scale.x = -1;
  else if (vel.x > 0) player.gameObject.scale.x = 1;

  // Check for collision with obstacles
  for (const obstacle of obstacles) {
    if (isColliding(player.gameObject, obstacle)) {


      const tdx = (player.gameObject.collisionSize!.width + obstacle.collisionSize!.width) / 2;
      const tdy = (player.gameObject.collisionSize!.height + obstacle.collisionSize!.height) / 2;

      const collisionOffsetB = obstacle.collisionOffset || { x: 0, y: 0 };
      const obstacleX = obstacle.position.x + collisionOffsetB.x;
      const obstacleY = obstacle.position.y + collisionOffsetB.y;

      if (dx != 0 && dy == 0) { // Moving horizontally
        player.gameObject.position.x -= dx;
        if (dx > 0) player.gameObject.position.x = obstacleX - tdx;
        else player.gameObject.position.x = obstacleX + tdx;
      } else if (dx == 0 && dy != 0) { // Moving vertically
        player.gameObject.position.y -= dy;
        if (dy > 0)  player.gameObject.position.y = obstacleY - tdy;
        else player.gameObject.position.y = obstacleY + tdy;
      } else { // Moving diagonally
        player.gameObject.position.x -= dx;
        player.gameObject.position.y -= dy;
      }
    }
  }

  // Wrap around world
  // if (player.gameObject.position.x < 0) player.gameObject.position.x = worldSize.width;
  // else if (player.gameObject.position.x > worldSize.width) player.gameObject.position.x = 0;
  // if (player.gameObject.position.y < 0) player.gameObject.position.y = worldSize.height;
  // else if (player.gameObject.position.y > worldSize.height) player.gameObject.position.y = 0;

  // Update weapon position
  const weapon = player.weapon;
  if (!weapon) return;
  const weaponOffset = new Vector2(10, 10);
  const rotation = player.input.rotation - (45 * Math.PI / 180);
  weapon.position.x = player.gameObject.position.x + weaponOffset.x * Math.cos(rotation) - weaponOffset.y * Math.sin(rotation);
  weapon.position.y = player.gameObject.position.y + weaponOffset.x * Math.sin(rotation) + weaponOffset.y * Math.cos(rotation);
  weapon.position.z = player.gameObject.position.z + 1;
  if (weapon.position.x < player.gameObject.position.x) weapon.scale.x = -1;
  else weapon.scale.x = 1;
  if (weapon.position.y < player.gameObject.position.y) weapon.scale.y = 1;
  else weapon.scale.y = -1;
 
}


function updateHotbarSelection(player: Player, key: string) {
  for (const k in player.hotbar) {
    if (player.hotbar[k] == null) continue;
    player.hotbar[k].selected = k == key;
  }
  player.socket.send(JSON.stringify(
    new Action("hotbar", [player.hotbar])
  ));
}

function updateInventory(player: Player, item: string, count: number) {
  for (let i = 0; i < player.inventory.length; i++) {
    if (player.inventory[i].item == item) {
      player.inventory[i].count += count;
      console.log('added to inventory', player.inventory);
      return;
    }
  }
  player.inventory.push({ item, count });
  console.log('added to inventory', player.inventory);
}

function updateProjectiles(player: Player, dt: number) {
  if (!player.gameObject) return;
  
  player.attackCooldown -= dt;
  if (isPressed(player.input, "mouse0") && player.attackCooldown <= 0) {
    if (!player.weapon) return;
    player.attackCooldown = 0.5;

    let projectTileType: ProjectileType;
    if (player.weapon.texture === "sword") {
      projectTileType = ProjectileType.Sword;
    } else if (player.weapon.texture === "bow") {
      projectTileType = ProjectileType.Arrow;
    } else {
      projectTileType = ProjectileType.Hatchet;
    }

    const projectile = new Projectile(player, projectTileType);
    projectile.gameObject.position = { ...player.gameObject!.position };

    const projectile_speed = 200;
    const dx = player.gameObject!.position.x - player.weapon.position.x;
    const dy = player.gameObject!.position.y - player.weapon.position.y;
    projectile.velocity = new Vector2(-dx, -dy).normalized().scale(projectile_speed);

    if (projectile.type == ProjectileType.Arrow) {
      projectile.gameObject.rotation = Math.atan2(dy, dx);
      projectile.gameObject.scale.x = -1;
    }else {
      projectile.gameObject.rotation = Math.atan2(dy, dx) - (90 * Math.PI / 180);
    }


    world.push(projectile.gameObject);
    projectiles.push(projectile);
  }
 
  for (const projectile of projectiles) {
    projectile.update(dt);

    for (const player of players) {
      if (!player.gameObject) continue;
      if (player.gameObject === projectile.owner.gameObject) continue;
      if (isColliding(player.gameObject, projectile.gameObject)) {
        player.health -= 35;
        player.gameObject.health = player.health;
        projectile.remove();

        if (player.health <= 0) {
          removeGameObject(player.gameObject);
          removeGameObject(player.weapon!);
          player.gameObject = null;
          player.weapon = null;
        }
        break;
      }
    }

    for (const obstacle of obstacles) {
      if (isColliding(obstacle, projectile.gameObject)) {
        console.log('collided with obstacle', projectile.type, obstacle.texture);

        if (projectile.type == ProjectileType.Hatchet) {
          if (obstacle.texture == "tree") {
            // removeGameObject(obstacle);
            // obstacles.splice(obstacles.indexOf(obstacle), 1);
            updateInventory(player, "wood-resource", 5);
            obstacle.health! -= 5;
            if (obstacle.health! <= 0) {
              removeGameObject(obstacle);
              obstacles.splice(obstacles.indexOf(obstacle), 1);
            }
          }
        }

        projectile.remove();
        break;
      }
    }
  }  
}


function removeGameObject(obj: GameObject) {
  if (!obj) return;
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
      x: (worldSize.width / config.worldScale) +  (Math.random() * (worldSize.width / config.worldScale)),
      y: (worldSize.height / config.worldScale) +  (Math.random() * (worldSize.height / config.worldScale)),
      z: 0
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    texture: "hero32",
    health: 100,
    maxHealth: 100,
    type: GameObjectType.Player,
    collisionSize: { width: 19, height: 26 }
  };


  // if (players.length % 2 == 0) {
  //   player.gameObject.texture = "hooded";
  // }

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
    type: GameObjectType.Weapon
  };

  world.push(player.gameObject);
  world.push(player.weapon);

  player.socket.send(JSON.stringify(
    new Action("join", [player.gameObject.id])
  ));

  player.hotbar = {
    "1": { texture: "sword", selected: false },
    "2": { texture: "bow", selected: false },
    "3": { texture: "stone-hatchet", selected: false },
    "4": null,
    "5": null,
    "6": null
  } as Hotbar

  updateHotbarSelection(player, "1");
}

function handleInput(player: Player, action: Action) {
  player.input = action.args[0] as PlayerInput;

  if (isJustPressed(player.input, "1")) {
    player.weapon!.texture = "sword";
    updateHotbarSelection(player, "1");
  } else if (isJustPressed(player.input, "2")) {
    player.weapon!.texture = "bow";
    updateHotbarSelection(player, "2");
  } else if (isJustPressed(player.input, "3")) {
    player.weapon!.texture = "stone-hatchet";
    updateHotbarSelection(player, "3");
  }
  else if (isJustPressed(player.input, "i")) {
    console.log('broadcasting inventory', player.inventory);
    player.socket.send(JSON.stringify(
      new Action("inventory", [player.inventory])
    ));
  }
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
  hotbar: Hotbar = {};
  inventory: Inventory = [];

  constructor(public socket: WebSocket) { }
}

class Projectile {
  gameObject: GameObject;
  velocity: Vector2;
  distanceTravelled: Vector2;
  maxDistance: number;
  type: ProjectileType;

  constructor(public owner: Player, type: ProjectileType) {
    this.type = type;
    this.gameObject = {
      id: uuid.v1.generate(),
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
      texture: type == ProjectileType.Sword || type == ProjectileType.Hatchet 
                ? "sword-projectile" : "arrow",
      rotation: 0,
      type: GameObjectType.Projectile
    };
    if (type == ProjectileType.Sword || type == ProjectileType.Hatchet) {
      this.gameObject.collisionSize = { width: 16, height: 5 };
    } else {
      this.gameObject.collisionSize = { width: 8, height: 4 };
    }

    this.velocity = new Vector2(0, 0);
    this.distanceTravelled = new Vector2(0, 0);
    this.maxDistance = this.type == ProjectileType.Sword || this.type == ProjectileType.Hatchet
    ? 32 : (Math.sqrt(config.window.width ** 2 + config.window.height ** 2));
  }

  update(dt: number) {
    this.gameObject.position.x += this.velocity.x * dt;
    this.gameObject.position.y += this.velocity.y * dt;
    this.distanceTravelled.x += this.velocity.x * dt;
    this.distanceTravelled.y += this.velocity.y * dt;


    if (this.distanceTravelled.length > this.maxDistance) {
      this.remove();
    }
  }

  remove() {
    removeGameObject(this.gameObject);
    projectiles.splice(projectiles.indexOf(this), 1);
  }
}

function isColliding(a: GameObject, b: GameObject): boolean {
  if (a.collisionSize == undefined || b.collisionSize == undefined) return false;

  const collisionOffsetA = a.collisionOffset || { x: 0, y: 0 };
  const collisionOffsetB = b.collisionOffset || { x: 0, y: 0 };

  const ax = a.position.x + collisionOffsetA.x;
  const ay = a.position.y + collisionOffsetA.y;
  const bx = b.position.x + collisionOffsetB.x;
  const by = b.position.y + collisionOffsetB.y;

  return Math.abs(ax - bx) < (a.collisionSize.width + b.collisionSize.width) / 2 &&
      Math.abs(ay - by) < (a.collisionSize.height + b.collisionSize.height) / 2;
}

function isPressed(input: PlayerInput, key: string): boolean {
  return input.keys[key] && input.keys[key].pressed;
}

function isJustPressed(input: PlayerInput, key: string): boolean {
  return input.keys[key] && input.keys[key].justPressed;
}

enum ProjectileType {
  Sword,
  Arrow,
  Hatchet
}