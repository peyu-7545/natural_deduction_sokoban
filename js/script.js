import * as util from "./util.mjs";
import { LogicalExpr as L } from "./logical.mjs";

const tileSize = 32; // tileの一辺の長さ[px]

const fontSize = 0.75; // 文字のデフォルトの大きさ[px/tileSize]
const fontMaxSize = 0.75; // 文字の最大の大きさ[px/tileSize]

class ExpandedContext2D {
    constructor(canvas, unitSize) {
        this.elm = canvas;
        this.raw = canvas.getContext("2d");

        this.raw.scale(unitSize, unitSize);
        // scale()は線の太さも拡大されるので逆数をかけて打ち消す
        this.raw.lineWidth = 1 / unitSize;
    }

    fillSquare(x, y, size) {
        this.raw.fillRect(x, y, size, size);
    }

    strokeSquare(x, y, size) {
        this.raw.strokeRect(x, y, size, size);
    }

    fillCircle(cx, cy, r) {
        this.raw.beginPath();
        this.raw.arc(cx, cy, r, 0, 2 * Math.PI);
        this.raw.fill();
    }

    fillText(text, color, i, j) {

        this.raw.textAlign = "center";
        this.raw.textBaseline = "middle";

        this.raw.font = `bold ${fontSize}px sans-serif`;
        const textWidth = this.raw.measureText(text).width;

        // fontMaxSizeを超えない倍率
        const scale = Math.min(1, fontMaxSize / textWidth);

        this.raw.font = `bold ${fontSize * scale}px sans-serif`;

        this.raw.fillStyle = color;
        this.raw.fillText(text, j + 0.5, i + 0.5);
    }

    clearAll() { this.raw.clearRect(0, 0, this.elm.width, this.elm.height); }
}

const exprListElement = document.getElementById("exprList");

const canvas = document.getElementById("board");
canvas.width = tableW * tileSize;
canvas.height = tableH * tileSize;

const ctx = new ExpandedContext2D(canvas, tileSize);

// Tile: 自身の座標を持ち、描画できるもの
// TS移行時にはInterfaceとして実装するとよさそう
class Tile {
    constructor(i, j) {
        this.i = i;
        this.j = j;
    }

    render() { }
}

class Floor extends Tile {

    static fillColor = "#f0f0f0";
    static strokeColor = "#d6d6d6";

    render() {
        ctx.raw.fillStyle = Floor.fillColor;
        ctx.fillSquare(this.j, this.i, 1);
        ctx.raw.strokeStyle = Floor.strokeColor;
        ctx.strokeSquare(this.j, this.i, 1);
    }
}

class Wall extends Tile {

    static fillColor = "#858585";
    static strokeColor = "#d6d6d6";

    render() {
        ctx.raw.fillStyle = Wall.fillColor;
        ctx.fillSquare(this.j, this.i, 1);
        ctx.raw.strokeStyle = Wall.strokeColor;
        ctx.strokeSquare(this.j, this.i, 1);
    }
}

class Goal extends Tile {

    constructor(i, j, goalExpr) {
        super(i, j);
        this.goalExpr = goalExpr;
        Goal.goals.push(this);
    }

    static fillColor = "#3ea357";
    static strokeColor = "#d6d6d6";

    render() {
        ctx.raw.fillStyle = Goal.fillColor;
        ctx.fillSquare(this.j, this.i, 1);
        ctx.raw.strokeStyle = Goal.strokeColor;
        ctx.strokeSquare(this.j, this.i, 1);
    }

    static create(goalExpr) {
        return class extends Goal {
            constructor(i, j) {
                super(i, j, goalExpr);
            }
        }
    }

    static goals = [];

    static isEveryGoalSatisfied() {
        return Goal.goals.every(goal => {

            const placedEntity = entityTable[goal.i][goal.j];
            return placedEntity instanceof ExprBox && L.equal(placedEntity.expr, goal.goalExpr);
        });
    }
}

class Entity extends Tile {

    move(di, dj) {
        const nextI = this.i + di, nextJ = this.j + dj;

        if (util.outOfGrid(tableH, tableW, nextI, nextJ) || stageTable[nextI][nextJ] instanceof Wall) {
            // 行先は画面外 or 壁
            return false;
        }

        if (entityTable[nextI][nextJ] instanceof Empty || entityTable[nextI][nextJ].move(di, dj)) {
            // 移動先に何もないか、押して移動できる
            entityTable[nextI][nextJ] = entityTable[this.i][this.j];
            entityTable[this.i][this.j] = new Empty(this.i, this.j);
            this.i = nextI;
            this.j = nextJ;

            return true;
        }

        if (this instanceof ExprBox && entityTable[nextI][nextJ] instanceof ExprBox) {

            console.log(entityTable[nextI][nextJ].expr);

            // 論理式の合成を試みる
            const combined = L.combine(this.expr, entityTable[nextI][nextJ].expr);

            if (combined == null) {
                // 合成できない
                return false;
            }

            entityTable[this.i][this.j] = new Empty(this.i, this.j);
            entityTable[nextI][nextJ] = new (ExprBox.create(combined))(nextI, nextJ);

            return true;
        }

        return false;
    }
}

class Empty extends Entity { }

class Player extends Entity {
    render() {
        ctx.raw.fillStyle = "blue";
        ctx.fillCircle(this.j + 0.5, this.i + 0.5, 0.4);
    }

    move(di, dj) {
        // 背後の座標を記録
        const backI = this.i - di, backJ = this.j - dj;

        const ok = super.move(di, dj);
        if (!ok) return false;

        // 背後が箱なら、split()を実行する

        if (util.outOfGrid(tableH, tableW, backI, backJ) || stageTable[backI][backJ] instanceof Wall) {
            return;
        }


        if (entityTable[backI][backJ] instanceof ExprBox) {
            console.log(entityTable[backI][backJ]);
        }
    }
}

class ExprBox extends Entity {

    render() {
        ctx.raw.fillStyle = "red";
        ctx.fillSquare(this.j + 0.1, this.i + 0.1, 0.8);

        ctx.fillText("P" + util.toSubscript(this.exprIndex + 1), "black", this.i, this.j);
    }

    static create(expr) {

        const index = ExprBox.addExprList(expr);
        return class extends ExprBox {
            constructor(i, j) {
                super(i, j);
                this.expr = expr;
                this.exprIndex = index;
            }
        }
    }

    static addExprList(expr) {
        let exprIndex = ExprBox.exprList.findIndex(e => L.equal(e, expr));

        if (exprIndex == -1) {
            exprIndex = ExprBox.exprList.length;
            ExprBox.exprList.push(expr);

            // 多分ここらへんのコードは別のクラスに任せるべき
            const li = document.createElement("li");
            const latexText = `P_{${exprIndex + 1}} = ${expr.toTex()}`;

            katex.render(latexText, li, { throwOnError: false, displayMode: false });
            exprListElement.appendChild(li);
        }

        return exprIndex;
    }

    static exprList = [];
}

const P1 = ExprBox.create(L.and(L.var("P"), L.var("Q")));

const G1 = Goal.create(L.contr());

const stageMapping = [Floor, Wall, G1];
const entityMapping = [Empty, Player, P1];

function createTable(data, mapping) {
    return data.map((line, i) => line.map((tile, j) => new mapping[tile](i, j)));
}

let stageTable, entityTable;

function initTable() {
    stageTable = createTable(stageData, stageMapping);
    entityTable = createTable(entityData, entityMapping);
}

function findPlayer() {
    let player;
    entityTable.forEach(line => line.forEach(tile => { if (tile instanceof Player) player = tile; }));
    return player;
}

const downedArrows = new Set();
let currentDirection;

function update() {

    if (downedKeys.has("r")) {
        reset();
        return;
    }
    if (downedKeys.has("z")) {
        redo()
        return;
    }

    let di = 0, dj = 0;

    switch (currentDirection) {
        case "ArrowUp": di--; break;
        case "ArrowDown": di++; break;
        case "ArrowLeft": dj--; break;
        case "ArrowRight": dj++; break;
    }

    if (di != 0 || dj != 0) {
        if (player.move(di, dj)) {
            movingStack.push([di, dj]);
        }
    }
}

function render() {

    ctx.clearAll();

    stageTable.forEach((line, i) => {
        line.forEach((tile, j) => {
            tile.render();
        });
    });

    entityTable.forEach((line, i) => {
        line.forEach((tile, j) => {
            tile.render();
        });
    });
}

document.addEventListener("keydown", e => {
    downedKeys.add(e.key);

    if (e.key.startsWith("Arrow")) {
        // 方向キーが押された
        downedArrows.add(e.key);
        currentDirection = e.key;
    }

    update();
    render();

    if (Goal.isEveryGoalSatisfied()) {
        // 全てのgoalが満たされたのでクリア
    }
});

document.addEventListener("keyup", e => {
    downedKeys.delete(e.key);

    if (e.key.startsWith("Arrow")) {
        // 方向キーが離された
        downedArrows.delete(e.key);
        currentDirection = Array.from(downedArrows).pop();
    }
});

const downedKeys = new Set();
const movingStack = [];

initTable();
let player = findPlayer();
update();
render();

function reset() {

    initTable();

    player = findPlayer();
    movingStack.length = 0;

    exprListElement.replaceChildren();
    ExprBox.exprList.length = 0;

    render();
}

function redo() {

    if (movingStack.length == 0) return;

    movingStack.pop();

    exprListElement.replaceChildren();
    ExprBox.exprList.length = 0;

    initTable();

    player = findPlayer();
    movingStack.forEach(([di, dj]) => player.move(di, dj));

    render();
}
