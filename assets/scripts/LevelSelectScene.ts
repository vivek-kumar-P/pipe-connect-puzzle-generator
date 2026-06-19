import { _decorator, Component, Button, Label,
         Node, Layout, UITransform, Color } from 'cc';
import { LevelLoader } from './LevelLoader';
import { SceneManager } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('LevelSelectScene')
export class LevelSelectScene extends Component {

    @property(Label)
    titleLabel: Label = null!;

    @property(Node)
    content: Node = null!;

    @property(Button)
    backButton: Button = null!;

    start() {
        if (this.backButton?.node) {
            this.backButton.node.on(
                Button.EventType.CLICK,
                this.onBackPressed,
                this
            );
        }

        if (this.titleLabel) {
            this.titleLabel.string = 'Select Level';
        }

        this.buildLevelButtons();
    }

    private buildLevelButtons() {
        if (!this.content) {
            console.error('Content node is null!');
            return;
        }

        const total  = LevelLoader.getTotalLevels();
        const levels = LevelLoader.getAll();

        console.log(`Building ${total} level buttons...`);

        // Clear existing children except "item"
        const children = this.content.children.slice();
        for (const child of children) {
            if (child.name !== 'item') child.destroy();
        }

        // Setup layout
        let layout = this.content.getComponent(Layout);
        if (!layout) layout = this.content.addComponent(Layout);

        layout.type          = Layout.Type.GRID;
        layout.spacingX      = 15;
        layout.spacingY      = 15;
        layout.paddingTop    = 15;
        layout.paddingBottom = 15;
        layout.paddingLeft   = 15;
        layout.paddingRight  = 15;
        layout.constraint    = Layout.Constraint.FIXED_COL;
        layout.constraintNum = 4;

        // Calculate content height
        const rows     = Math.ceil(total / 4);
        const btnSize  = 100;
        const spacing  = 15;
        const padding  = 30;
        const contentH = Math.max(
            600,
            rows * (btnSize + spacing) + padding * 2
        );

        // Resize content node
        let contentTF = this.content.getComponent(UITransform);
        if (!contentTF) {
            contentTF = this.content.addComponent(UITransform);
        }
        contentTF.setContentSize(440, contentH);

        console.log(`Content size set to 440 x ${contentH}`);

        // Build buttons
        for (let i = 0; i < total; i++) {
            const level = levels[i];

            const btnNode = new Node(`LevelBtn_${i}`);
            this.content.addChild(btnNode);

            const tf = btnNode.addComponent(UITransform);
            tf.setContentSize(100, 100);

            btnNode.addComponent(Button);

            const labelNode = new Node('Label');
            btnNode.addChild(labelNode);

            const ltf = labelNode.addComponent(UITransform);
            ltf.setContentSize(100, 100);

            const lbl      = labelNode.addComponent(Label);
            lbl.string     = `${i + 1}\n${level.gridSize}x${level.gridSize}`;
            lbl.fontSize   = 32;
            lbl.isBold     = true;
            lbl.lineHeight = 38;
            lbl.color      = this.getColorForSize(level.gridSize);

            const index = i;
            btnNode.on(
                Node.EventType.TOUCH_END,
                () => this.onLevelPressed(index),
                this
            );
        }

        console.log(`✅ Built ${total} buttons`);
    }

    private getColorForSize(size: number): Color {
        switch(size) {
            case 3:  return new Color(100, 220, 100, 255);
            case 4:  return new Color(100, 180, 255, 255);
            case 5:  return new Color(255, 200, 100, 255);
            case 6:  return new Color(255, 100, 100, 255);
            default: return new Color(255, 255, 255, 255);
        }
    }

    private onLevelPressed(index: number) {
        console.log(`Level ${index + 1} selected`);
        SceneManager.goToGame(index);
    }

    private onBackPressed() {
        SceneManager.goToStart();
    }

    onDestroy() {
        if (this.backButton?.node) {
            this.backButton.node.off(
                Button.EventType.CLICK,
                this.onBackPressed,
                this
            );
        }
    }
}