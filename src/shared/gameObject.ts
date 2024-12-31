

export class GameObject {
    id: string = '';
    position: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 };
    scale: { x: number, y: number } = { x: 1, y: 1 };
    rotation: number = 0;
    texture: string = '';
    health?: number | undefined;
    maxHealth?: number | undefined;
}

export class PlayerInput {
    keys: { [key: string]: boolean } = {};
    rotation: number = 0;
}