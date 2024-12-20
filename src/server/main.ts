import * as uuid from "jsr:@std/uuid";
import { Action } from "../shared/action.ts";
import { GameObject } from "../shared/gameObject.ts";

const players: Player[] = [];
const world: GameObject[] = [];

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
      if (player) {
        // player.name = action.args[0];

        player.gameObject = {
          id: uuid.v1.generate(),
          position: { x: Math.random() * 320, y: Math.random() * 180, z: 0 },
          scale: { x: 1, y: 1 },
          texture: "centurion",
        };

        world.push(player.gameObject);
      }
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