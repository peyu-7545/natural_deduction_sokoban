export class LogicalExpr {
    constructor(priority) {
        this.priority = priority;
    }

    toTex() {

        if (this instanceof LogicalSymbol) {
            // 記号
            return this.symbol;
        }

        if (this.operands.length == 1) {
            // 単項
            let inner = this.operands[0].toTex();
            if (this.priority > this.operands[0].priority) inner = `(${inner})`;
            return `${this.operator} ${inner}`;
        }

        else {
            // 2項
            let leftInner = this.operands[0].toTex();
            if (this.priority > this.operands[0].priority) leftInner = `(${leftInner})`;

            let rightInner = this.operands[1].toTex();
            if (this.priority > this.operands[1].priority) rightInner = `(${rightInner})`;

            return `${leftInner} ${this.operator} ${rightInner}`;
        }
    }

    static equal(A, B) {
        return JSON.stringify(A) == JSON.stringify(B);
    }

    static combine(A, B) {

        if (A instanceof IMPL && this.equal(A.operands[0], B)) {
            return A.operands[1];
        }

        if (B instanceof IMPL && this.equal(B.operands[0], A)) {
            return B.operands[1];
        }

        if (this.equal(A, this.not(B))) {
            return this.contr();
        }

        if (this.equal(this.not(A), B)) {
            return this.contr();
        }

        return this.and(A, B);
    }

    static not = (x) => new NOT(x);
    static and = (l, r) => new AND(l, r);
    static or = (l, r) => new OR(l, r);
    static impl = (l, r) => new IMPL(l, r);
    static var = (x) => new VAR(x);
    static contr = () => new CONTR();
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

class VAR extends LogicalSymbol {
    constructor(symbol) {
        super(symbol, 4);
    }
}

class CONTR extends LogicalSymbol {
    constructor() {
        super("\\bot", 4);
    }
}