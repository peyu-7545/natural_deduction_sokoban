class Expr { }

class BinaryOp extends Expr {
    constructor(left, right, op) {
        super();
        this.left = left;
        this.right = right;
        this.op = op;
    }

    toTeX() {
        let res = "";
        if (this.left instanceof BinaryOp) res += "(" + this.left.toTeX() + ")";
        else res += this.left.toTeX();
        res += " " + this.op + " ";
        if (this.right instanceof BinaryOp) res += "(" + this.right.toTeX() + ")";
        else res += this.right.toTeX();
        return res;
    }
}

class AND extends BinaryOp {
    constructor(left, right) {
        super(left, right, "\\land");
    }
}

class OR extends BinaryOp {
    constructor(left, right) {
        super(left, right, "\\and");
    }
}

class Impl extends BinaryOp {
    constructor(left, right) {
        super(left, right, "\\implies");
    }
}

class Neg extends Expr {
    constructor(expr) {
        super();
        this.expr = expr;
    }

    toTeX() { return "\\lnot " + this.expr.toTeX(); }
}

class Contr extends Expr {
    toTeX() { return "\\bot"; }
}

class Var extends Expr {
    constructor(symbol) {
        super();
        this.symbol = symbol;
    }

    toTeX() { return this.symbol; }
}

function equal(A, B) {
    return JSON.stringify(A) == JSON.stringify(B);
}

function combine(A, B) {

    if (A instanceof Impl && equal(A.left, B)) {
        return A.right;
    }

    if (B instanceof Impl && equal(B.left, A)) {
        return B.right;
    }

    if (equal(A, new Neg(B)) || equal(new Neg(A), B)) {
        return new Contr();
    }

    if (A instanceof Impl && equal(new Neg(A.right), B)) {
        return new Neg(A.left);
    }

    if (B instanceof Impl && equal(new Neg(B.right), A)) {
        return new Neg(B.left);
    }

    return null;
}