import { Application, FederatedPointerEvent, Sprite } from 'pixi.js';
import { Inventory } from '../../../server/shared/hotbar';
import Assets from '../assets';
import { HotbarUI } from './hotbar';

type InventoryItem = Inventory[number];

type DragSource =
  | { type: 'inventory'; index: number }
  | { type: 'hotbar'; slotKey: string };

type DragOptions = {
  source: DragSource;
  onDropSuccess?: () => void;
};

type DraggingState = {
  item: InventoryItem;
  sprite: Sprite;
  source: DragSource;
  onDropSuccess?: () => void;
};

type AssignPayload = {
  item: InventoryItem;
  index: number;
};

type ReturnPayload = {
  item: InventoryItem;
  slotKey: string;
};

type DragCallbacks = {
  onAssign: (slotKey: string, payload: AssignPayload) => void;
  onReturn: (payload: ReturnPayload) => void;
};

export class DragManager {
  private dragging: DraggingState | null = null;
  private isInventoryDropTarget: ((x: number, y: number) => boolean) | null = null;

  constructor(
    private app: Application,
    private hotbarUI: HotbarUI,
    private callbacks: DragCallbacks
  ) {
    this.registerPointerListeners();
  }

  registerInventoryDropTarget(checker: (x: number, y: number) => boolean) {
    this.isInventoryDropTarget = checker;
  }

  startDrag(event: FederatedPointerEvent, item: InventoryItem, options: DragOptions) {
    if (event.button !== 0) return;
    if (this.dragging) return;
    if (!options.source) return;

    event.stopPropagation();

    const sprite = new Sprite(Assets[item.item]);
    sprite.anchor.set(0.5, 0.5);
    sprite.width = 16;
    sprite.height = 16;
    sprite.label = 'dragging-item';
    sprite.name = 'dragging-item';
    sprite.position.set(event.global.x, event.global.y);

    this.app.stage.addChild(sprite);
    this.dragging = {
      item,
      sprite,
      source: options.source,
      onDropSuccess: options.onDropSuccess,
    };
  }

  cancel() {
    if (!this.dragging) return;

    this.app.stage.removeChild(this.dragging.sprite);
    this.dragging.sprite.destroy();
    this.dragging = null;
  }

  private registerPointerListeners() {
    this.app.stage.on('pointermove', (event) => this.handlePointerMove(event));
    this.app.stage.on('pointerup', (event) => this.handlePointerUp(event));
    this.app.stage.on('pointerupoutside', (event) => this.handlePointerUp(event));
  }

  private handlePointerMove(event: FederatedPointerEvent) {
    if (!this.dragging) return;
    this.dragging.sprite.position.set(event.global.x, event.global.y);
  }

  private handlePointerUp(event: FederatedPointerEvent) {
    if (!this.dragging) return;

    const { item, source, onDropSuccess } = this.dragging;
    const slotKey = this.hotbarUI.getDroppableSlotAt(event.global.x, event.global.y);

    if (slotKey && source.type === 'inventory') {
      this.callbacks.onAssign(slotKey, {
        item,
        index: source.index,
      });
      onDropSuccess?.();
      this.cancel();
      return;
    }

    if (
      source.type === 'hotbar' &&
      this.isInventoryDropTarget?.(event.global.x, event.global.y)
    ) {
      this.callbacks.onReturn({
        item,
        slotKey: source.slotKey,
      });
      onDropSuccess?.();
      this.cancel();
      return;
    }

    this.cancel();
  }
}
