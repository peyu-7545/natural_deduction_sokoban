export function toSubscript(num) {
    return String(num).split("").map(digit => "₀₁₂₃₄₅₆₇₈₉"[digit]).join("");
}