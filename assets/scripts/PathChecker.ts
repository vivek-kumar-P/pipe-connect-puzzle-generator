import { CellDef, TileType, getConnections } from './TileData';

// N, E, S, W
const DR = [-1, 0, 1, 0];
const DC = [ 0, 1, 0,-1];

function findTile(
    grid: CellDef[][],
    type: TileType,
    rows: number,
    cols: number
): [number, number] | null {
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c].type === type) return [r, c];
    return null;
}

export function checkPath(
    grid: CellDef[][],
    rows: number,
    cols: number
): boolean {
    const start = findTile(grid, TileType.START, rows, cols);
    if (!start) return false;

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue: [number, number][] = [start];
    visited[start[0]][start[1]] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        const cell = grid[r][c];

        // Found END (and its not START)
        if (cell.type === TileType.END &&
            !(r === start[0] && c === start[1])) {
            return true;
        }

        // OBSTACLE → skip, no connections
        if (cell.type === TileType.OBSTACLE) continue;

        const conns = getConnections(cell.type, cell.rotation);

        for (let d = 0; d < 4; d++) {
            if (!conns[d]) continue;

            const nr = r + DR[d];
            const nc = c + DC[d];

            // Out of bounds
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (visited[nr][nc]) continue;

            const neighbor = grid[nr][nc];

            // OBSTACLE blocks path
            if (neighbor.type === TileType.OBSTACLE) continue;

            const nConns   = getConnections(neighbor.type, neighbor.rotation);
            const opposite = (d + 2) % 4;

            // Both tiles must open toward each other
            if (nConns[opposite]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        }
    }
    return false;
}

// Returns the full path as coordinates if connected
// Used by LevelGenerator to highlight solution
export function getPath(
    grid: CellDef[][],
    rows: number,
    cols: number
): [number, number][] | null {
    const start = findTile(grid, TileType.START, rows, cols);
    if (!start) return null;

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent  = Array.from({ length: rows }, () =>
                    Array<[number,number] | null>(cols).fill(null));
    const queue: [number, number][] = [start];
    visited[start[0]][start[1]] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        const cell = grid[r][c];

        if (cell.type === TileType.END &&
            !(r === start[0] && c === start[1])) {

            // Trace back path from END to START
            const path: [number,number][] = [];
            let cur: [number,number] | null = [r, c];
            while (cur) {
                path.unshift(cur);
                cur = parent[cur[0]][cur[1]];
            }
            return path;
        }

        if (cell.type === TileType.OBSTACLE) continue;

        const conns = getConnections(cell.type, cell.rotation);

        for (let d = 0; d < 4; d++) {
            if (!conns[d]) continue;
            const nr = r + DR[d];
            const nc = c + DC[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (visited[nr][nc]) continue;
            if (grid[nr][nc].type === TileType.OBSTACLE) continue;

            const nConns   = getConnections(grid[nr][nc].type, grid[nr][nc].rotation);
            const opposite = (d + 2) % 4;

            if (nConns[opposite]) {
                visited[nr][nc] = true;
                parent[nr][nc]  = [r, c];
                queue.push([nr, nc]);
            }
        }
    }
    return null;
}