import {
    CellDef, TileType,
    getConnections,
    isRotatable,
    getAllowedPathTiles,
    getObstacleTiles,
    getObstacleCount,
    getMoveBuffer
} from './TileData';
import { checkPath, getPath } from './PathChecker';

// N, E, S, W
const DR = [-1, 0, 1, 0];
const DC = [ 0, 1, 0, -1];

export interface LevelDef {
    id:       number;
    gridSize: number;
    grid:     CellDef[][];   // scrambled (shown to player)
    maxMoves: number;
    path:     [number,number][];
}

// ─── Helpers ────────────────────────────────────────────

function makeEmptyGrid(rows: number, cols: number): CellDef[][] {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            type: TileType.EMPTY,
            rotation: 0
        }))
    );
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── Step 1: Random Walk from START to END ──────────────

function randomWalk(
    rows: number,
    cols: number
): [number,number][] | null {

    // 70% chance: pick random cells (not corners)
    // 30% chance: pick actual corners (keeps some variety)
    const useCorners = Math.random() < 0.3;

    let startPos: [number,number];
    let endPos: [number,number];

    if (useCorners) {
        const corners: [number,number][] = [
            [0, 0], [0, cols-1], [rows-1, 0], [rows-1, cols-1]
        ];
        const shuffled = shuffle(corners);
        startPos = shuffled[0];
        endPos   = shuffled[1];
        let maxDist = -1;
        for (const corner of shuffled) {
            const d = Math.abs(corner[0]-startPos[0]) + Math.abs(corner[1]-startPos[1]);
            if (d > maxDist) { maxDist = d; endPos = corner; }
        }
    } else {
        // Pick start anywhere (edge or interior)
        const allCells: [number,number][] = [];
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                allCells.push([r, c]);

        const shuffledCells = shuffle(allCells);
        startPos = shuffledCells[0];

        // Find end: far from start (at least half the grid away)
        // but NOT necessarily a corner
        const minRequiredDist = Math.floor((rows + cols) / 2);
        const candidates = shuffledCells.filter(([r, c]) => {
            const d = Math.abs(r - startPos[0]) + Math.abs(c - startPos[1]);
            return d >= minRequiredDist;
        });

        endPos = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : shuffledCells[shuffledCells.length - 1];
    }

    const dist = Math.abs(startPos[0] - endPos[0])
               + Math.abs(startPos[1] - endPos[1]);
    if (dist < 2) return null;

    // DFS stays exactly the same below this point
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const path: [number,number][] = [];

    function dfs(r: number, c: number): boolean {
        visited[r][c] = true;
        path.push([r, c]);

        if (r === endPos[0] && c === endPos[1]) return true;

        const dirs = [0, 1, 2, 3];
        const biased = dirs.sort((a, b) => {
            const aScore = -(Math.abs((r+DR[a]) - endPos[0]) + Math.abs((c+DC[a]) - endPos[1]));
            const bScore = -(Math.abs((r+DR[b]) - endPos[0]) + Math.abs((c+DC[b]) - endPos[1]));
            return bScore - aScore;
        });
        const finalDirs = Math.random() < 0.7 ? biased : shuffle(dirs);

        for (const d of finalDirs) {
            const nr = r + DR[d];
            const nc = c + DC[d];
            if (nr < 0 || nr >= rows) continue;
            if (nc < 0 || nc >= cols) continue;
            if (visited[nr][nc]) continue;
            if (dfs(nr, nc)) return true;
        }

        path.pop();
        visited[r][c] = false;
        return false;
    }

    const found = dfs(startPos[0], startPos[1]);
    return found ? path : null;
}




// makeEmptyGrid(3,3) → 3x3 grid all EMPTY ✅
// randInt(0,3)       → random 0,1,2 or 3 ✅
// randomWalk(3,3)    → returns path like
//                      [[0,0],[0,1],[1,1],[2,1],[2,2]] ✅
// START always on edge ✅
// END always on edge, far from START ✅
// DFS backtracks if stuck ✅





// ─── Step 2: Assign Tile Types Along Path ───────────────

function getTileTypeForCell(
    path: [number,number][],
    index: number,
    gridSize: number
): TileType {

    if (index === 0) return TileType.START;
    if (index === path.length - 1) return TileType.END;

    const [pr, pc] = path[index - 1];
    const [cr, cc] = path[index];
    const [nr, nc] = path[index + 1];

    const fromDir = getDirection(pr, pc, cr, cc);
    const toDir   = getDirection(cr, cc, nr, nc);

    // STRAIGHT = same direction continues, OR opposite axis pass-through
    if (fromDir === toDir) {
        return TileType.STRAIGHT;
    }
    if ((fromDir === 0 && toDir === 2) || (fromDir === 2 && toDir === 0) ||
        (fromDir === 1 && toDir === 3) || (fromDir === 3 && toDir === 1)) {
        return TileType.STRAIGHT;
    }

    return TileType.ELBOW;
}





function getDirection(
    r1: number, c1: number,
    r2: number, c2: number
): number {
    if (r2 < r1) return 0; // N
    if (c2 > c1) return 1; // E
    if (r2 > r1) return 2; // S
    if (c2 < c1) return 3; // W
    return -1;
}




function getCorrectRotation(
    type: TileType,
    path: [number,number][],
    index: number
): number {

    if (type === TileType.START || type === TileType.END) {
        // START opens toward next cell
        // END opens toward previous cell
        const [r1, c1] = index === 0
            ? path[0] : path[path.length - 2];
        const [r2, c2] = index === 0
            ? path[1] : path[path.length - 1];

        const dir = index === 0
            ? getDirection(r1, c1, r2, c2)   // START → next
            : getDirection(r2, c2, r1, c1);  // END → prev (reversed)

        // START base opens E(1), rotate so it opens toward dir
        // END base opens W(3), rotate so it opens toward dir
        const baseDir = type === TileType.START ? 1 : 3;
        return ((dir - baseDir) + 4) % 4;
    }

   if (type === TileType.STRAIGHT) {
    const [pr, pc] = path[index - 1];
    const [cr, cc] = path[index];
    const fromDir  = getDirection(pr, pc, cr, cc);
    return (fromDir === 0 || fromDir === 2) ? 0 : 1;
}

    if (type === TileType.ELBOW) {
        const [pr, pc] = path[index - 1];
        const [cr, cc] = path[index];
        const [nnr, nnc] = path[index + 1];
        const fromDir = getDirection(pr, pc, cr, cc);
        const toDir   = getDirection(cr, cc, nnr, nnc);

        // ELBOW base = opens E(1) + S(2)
        // We need it to open fromDir's OPPOSITE + toDir
        const inDir = (fromDir + 2) % 4; // where pipe comes IN from

        // Find rotation so that base[E]=inDir or base[S]=toDir
        // Try all 4 rotations, pick the one that matches
        for (let rot = 0; rot < 4; rot++) {
            const conns = getConnections(TileType.ELBOW, rot);
            if (conns[inDir] && conns[toDir]) return rot;
        }
    }

    return 0;
}

// ─── Step 3: Build Solution Grid ────────────────────────

function buildSolutionGrid(
    path: [number,number][],
    rows: number,
    cols: number,
    gridSize: number
): CellDef[][] {

    const grid = makeEmptyGrid(rows, cols);

    for (let i = 0; i < path.length; i++) {
        const [r, c] = path[i];
        const type   = getTileTypeForCell(path, i, gridSize);
        const rotation = getCorrectRotation(type, path, i);
        grid[r][c] = { type, rotation };
    }

    return grid;
}




// What This Does

// getDirection()
//   → given two adjacent cells
//   → returns which direction you moved (N/E/S/W)

// getTileTypeForCell()
//   → looks at prev + next cell in path
//   → same axis?   → STRAIGHT
//   → different?   → ELBOW (a turn happened)
//   → first cell?  → START
//   → last cell?   → END

// getCorrectRotation()
//   → figures out exact rotation so pipe
//     opens toward correct neighbors
//   → tries all 4 rotations for ELBOW
//     picks the one that connects both ways

// buildSolutionGrid()
//   → puts it all together
//   → returns a SOLVED grid (correct types + rotations)


// Path: [0,0]→[0,1]→[1,1]→[2,1]→[2,2]

// [0,0] START  → opens E        rotation=0
// [0,1] ELBOW  → opens W+S      rotation=1
// [1,1] STRAIGHT → opens N+S    rotation=0
// [2,1] ELBOW  → opens N+E      rotation=3
// [2,2] END    → opens W        rotation=0

// Grid looks like:
// [S→][┐][ ]
// [ ] [│][ ]
// [ ] [└→][E]







// ─── Step 4: Count Minimum Moves ────────────────────────

function countMinMoves(
    solution: CellDef[][],
    scrambled: CellDef[][],
    rows: number,
    cols: number
): number {
    let totalMoves = 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const solCell = solution[r][c];
            const scrCell = scrambled[r][c];

            if (!isRotatable(solCell.type)) continue;

            // How many taps to go from scrambled → solution rotation
            const diff = ((solCell.rotation - scrCell.rotation) + 4) % 4;
            totalMoves += diff;
        }
    }

    return totalMoves;
}

// ─── Step 5: Scramble The Grid ──────────────────────────

function scrambleGrid(
    solution: CellDef[][],
    rows: number,
    cols: number
): CellDef[][] {

    const scrambled: CellDef[][] = solution.map(row =>
        row.map(cell => ({ ...cell }))
    );

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!isRotatable(scrambled[r][c].type)) continue;

            // Give it a random wrong rotation (never correct one)
            const correctRot = solution[r][c].rotation;
            let wrongRot: number;
            do {
                wrongRot = randInt(0, 3);
            } while (wrongRot === correctRot);

            scrambled[r][c].rotation = wrongRot;
        }
    }

    return scrambled;
}

// ─── Step 6: Place Obstacle Tiles ───────────────────────

function placeObstacles(
    grid: CellDef[][],
    path: [number,number][],
    rows: number,
    cols: number,
    gridSize: number
): void {

    const pathSet = new Set(path.map(([r,c]) => `${r},${c}`));
    const fillTiles  = getAllowedPathTiles(gridSize);   // STRAIGHT, ELBOW, TSHAPE...
    const obstacleTiles = getObstacleTiles(gridSize);    // OBSTACLE, CROSS

    // Combine fill options: mostly normal pipe tiles, some obstacles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (pathSet.has(`${r},${c}`)) continue; // skip path cells

            // 25% chance of obstacle/cross (if available), else random pipe tile
            const useObstacle = obstacleTiles.length > 0 && Math.random() < 0.25;

            if (useObstacle) {
                const obsType = obstacleTiles[randInt(0, obstacleTiles.length - 1)];
                grid[r][c] = { type: obsType, rotation: 0 };
            } else {
                const tileType = fillTiles[randInt(0, fillTiles.length - 1)];
                grid[r][c] = { type: tileType, rotation: randInt(0, 3) };
            }
        }
    }
}








// ─── Step 7: Full Level Generator ───────────────────────

function generateSingleLevel(
    id: number,
    gridSize: number,
): LevelDef | null {

    const maxAttempts = gridSize <= 3 ? 80 :
                        gridSize <= 4 ? 120 :
                        gridSize <= 5 ? 150 : 200;

    let failReason = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        const path = randomWalk(gridSize, gridSize);
        if (!path || path.length < 3) { failReason = 'no path found'; continue; }

        const solution = buildSolutionGrid(path, gridSize, gridSize, gridSize);

        const isSolved = checkPath(solution, gridSize, gridSize);
        if (!isSolved) {
            failReason = 'solution not connected';
            if (attempt === 0) {
                console.log('DEBUG path:', JSON.stringify(path));
                console.log('DEBUG solution grid:', JSON.stringify(solution));
            }
            continue;
        }

        const scrambled = scrambleGrid(solution, gridSize, gridSize);
        placeObstacles(scrambled, path, gridSize, gridSize, gridSize);

        const isStillSolved = checkPath(scrambled, gridSize, gridSize);
        if (isStillSolved) { failReason = 'scramble still solved'; continue; }

        const minMoves = countMinMoves(solution, scrambled, gridSize, gridSize);
        if (minMoves === 0) { failReason = 'zero min moves'; continue; }

        const buffer   = getMoveBuffer(gridSize);
        const maxMoves = Math.ceil(minMoves * buffer);

        return { id, gridSize, grid: scrambled, maxMoves, path };
    }

    console.error(
        `Failed to generate level ${id} (${gridSize}x${gridSize}) ` +
        `after ${maxAttempts} attempts. Last reason: ${failReason}`
    );
    return null;
}

// ─── Step 8: Generate N Levels ──────────────────────────

export function generateLevels(n: number): LevelDef[] {
    const levels: LevelDef[] = [];

    // Calculate proportion
    const count3x3 = Math.max(1, Math.round(n * 0.20));
    const count4x4 = Math.max(1, Math.round(n * 0.20));
    const count5x5 = Math.max(1, Math.round(n * 0.20));
    const count6x6 = Math.max(1, n - count3x3 - count4x4 - count5x5);

    const plan = [
        { size: 3, count: count3x3 },
        { size: 4, count: count4x4 },
        { size: 5, count: count5x5 },
        { size: 6, count: count6x6 },
    ];

    let id = 1;
    for (const { size, count } of plan) {
        for (let i = 0; i < count; i++) {
            const level = generateSingleLevel(id, size);
            if (level) {
                levels.push(level);
                id++;
            }
        }
    }

    console.log(`✅ Generated ${levels.length} levels`);
    return levels;
}




// countMinMoves()
//   → compares solution vs scrambled rotation per tile
//   → counts total taps needed = minimum moves

// scrambleGrid()
//   → copies solution grid
//   → randomizes each rotatable tile
//   → guarantees wrong rotation (never matches solution)

// placeObstacles()
//   → finds all NON-path cells
//   → places OBSTACLE/CROSS tiles randomly
//   → never blocks the solution path ✅

// generateSingleLevel()
//   → runs all 7 steps
//   → up to 20 attempts if something goes wrong
//   → returns a clean LevelDef object

// generateLevels(N)
//   → calculates 20/20/20/40 proportion
//   → generates all levels in order
//   → returns array ready for LevelLoader




// generateLevels(10)
//       ↓
// count3x3=2, count4x4=2, count5x5=2, count6x6=4
//       ↓
// For each level:
//   randomWalk()         → get path
//   buildSolutionGrid()  → assign tiles + rotations
//   checkPath()          → verify solution ✅
//   scrambleGrid()       → wrong rotations
//   placeObstacles()     → add stones/cross
//   checkPath()          → verify scrambled ❌
//   countMinMoves()      → count taps needed
//   addBuffer()          → maxMoves = minMoves * 1.25
//       ↓
// Return LevelDef[]