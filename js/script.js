import { toSubscript } from "./util.mjs";

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

class Tile {
    constructor(i, j) {
        this.i = i;
        this.j = j;
    }

    render() { }
}

class StageTile extends Tile {
    constructor(i, j, fillColor, strokeColor) {
        super(i, j);
        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
    }

    render() {
        ctx.raw.fillStyle = this.fillColor;
        ctx.fillSquare(this.j, this.i, 1);
        ctx.raw.strokeStyle = this.strokeColor;
        ctx.strokeSquare(this.j, this.i, 1);
    }
}

class Floor extends StageTile {
    constructor(i, j) {
        super(i, j, "#f0f0f0", "#d6d6d6");
    }
}

class Wall extends StageTile {
    constructor(i, j) {
        super(i, j, "#858585", "#d6d6d6");
    }
}

class Goal extends StageTile {
    constructor(i, j, targetExpr) {
        super(i, j, "#3ea357", "d6d6d6");
        this.targetExpr = targetExpr;
    }

    static create(targetExpr) {
        return class extends Goal {
            constructor(i, j) {
                super(i, j, targetExpr);
            }
        }
    }
}

class Entity extends Tile {
    move(di, dj) {
        const ni = this.i + di, nj = this.j + dj;

        if (outOfBoard(ni, nj) || stageTable[ni][nj] instanceof Wall) {
            // 行先は画面外 or 壁
            return false;
        }

        if (entityTable[ni][nj] instanceof Empty || entityTable[ni][nj].move(di, dj)) {
            // 移動先に何もないか、押して移動できる
            entityTable[ni][nj] = entityTable[this.i][this.j];
            entityTable[this.i][this.j] = new Empty(this.i, this.j);
            this.i = ni;
            this.j = nj;

            return true;
        } else if (this instanceof Box && entityTable[ni][nj] instanceof Box) {

            // 論理式の合成を試みる
            const combined = combine(this.expr, entityTable[ni][nj].expr);

            if (combined == null) {
                // 合成できない
                return false;
            }

            entityTable[this.i][this.j] = new Empty(this.i, this.j);
            entityTable[ni][nj] = new Box(ni, nj, combined);

            return true;
        }

        // 押せなかった
        return false;
    }
}

class Empty extends Entity { }

class Player extends Entity {
    render() {
        ctx.raw.fillStyle = "blue";
        ctx.fillCircle(this.j + 0.5, this.i + 0.5, 0.4);
    }
}

class Box extends Entity {
    constructor(i, j, expr) {
        super(i, j);
        this.expr = expr;
        this.index = Box.addExprList(expr);
    }

    render() {
        ctx.raw.fillStyle = "red";
        ctx.fillSquare(this.j + 0.1, this.i + 0.1, 0.8);

        ctx.fillText("P" + toSubscript(this.index + 1), "black", this.i, this.j);
    }

    static create(expr) {
        return class extends Box {
            constructor(i, j) {
                super(i, j, expr);
            }
        }
    }

    static addExprList(expr) {
        let index = Box.exprList.indexOf(expr);

        if (index == -1) {
            index = Box.exprList.length;
            Box.exprList.push(expr);

            const li = document.createElement("li");
            const latexText = `P_{${index + 1}} = ${expr.toTeX()}`;

            katex.render(latexText, li, { throwOnError: false, displayMode: false });
            exprListElement.appendChild(li);
        }
        return index;
    }

    static exprList = [];
}

function outOfBoard(i, j) {
    return i < 0 || tableH <= i || j < 0 || tableW <= j;
}

const P1 = Box.create(new Impl(new Var("P"), new Var("Q")));
const P2 = Box.create(new Var("P"));
const P3 = Box.create(new Neg(new Var("Q")));

const G1 = Goal.create(new Contr());

const stageMapping = [Floor, Wall, G1];
const entityMapping = [Empty, Player, P1, P2, P3];

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
    Box.exprList.length = 0;

    render();
}

function redo() {

    if (movingStack.length == 0) return;

    movingStack.pop();

    exprListElement.replaceChildren();
    Box.exprList.length = 0;

    initTable();

    player = findPlayer();
    movingStack.forEach(([di, dj]) => player.move(di, dj));

    render();
}
