import { LevelDef, generateLevels } from './LevelGenerator';

// Singleton — holds all levels in memory
class LevelLoaderClass {

    private levels: LevelDef[] = [];
    private totalLevels: number = 0;
    private currentLevelIndex: number = 0;

    // ─── Generate and Store ──────────────────────────────

    public generate(n: number): void {
        console.log(`Generating ${n} levels...`);
        this.levels       = generateLevels(n);
        this.totalLevels  = this.levels.length;
        this.currentLevelIndex = 0;
        console.log(`✅ LevelLoader ready: ${this.totalLevels} levels`);
    }

    // ─── Getters ─────────────────────────────────────────

    public getLevel(index: number): LevelDef | null {
        if (index < 0 || index >= this.levels.length) {
            console.error(`Level index ${index} out of range`);
            return null;
        }
        return this.levels[index];
    }

    public getCurrentLevel(): LevelDef | null {
        return this.getLevel(this.currentLevelIndex);
    }

    public getAll(): LevelDef[] {
        return this.levels;
    }

    public getTotalLevels(): number {
        return this.totalLevels;
    }

    public getCurrentIndex(): number {
        return this.currentLevelIndex;
    }

    // ─── Navigation ──────────────────────────────────────

    public setCurrentLevel(index: number): void {
        if (index < 0 || index >= this.totalLevels) return;
        this.currentLevelIndex = index;
    }

    public hasNextLevel(): boolean {
        return this.currentLevelIndex < this.totalLevels - 1;
    }

    public goToNextLevel(): boolean {
        if (!this.hasNextLevel()) return false;
        this.currentLevelIndex++;
        return true;
    }

    public reset(): void {
        this.levels            = [];
        this.totalLevels       = 0;
        this.currentLevelIndex = 0;
    }

    // ─── Info ─────────────────────────────────────────────

    public isReady(): boolean {
        return this.levels.length > 0;
    }

    public getGridSize(index: number): number {
        const level = this.getLevel(index);
        return level ? level.gridSize : 4;
    }

    public getSummary(): string {
        const counts = { 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const l of this.levels) {
            counts[l.gridSize as 3|4|5|6]++;
        }
        return `Total: ${this.totalLevels} | ` +
               `3x3: ${counts[3]} | ` +
               `4x4: ${counts[4]} | ` +
               `5x5: ${counts[5]} | ` +
               `6x6: ${counts[6]}`;
    }
}

// Export as singleton
export const LevelLoader = new LevelLoaderClass();




// What This Does

// LevelLoader.generate(N)
//   → calls generateLevels(N) from LevelGenerator
//   → stores all levels in memory
//   → ready to serve levels instantly

// LevelLoader.getLevel(3)
//   → returns level at index 3

// LevelLoader.getCurrentLevel()
//   → returns whichever level player is on

// LevelLoader.goToNextLevel()
//   → increments index
//   → returns false if no more levels

// LevelLoader.getSummary()
//   → "Total: 10 | 3x3: 2 | 4x4: 2 | 5x5: 2 | 6x6: 4"
//   → useful for debugging


// How Other Scripts Use It

// // StartScene → after player enters N
// LevelLoader.generate(10);

// // LevelSelectScene → show all levels
// const all = LevelLoader.getAll();

// // GameScene → load specific level
// const level = LevelLoader.getLevel(index);

// // Win card → go to next level
// LevelLoader.goToNextLevel();
// const next = LevelLoader.getCurrentLevel();


// Singleton Pattern — Why?
// ❌ Without singleton:
//    StartScene creates LevelLoader
//    GameScene creates NEW LevelLoader → empty!
//    Levels lost between scenes

// ✅ With singleton:
//    One instance shared across ALL scenes
//    Generate once in StartScene
//    Access anywhere in game
//    Levels persist between scene switches