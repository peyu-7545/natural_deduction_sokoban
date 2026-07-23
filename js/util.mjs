export function toSubscript(num) {
    return String(num).split("").map(digit => "₀₁₂₃₄₅₆₇₈₉"[digit]).join("");
}

export function outOfGrid(h, w, i, j) {
    return i < 0 || h <= i || j < 0 || w <= j;
}