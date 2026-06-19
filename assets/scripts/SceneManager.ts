import { director } from 'cc';
import { LevelLoader } from './LevelLoader';

// Scene names must match EXACTLY your Cocos scene file names
const SCENES = {
    START:        'StartScene',
    LEVEL_SELECT: 'LevelSelectScene',
    GAME:         'GameScene',
} as const;

class SceneManagerClass {

    // ─── Navigation ──────────────────────────────────────

    public goToStart(): void {
        LevelLoader.reset();
        director.loadScene(SCENES.START);
    }

    public goToLevelSelect(): void {
        if (!LevelLoader.isReady()) {
            console.error('LevelLoader not ready! Generate levels first.');
            return;
        }
        director.loadScene(SCENES.LEVEL_SELECT);
    }

    public goToGame(levelIndex: number): void {
        if (!LevelLoader.isReady()) {
            console.error('LevelLoader not ready!');
            return;
        }
        LevelLoader.setCurrentLevel(levelIndex);
        director.loadScene(SCENES.GAME);
    }

    public goToNextLevel(): void {
        const hasNext = LevelLoader.goToNextLevel();
        if (hasNext) {
            director.loadScene(SCENES.GAME);
        } else {
            // No more levels → back to level select
            console.log('All levels complete!');
            director.loadScene(SCENES.LEVEL_SELECT);
        }
    }

    public replayCurrentLevel(): void {
        director.loadScene(SCENES.GAME);
    }

    // ─── Info ─────────────────────────────────────────────

    public getCurrentSceneName(): string {
        return director.getScene()?.name ?? 'unknown';
    }
}

// Export as singleton
export const SceneManager = new SceneManagerClass();



// What This Does
// SceneManager.goToStart()
//   → resets LevelLoader
//   → loads StartScene

// SceneManager.goToLevelSelect()
//   → checks levels are ready
//   → loads LevelSelectScene

// SceneManager.goToGame(3)
//   → sets current level to index 3
//   → loads GameScene

// SceneManager.goToNextLevel()
//   → increments level index
//   → loads GameScene again
//   → if no more levels → goes to LevelSelect

// SceneManager.replayCurrentLevel()
//   → reloads GameScene (same level)

// How Every Scene Uses It
// StartScene:
//   → user enters N → hits Start
//   → LevelLoader.generate(N)
//   → SceneManager.goToLevelSelect()

// LevelSelectScene:
//   → user taps Level 3 button
//   → SceneManager.goToGame(2) ← index is N-1

// GameScene Win:
//   → SceneManager.goToNextLevel()

// GameScene Lose:
//   → SceneManager.replayCurrentLevel()

// Any scene back button:
//   → SceneManager.goToLevelSelect()

// Full Scene Flow
// StartScene
//   ↓ goToLevelSelect()
// LevelSelectScene
//   ↓ goToGame(index)
// GameScene
//   ↓ win → goToNextLevel()    → GameScene (next)
//   ↓ lose → replayCurrentLevel() → GameScene (same)
//   ↓ back → goToLevelSelect() → LevelSelectScene

// ⚠️ Important Cocos Note
// The scene names in the code must exactly match your Cocos scene file names:
// 'StartScene'       ← must match StartScene.scene
// 'LevelSelectScene' ← must match LevelSelectScene.scene
// 'GameScene'        ← must match GameScene.scene
// Check your scene names in Cocos Assets panel now and confirm they match ✅

