

export type Hotbar  = {[key: string]: {
    texture: string,
    selected: boolean,
} | null};

export type Inventory = {item: string, count: number}[];
