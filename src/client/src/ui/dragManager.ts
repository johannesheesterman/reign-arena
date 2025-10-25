import { Application, FederatedPointerEvent, Sprite } from 'pixi.js';
import { Inventory } from '../../../server/shared/hotbar';
import Assets from '../assets';
import { HotbarUI } from './hotbar';

type InventoryItem = Inventory[number];

export class DragManager {
  private dragging: { item: InventoryItem; sprite: Sprite } | null = null;

  constructor(
    private app: Application,
    private hotbarUI: HotbarUI,
    private onAssign: (slotKey: string, item: InventoryItem) => void
  ) {
    this.registerPointerListeners();
  }

  startDrag(event: FederatedPointerEvent, item: InventoryItem) {
    if (event.button !== 0) return;
    if (this.dragging) return;

    event.stopPropagation();

    const sprite = new Sprite(Assets[item.item]);
    sprite.anchor.set(0.5, 0.5);
    sprite.width = 16;
    sprite.height = 16;
    sprite.label = 'dragging-item';
    sprite.name = 'dragging-item';
    sprite.position.set(event.global.x, event.global.y);

    this.app.stage.addChild(sprite);
    this.dragging = { item, sprite };
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

    const slotKey = this.hotbarUI.getDroppableSlotAt(event.global.x, event.global.y);
    if (slotKey) {
      this.onAssign(slotKey, this.dragging.item);
    }

    this.cancel();
  }
}
