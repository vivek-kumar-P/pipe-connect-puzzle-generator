import { _decorator, Component, Node, UITransform,
         Sprite, SpriteFrame, resources, Graphics,
         Color, Label } from 'cc';
import { CellDef, TileType, isRotatable } from './TileData';

const { ccclass } = _decorator;

// Per grid size: slot = full cell size (line to line)
//                gap  = space between grid edge and container edge
//                padding = tile image size as % of slot (leaves room from lines)
const TILE_CONFIG: Record<number, { slot: number, gap: number, padding: number }> = {
    3: { slot: 170, gap: 10, padding: 0.10 },
    4: { slot: 185, gap: 25, padding: 0.55 },
    5: { slot: 170, gap: 25, padding: 0.48 },
    6: { slot: 180, gap: 25, padding: 0.42 },
};

const TILE_TEXTURE: Record<TileType, string> = {
    [TileType.START]:    'textures/tiles/start/spriteFrame',
    [TileType.END]:      'textures/tiles/end/spriteFrame',
    [TileType.STRAIGHT]: 'textures/tiles/straight/spriteFrame',
    [TileType.ELBOW]:    'textures/tiles/elbow/spriteFrame',
    [TileType.TSHAPE]:   'textures/tiles/tshape/spriteFrame',
    [TileType.CROSS]:    'textures/tiles/cross/spriteFrame',
    [TileType.OBSTACLE]: 'textures/tiles/obstacle/spriteFrame',
    [TileType.EMPTY]:    '',
};

@ccclass('GridRenderer')
export class GridRenderer extends Component {

    private grid: CellDef[][]  = [];
    private gridSize: number   = 4;
    private onTap: ((r: number, c: number) => void) | null = null;
    private cellNodes: Node[][] = [];
    private linesNode: Node | null = null;

    // ─── Public Init ─────────────────────────────────────

    public init(
        grid: CellDef[][],
        gridSize: number,
        onTap: (r: number, c: number) => void
    ) {
        this.grid     = grid;
        this.gridSize = gridSize;
        this.onTap    = onTap;

        this.node.removeAllChildren();
        this.cellNodes = [];
        this.linesNode = null;

        this.buildGrid();
    }

    // ─── Build Grid (Lines + Tiles) ──────────────────────

    private buildGrid() {
        const { slot, gap } = TILE_CONFIG[this.gridSize];
        const totalW = this.gridSize * slot;
        const totalH = this.gridSize * slot;

        // Resize GridNode container to fit this grid exactly
        const gridTF = this.node.getComponent(UITransform)
                    || this.node.addComponent(UITransform);
        gridTF.setContentSize(totalW + gap * 2, totalH + gap * 2);

        // Draw grid lines first (behind tiles)
        this.drawGridLines(slot, totalW, totalH);

        // Build tile cells on top
        this.buildCells(slot, totalW, totalH);
    }

    // ─── Draw Full Grid Lines (Graphics) ─────────────────

    private drawGridLines(slot: number, totalW: number, totalH: number) {
        const linesNode = new Node('GridLines');
        this.node.addChild(linesNode);
        linesNode.setSiblingIndex(0); // render behind tiles
        linesNode.setPosition(0, 0, 0);

        const g = linesNode.addComponent(Graphics);
        g.lineWidth = 10;
        g.strokeColor = new Color(255, 255, 255, 255);

        const left   = -totalW / 2;
        const right  =  totalW / 2;
        const top    =  totalH / 2;
        const bottom = -totalH / 2;

        // Vertical lines (gridSize + 1 lines)
        for (let c = 0; c <= this.gridSize; c++) {
            const x = left + c * slot;
            g.moveTo(x, top);
            g.lineTo(x, bottom);
        }

        // Horizontal lines (gridSize + 1 lines)
        for (let r = 0; r <= this.gridSize; r++) {
            const y = top - r * slot;
            g.moveTo(left, y);
            g.lineTo(right, y);
        }

        g.stroke();
        this.linesNode = linesNode;
    }

    // ─── Build Tile Cells ─────────────────────────────────

    private buildCells(slot: number, totalW: number, totalH: number) {
        const { padding } = TILE_CONFIG[this.gridSize];
        const tileSize = slot * padding;

        this.cellNodes = [];

        for (let r = 0; r < this.gridSize; r++) {
            this.cellNodes[r] = [];
            for (let c = 0; c < this.gridSize; c++) {

                const cell = new Node(`cell_${r}_${c}`);
                this.node.addChild(cell);

                // Position: center of each grid cell
                const x = c * slot - totalW / 2 + slot / 2;
                const y = -(r * slot - totalH / 2 + slot / 2);
                cell.setPosition(x, y, 0);

                const tf = cell.addComponent(UITransform);
                tf.setContentSize(tileSize, tileSize);

                cell.addComponent(Sprite);

                const row = r, col = c;
                cell.on(Node.EventType.TOUCH_END, () => {
                    if (this.onTap) this.onTap(row, col);
                });

                this.cellNodes[r][c] = cell;
                this.loadCellTexture(r, c);
            }
        }
    }

    // ─── Load Texture For Cell ───────────────────────────

    private loadCellTexture(r: number, c: number) {
        const cell = this.cellNodes[r][c];
        const data = this.grid[r][c];
        const path = TILE_TEXTURE[data.type];

        if (!path) {
            const sprite = cell.getComponent(Sprite);
            if (sprite) sprite.enabled = false;
            return;
        }

        resources.load(path, SpriteFrame, (err, sf) => {
            if (err) {
                console.warn(`Texture not found: ${path}`);
                return;
            }
            const sprite = cell.getComponent(Sprite);
            if (sprite) {
                sprite.enabled     = true;
                sprite.spriteFrame = sf;
                sprite.sizeMode    = Sprite.SizeMode.CUSTOM;
            }
            this.applyCellRotation(r, c);
        });
    }

    // ─── Apply Rotation ───────────────────────────────────

    private applyCellRotation(r: number, c: number) {
        const cell = this.cellNodes[r][c];
        const data = this.grid[r][c];
        cell.angle = -data.rotation * 90;
    }

    // ─── Public: Update Single Cell ──────────────────────

    public updateCell(r: number, c: number) {
        this.applyCellRotation(r, c);
    }

    // ─── Public: Highlight Win Path ──────────────────────

    public highlightPath(cells: [number, number][]) {
        for (let r = 0; r < this.gridSize; r++)
            for (let c = 0; c < this.gridSize; c++) {
                const node   = this.cellNodes[r][c];
                const sprite = node?.getComponent(Sprite);
                if (sprite) sprite.color = new Color(255, 255, 255, 255);
            }

        for (const [r, c] of cells) {
            const node   = this.cellNodes[r][c];
            const sprite = node?.getComponent(Sprite);
            if (sprite) sprite.color = new Color(100, 255, 100, 255);
        }
    }
}