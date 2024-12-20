import * as uuid from "jsr:@std/uuid";
import { Action } from "../shared/action.ts";
import { GameObject } from "../shared/gameObject.ts";
import { Vector2 } from "../shared/math.ts";

const players: Player[] = [];
const world: GameObject[] = [];
const worldSize = { width: 320, height: 180 };

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
        players.splice(i, 1);
        break
      }
    }
  });

  return response;
});

setInterval(() => {
  broadcastWorldState();
}, 1000 / 30);

function handleJoin(player: Player) {
  player.gameObject = {
    id: uuid.v1.generate(),
    position: {
      x: Math.random() * worldSize.width,
      y: Math.random() * worldSize.height,
      z: 0
    },
    scale: { x: 1, y: 1 },
    texture: "centurion",
  };
  world.push(player.gameObject);

  player.socket.send(JSON.stringify(
    new Action("join", [player.gameObject.id])
  ));
}

function handleInput(player: Player, action: Action) {
  if (!player.gameObject) return;

  let vel = new Vector2(0, 0);
  const input = action.args[0] as { [key: string]: boolean; };
  if (input["ArrowLeft"] || input["a"]) vel.x += -1;
  if (input["ArrowRight"] || input["d"]) vel.x += 1;
  if (input["ArrowUp"] || input["w"]) vel.y += -1;
  if (input["ArrowDown"] || input["s"]) vel.y += 1;
  vel = vel.normalized();
  player.gameObject.position.x += vel.x;
  player.gameObject.position.y += vel.y;
  if (vel.x < 0) player.gameObject.scale.x = -1;
  else if (vel.x > 0) player.gameObject.scale.x = 1;  
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
  constructor(public socket: WebSocket) { }
}

