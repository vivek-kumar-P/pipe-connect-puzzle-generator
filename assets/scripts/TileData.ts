export enum TileType {
    EMPTY    = 'EMPTY',
    START    = 'START',
    END      = 'END',
    STRAIGHT = 'STRAIGHT',
    ELBOW    = 'ELBOW',
    TSHAPE   = 'TSHAPE',
    CROSS    = 'CROSS',
    OBSTACLE = 'OBSTACLE',
}

export interface CellDef {
    type: TileType;
    rotation: number;
}

// N=0, E=1, S=2, W=3
const BASE: Record<TileType, [boolean,boolean,boolean,boolean]> = {
    [TileType.EMPTY]:    [false, false, false, false],
    [TileType.START]:    [false, true,  false, false],
    [TileType.END]:      [false, false, false, true ],
    [TileType.STRAIGHT]: [true,  false, true,  false],
    [TileType.ELBOW]:    [false, true,  true,  false],
    [TileType.TSHAPE]:   [true,  true,  false, true ],
    [TileType.CROSS]:    [true,  true,  true,  true ],  // all 4 open
    [TileType.OBSTACLE]: [false, false, false, false],  // blocks everything
};

export function getConnections(
    type: TileType,
    rotation: number
): [boolean,boolean,boolean,boolean] {
    const base = BASE[type];
    const rot  = ((rotation % 4) + 4) % 4;
    const out: [boolean,boolean,boolean,boolean] = [false,false,false,false];
    for (let i = 0; i < 4; i++) out[(i + rot) % 4] = base[i];
    return out;
}

// Which tile types are ROTATABLE by player
export function isRotatable(type: TileType): boolean {
    return type !== TileType.EMPTY
        && type !== TileType.START
        && type !== TileType.END
        && type !== TileType.OBSTACLE  // ← stone, tap does nothing
        && type !== TileType.CROSS;    // ← all sides open, rotation pointless
}

// Which grid size uses which tile types
export function getAllowedPathTiles(gridSize: number): TileType[] {
    switch(gridSize) {
        case 3: return [TileType.STRAIGHT, TileType.ELBOW];
        case 4: return [TileType.STRAIGHT, TileType.ELBOW];
        case 5: return [TileType.STRAIGHT, TileType.ELBOW, TileType.TSHAPE];
        case 6: return [TileType.STRAIGHT, TileType.ELBOW, TileType.TSHAPE];
        default: return [TileType.STRAIGHT, TileType.ELBOW];
    }
}

export function getObstacleTiles(gridSize: number): TileType[] {
    switch(gridSize) {
        case 3: return [];                           // no obstacles
        case 4: return [TileType.OBSTACLE];          // stone only
        case 5: return [TileType.OBSTACLE, TileType.CROSS]; // stone + cross
        case 6: return [TileType.OBSTACLE, TileType.CROSS]; // stone + cross
        default: return [];
    }
}

// Move buffer multiplier per grid size
export function getMoveBuffer(gridSize: number): number {
    switch(gridSize) {
        case 3: return 1.25;  // +25% buffer
        case 4: return 1.40;  // +25% buffer
        case 5: return 1.50;  // +20% buffer
        case 6: return 1.60;  // +25% buffer
        default: return 1.25;
    }
}

// Max obstacles per level per grid size
export function getObstacleCount(gridSize: number): number {
    switch(gridSize) {
        case 3: return 0;
        case 4: return 4;   // 1-2 obstacles
        case 5: return 6;   // 1-2 cross/obstacle tiles
        case 6: return 9;   // up to 3
        default: return 0;
    }
}