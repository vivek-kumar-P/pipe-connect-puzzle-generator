import { _decorator, Component, Label, Node, Button } from 'cc';
import { SceneManager } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {

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

    // ─── Lifecycle ───────────────────────────────────────

    start() {
        this.endCard.active = false;

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
    }

    // ─── Public Update Methods ───────────────────────────

    public setLevel(id: number, gridSize: number) {
        if (this.levelLabel)
            this.levelLabel.string =
                `Level ${id} (${gridSize}x${gridSize})`;
    }

    public setMoves(n: number) {
        if (this.movesLabel)
            this.movesLabel.string = `Moves: ${n}`;
    }

    public setStatus(text: string) {
        if (this.statusLabel)
            this.statusLabel.string = text;
    }

    public showGameUI() {
        if (this.endCard) this.endCard.active = false;
    }

    public showEndCard(isWin: boolean) {
        if (!this.endCard) return;
        this.endCard.active = true;

        if (isWin) {
            this.endTitle.string    = '🎉 You Fixed It!';
            this.endSubtitle.string = 'Puzzle Complete!';
            this.nextButton.node.active  = true;
            this.retryButton.node.active = false;
        } else {
            this.endTitle.string    = '😔 Out of Moves!';
            this.endSubtitle.string = 'Try again?';
            this.nextButton.node.active  = false;
            this.retryButton.node.active = true;
        }
    }

    // ─── Button Handlers ─────────────────────────────────

    private onNextPressed() {
        SceneManager.goToNextLevel();
    }

    private onRetryPressed() {
        SceneManager.replayCurrentLevel();
    }

    private onMenuPressed() {
        SceneManager.goToLevelSelect();
    }

    // ─── Cleanup ─────────────────────────────────────────

    onDestroy() {
        this.nextButton.node.off(
            Button.EventType.CLICK,
            this.onNextPressed, this
        );
        this.retryButton.node.off(
            Button.EventType.CLICK,
            this.onRetryPressed, this
        );
        this.menuButton.node.off(
            Button.EventType.CLICK,
            this.onMenuPressed, this
        );
    }
}