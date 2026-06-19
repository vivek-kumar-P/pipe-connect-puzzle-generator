import { _decorator, Component, Button, Label, Node } from 'cc';
import { LevelLoader } from './LevelLoader';
import { SceneManager } from './SceneManager';
import { GridRenderer } from './GridRenderer';
import { UIManager } from './UIManager';
import { checkPath } from './PathChecker';
import { TileType, isRotatable } from './TileData';

const { ccclass, property } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {

    @property(Node)
    gridNode: Node = null!;

    @property(Label)
    levelLabel: Label = null!;

    @property(Label)
    movesLabel: Label = null!;

    @property(Label)
    statusLabel: Label = null!;

    @property(Node)
    endCard: Node = null!;

    @property(Label)
    endTitle: Label = null!;

    @property(Label)
    endSubtitle: Label = null!;

    @property(Button)
    nextButton: Button = null!;

    @property(Button)
    retryButton: Button = null!;

    @property(Button)
    menuButton: Button = null!;

    @property(Button)
    exitButton: Button = null!;

    // ─── State ───────────────────────────────────────────

    private movesLeft: number  = 0;
    private gameOver: boolean  = false;
    private gridRenderer: GridRenderer = null!;

    // ─── Lifecycle ───────────────────────────────────────

    start() {
        // Hide end card
        this.endCard.active = false;

        // Get or add GridRenderer
        this.gridRenderer = this.gridNode.getComponent(GridRenderer)
                         || this.gridNode.addComponent(GridRenderer);

        // Wire buttons
        this.nextButton.node.on(
            Button.EventType.CLICK,
            this.onNextPressed, this
        );
        this.retryButton.node.on(
            Button.EventType.CLICK,
            this.onRetryPressed, this
        );
        this.menuButton.node.on(
            Button.EventType.CLICK,
            this.onMenuPressed, this
        );

        if (this.exitButton?.node) {
        this.exitButton.node.on(
        Button.EventType.CLICK,
        this.onExitPressed,
        this
    );
}

        // Load current level
        this.loadLevel();
    }

    // ─── Load Level ──────────────────────────────────────

    private loadLevel() {
        const level = LevelLoader.getCurrentLevel();
        if (!level) {
            console.error('No level found!');
            return;
        }

        // Set state
        this.movesLeft = level.maxMoves;
        this.gameOver  = false;

        // Update UI
        this.levelLabel.string = `Level ${level.id}`;
        this.movesLabel.string = `Moves: ${this.movesLeft}`;
        this.statusLabel.string = 'Not connected yet';
        this.endCard.active     = false;

        // Init grid renderer
        this.gridRenderer.init(
            level.grid,
            level.gridSize,
            this.onTileTap.bind(this)
        );

        console.log(`Loaded Level ${level.id} | ` +
                    `${level.gridSize}x${level.gridSize} | ` +
                    `MaxMoves: ${level.maxMoves}`);
    }

    // ─── Tile Tap ────────────────────────────────────────

    private onTileTap(r: number, c: number) {
        if (this.gameOver) return;

        const level = LevelLoader.getCurrentLevel()!;
        const cell  = level.grid[r][c];

        // Ignore non-rotatable tiles
        if (!isRotatable(cell.type)) return;

        // Rotate
        cell.rotation = (cell.rotation + 1) % 4;
        this.gridRenderer.updateCell(r, c);

        // Decrement moves
        this.movesLeft--;
        this.movesLabel.string = `Moves: ${this.movesLeft}`;

        // Check win
        const connected = checkPath(
            level.grid,
            level.gridSize,
            level.gridSize
        );

        if (connected) {
            this.gameOver = true;
            this.statusLabel.string = 'Connected! 🎉';
            this.scheduleOnce(() => this.showEndCard(true), 1.0);
            return;
        }

        // Check lose
        if (this.movesLeft <= 0) {
            this.gameOver = true;
            this.statusLabel.string = 'Out of moves!';
            this.scheduleOnce(() => this.showEndCard(false), 0.8);
            return;
        }

        // Update status
        this.statusLabel.string = 'Not connected yet';
    }

    // ─── End Card ────────────────────────────────────────

    private showEndCard(isWin: boolean) {
        this.endCard.active = true;

        if (isWin) {
            this.endTitle.string    = '🎉 You Fixed It!';
            this.endSubtitle.string = 'Puzzle Complete!';
            // Hide retry on win
            this.retryButton.node.active = false;
        } else {
            this.endTitle.string    = '😔 Out of Moves!';
            this.endSubtitle.string = 'Try again?';
            // Hide next on lose
            this.nextButton.node.active = false;
        }
    }

    // ─── Button Handlers ─────────────────────────────────

    private onNextPressed() {
        SceneManager.goToNextLevel();
    }

    private onExitPressed() {
    SceneManager.goToLevelSelect();
    }

    private onRetryPressed() {
        SceneManager.replayCurrentLevel();
    }

    private onMenuPressed() {
        SceneManager.goToLevelSelect();
    }

    // ─── Cleanup ─────────────────────────────────────────

    onDestroy() {
    if (this.nextButton?.node) {
        this.nextButton.node.off(
            Button.EventType.CLICK,
            this.onNextPressed, this
        );
    }
    if (this.retryButton?.node) {
        this.retryButton.node.off(
            Button.EventType.CLICK,
            this.onRetryPressed, this
        );
    }
    if (this.menuButton?.node) {
        this.menuButton.node.off(
            Button.EventType.CLICK,
            this.onMenuPressed, this
        );
    }

    if (this.exitButton?.node) {
    this.exitButton.node.off(
        Button.EventType.CLICK,
        this.onExitPressed, this
    );
    }
}
}