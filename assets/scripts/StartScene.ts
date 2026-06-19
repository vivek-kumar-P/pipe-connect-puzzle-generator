import { _decorator, Component, EditBox, Button, Node } from 'cc';
import { LevelLoader } from './LevelLoader';
import { SceneManager } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('StartScene')
export class StartScene extends Component {

    @property(EditBox)
    inputField: EditBox = null!;

    @property(Button)
    startButton: Button = null!;

    start() {
        if (this.startButton) {
            this.startButton.node.on(
                Button.EventType.CLICK,
                this.onStartPressed,
                this
            );
        }
    }

    private onStartPressed() {
    const raw = this.inputField?.string.trim();
    const n   = parseInt(raw);

    if (isNaN(n) || n < 1) {
        console.warn('Please enter a valid number!');
        return;
    }

    // Cap at 500 max
    const capped = Math.min(n, 500);

    if (n > 500) {
        console.warn(`Capped to 500 levels`);
    }

    console.log(`Generating ${capped} levels...`);
    LevelLoader.generate(capped);
    SceneManager.goToLevelSelect();
}

    onDestroy() {
        // Safe null check before removing listener
        if (this.startButton && this.startButton.node) {
            this.startButton.node.off(
                Button.EventType.CLICK,
                this.onStartPressed,
                this
            );
        }
    }
}