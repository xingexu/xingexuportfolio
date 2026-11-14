export const CHESS_PIECES = {
  p: ["0000000","0011100","0011100","0001000","0011100","0011100","0011100","0111110","1111111"],
  r: ["1010101","1111111","0111110","0011100","0011100","0011100","0111110","0111110","1111111"],
  n: ["0010100","0011110","0111110","1111010","1110000","0011100","0111100","0111110","1111111"],
  b: ["0001000","0011100","0010100","0011100","0001000","0011100","0011100","0111110","1111111"],
  q: ["1001001","1101011","0111110","0111110","0011100","0011100","0111110","0111110","1111111"],
  k: ["0001000","0011100","0001000","0111110","0011100","0011100","0111110","0111110","1111111"],
} as const;
export type ChessPiece = keyof typeof CHESS_PIECES;
export const chessPieceAt = (row: number, column: number): { piece: ChessPiece; white: boolean } | null => {
  const back: ChessPiece[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  if (row === 0 || row === 7) return { piece: back[column], white: row === 7 };
  if (row === 1 || row === 6) return { piece: "p", white: row === 6 };
  return null;
};
export const chessPiecePath = (piece: ChessPiece) => CHESS_PIECES[piece].flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === "1" ? [`M${x} ${y}h1v1h-1z`] : [])).join("");

export function paintChessboard(ctx: CanvasRenderingContext2D, x: number, y: number, square = 12) {
  ctx.fillStyle = "#574532"; ctx.fillRect(x - 4, y - 4, square * 8 + 8, square * 8 + 8);
  ctx.fillStyle = "#bd9b65"; ctx.fillRect(x - 2, y - 2, square * 8 + 4, square * 8 + 4);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const xx = x + col * square, yy = y + row * square;
    ctx.fillStyle = (row + col) % 2 ? "#647565" : "#e5d5ad"; ctx.fillRect(xx, yy, square, square);
    const piece = chessPieceAt(row, col);
    if (!piece) continue;
    const px = xx + Math.floor((square - 7) / 2), py = yy + Math.floor((square - 9) / 2);
    const pixels = CHESS_PIECES[piece.piece];
    for (const [ox, oy] of [[-1,0],[1,0],[0,-1],[0,1],[0,0]]) {
      ctx.fillStyle = ox || oy ? (piece.white ? "#86765a" : "#b8b396") : (piece.white ? "#fff2cf" : "#25333b");
      pixels.forEach((line, sy) => [...line].forEach((value, sx) => { if (value === "1") ctx.fillRect(px + sx + ox, py + sy + oy, 1, 1); }));
    }
  }
}
