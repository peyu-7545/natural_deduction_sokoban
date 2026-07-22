class LogicalExpr {
    constructor(priority) {
        this.priority = priority;
    }
}

class LogicalOperator extends LogicalExpr {
    constructor(operands, operator, priority) {
        super(priority);
        this.operands = operands;
        this.operator = operator;
    }
}

class LogicalSymbol extends LogicalExpr {
    constructor(symbol, priority) {
        super(priority);
        this.symbol = symbol;
    }
}

class NOT extends LogicalOperator {
    constructor(x) {
        super([x], "\\lnot", 3);
    }
}

class AND extends LogicalOperator {
    constructor(left, right) {
        super([left, right], "\\land", 2);
    }
}

class OR extends LogicalOperator {
    constructor(left, right) {
        super([left, right], "\\lor", 1);
    }
}

class IMPL extends LogicalOperator {
    constructor(left, right) {
        super([left, right], "\\rightarrow", 0);
    }
}

class V extends LogicalSymbol {
    constructor(symbol) {
        super(symbol, 4);
    }
}

class CONTR extends LogicalSymbol {
    constructor() {
        super("\\bot", 4);
    }
}

const not = (x) => new NOT(x);
const and = (left, right) => new AND(left, right);
const or = (left, right) => new OR(left, right);
const impl = (left, right) => new IMPL(left, right);
const v = (symbol) => new V(symbol);
const contr = () => new CONTR();

function toTex(ast) {

    if (ast instanceof LogicalSymbol) {
        // 記号
        return ast.symbol;
    }

    if (ast.operands.length == 1) {
        // 単項

        let inner = toTex(ast.operands[0]);
        if (ast.priority > ast.operands[0].priority) inner = `(${inner})`;
        return `${ast.operator} ${inner}`;

    } else {
        // 2項

        let leftInner = toTex(ast.operands[0]);
        if (ast.priority > ast.operands[0].priority) leftInner = `(${leftInner})`;

        let rightInner = toTex(ast.operands[1]);
        if (ast.priority > ast.operands[1].priority) rightInner = `(${rightInner})`;

        return `${leftInner} ${ast.operator} ${rightInner}`;

    }
}

function equal(A, B) {
    return JSON.stringify(A) == JSON.stringify(B);
}

function combine(A, B) {

    if (A instanceof IMPL && equal(A.operands[0], B)) return A.operands[1];
    if (B instanceof IMPL && equal(B.operands[0], A)) return B.operands[1];
    if (equal(A, not(B))) return contr();
    if (equal(not(A), B)) return contr();
}

export { not, and, or, impl, v, contr, toTex, equal, combine };