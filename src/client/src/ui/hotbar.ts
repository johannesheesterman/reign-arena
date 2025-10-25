import { Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import Assets from '../assets';
import { Hotbar } from '../../../server/shared/hotbar';

const DEFAULT_SLOT_KEYS = ['1', '2', '3', '4', '5', '6'];
const SLOT_SIZE = 23;

type HotbarItem = NonNullable<Hotbar[string]>;

export class HotbarUI {
  readonly container: Container;

  private readonly slotKeys: string[];
  private backgroundWidth: number;
  private onSlotDrag?: (event: FederatedPointerEvent, slotKey: string, item: HotbarItem) => void;

  constructor(slotKeys: string[] = DEFAULT_SLOT_KEYS) {
    this.slotKeys = slotKeys;
    this.container = new Container();
    this.container.label = 'hotbar';

    const background = new Sprite(Assets['hotbar']);
    background.anchor.set(0.5, 0.5);
    background.alpha = 0.8;
    background.label = 'hotbar-background';
    background.name = 'hotbar-background';

    this.backgroundWidth = background.width;
    this.container.addChild(background);

    this.initializeSlots();
  }

  setDragHandler(handler: (event: FederatedPointerEvent, slotKey: string, item: HotbarItem) => void) {
    this.onSlotDrag = handler;
  }

  update(hotbar: Hotbar) {
    const backgroundWidth = this.backgroundWidth || this.container.width;
    const keys = new Set<string>(this.slotKeys);
    Object.keys(hotbar).forEach((key) => keys.add(key));

    for (const key of keys) {
      const item = hotbar[key] ?? null;
      let slot = this.container.getChildByName(key) as Container;

      if (!slot) {
        slot = this.createSlot(key, backgroundWidth);
        this.container.addChild(slot);
      } else {
        this.positionSlot(slot, key, backgroundWidth);
      }

      const existingItem = slot.getChildByName('item') as Sprite | null;
      const existingCount = slot.getChildByName('item-count') as Text | null;

      if (item) {
        if (!existingItem) {
          const sprite = new Sprite(Assets[item.texture]);
          sprite.anchor.set(0.5, 0.5);
          sprite.label = 'item';
          sprite.width = 16;
          sprite.height = 16;
          slot.addChild(sprite);
        } else {
          existingItem.texture = Assets[item.texture];
        }

        const count = item.count ?? 0;
        if (count > 1) {
          if (!existingCount) {
            const countText = new Text({
              text: count.toString(),
              style: {
                fontSize: 6,
                fill: 0xffffff,
                stroke: 0x000000,
              }
            });
            countText.anchor.set(1, 1);
            countText.position.set(10, 10);
            countText.label = 'item-count';
            countText.name = 'item-count';
            slot.addChild(countText);
          } else {
            existingCount.text = count.toString();
          }
        } else if (existingCount) {
          slot.removeChild(existingCount);
          existingCount.destroy();
        }
      } else if (existingItem) {
        slot.removeChild(existingItem);
        existingItem.destroy();
        if (existingCount) {
          slot.removeChild(existingCount);
          existingCount.destroy();
        }
      }

      slot.removeAllListeners('pointerdown');
      if (item && item.count != null && this.onSlotDrag) {
        slot.on('pointerdown', (event: FederatedPointerEvent) => {
          if (event.button !== 0) return;
          this.onSlotDrag?.(event, key, item);
        });
        slot.cursor = 'pointer';
      } else {
        const hasItem = slot.getChildByName('item') != null;
        slot.cursor = hasItem ? 'default' : 'pointer';
      }

      let border = slot.getChildByName('border') as Graphics | null;

      if (item && item.selected) {
        if (!border) {
          border = new Graphics()
            .rect(0, 0, 21, 21)
            .stroke(0xa53030);
          border.label = 'border';
          border.name = 'border';
          border.pivot.set(10, 10);
          border.position.set(0, -1);
          slot.addChild(border);
        }
      } else if (border) {
        slot.removeChild(border);
      }
    }
  }

  getDroppableSlotAt(globalX: number, globalY: number): string | null {
    for (const child of this.container.children) {
      if (!(child instanceof Container)) continue;
      const label = child.label;
      if (typeof label !== 'string' || !/^\d+$/.test(label)) continue;

      const slotCenter = child.getGlobalPosition();
      const halfSize = SLOT_SIZE / 2;
      const contains =
        globalX >= slotCenter.x - halfSize &&
        globalX <= slotCenter.x + halfSize &&
        globalY >= slotCenter.y - halfSize &&
        globalY <= slotCenter.y + halfSize;

      if (contains && !child.getChildByName('item')) {
        return label;
      }
    }
    return null;
  }

  isSlotEmpty(slotKey: string): boolean {
    const slot = this.container.getChildByName(slotKey) as Container | null;
    if (!slot) return true;
    return !slot.getChildByName('item');
  }

  clearSlot(slotKey: string) {
    const slot = this.container.getChildByName(slotKey) as Container | null;
    if (!slot) return;
    slot.removeAllListeners('pointerdown');
    const item = slot.getChildByName('item') as Sprite | null;
    if (item) {
      slot.removeChild(item);
      item.destroy();
    }
    const count = slot.getChildByName('item-count') as Text | null;
    if (count) {
      slot.removeChild(count);
      count.destroy();
    }
    const border = slot.getChildByName('border') as Graphics | null;
    if (border) {
      slot.removeChild(border);
    }
    slot.cursor = 'pointer';
  }

  private initializeSlots() {
    const backgroundWidth = this.backgroundWidth || this.container.width;
    for (const key of this.slotKeys) {
      if (!this.container.getChildByName(key)) {
        this.container.addChild(this.createSlot(key, backgroundWidth));
      }
    }
  }

  private createSlot(key: string, backgroundWidth: number): Container {
    const slot = new Container();
    slot.label = key;
    slot.name = key;
    slot.eventMode = 'static';
    slot.hitArea = new Rectangle(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE);
    slot.cursor = 'pointer';

    this.positionSlot(slot, key, backgroundWidth);
    return slot;
  }

  private positionSlot(slot: Container, key: string, backgroundWidth: number) {
    const numericKey = parseInt(key, 10);
    if (Number.isNaN(numericKey)) return;
    const index = numericKey - 1;
    const x = index * SLOT_SIZE - (backgroundWidth / 2) + SLOT_SIZE / 2;
    slot.position.set(x, 0);
  }
}
