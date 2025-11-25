import React from "react";

const Board = ({
  board,
  boardSize,
  validMoves,
  topMoves,
  aiHint,
  showHint,
  currentPlayer,
  gameMode,
  makeHumanMove,
}) => {

  const renderCell = (row, col) => {
    if (!board || !board[row]) return null;

    const cell = board[row][col];

    const isValid = validMoves.some(m => m.row === row && m.col === col);
    const isTopMove = topMoves.some(m => m.move.row === row && m.move.col === col);
    const isHint = showHint && aiHint && aiHint.row === row && aiHint.col === col;

    return (
      <div
        key={`${row}-${col}`}
        onClick={() => {
          if (gameMode === "hvai" && currentPlayer === 1 && isValid) {
            makeHumanMove(row, col);
          }
        }}
        className={`
          aspect-square border-2 border-green-700 flex items-center justify-center
          transition-all duration-200 relative
          ${isValid && gameMode === 'hvai' && currentPlayer === 1 ? 'cursor-pointer hover:bg-green-600 hover:scale-105' : ''}
          ${isTopMove ? 'ring-4 ring-yellow-400' : ''}
          ${isHint ? 'ring-4 ring-blue-400 animate-pulse' : ''}
        `}
        style={{ backgroundColor: '#0a8f4a' }}
      >
        {cell === 1 && (
          <div className="w-4/5 h-4/5 rounded-full bg-gray-900 shadow-lg" />
        )}
        {cell === 2 && (
          <div className="w-4/5 h-4/5 rounded-full bg-white shadow-lg" />
        )}

        {isValid && gameMode === 'hvai' && currentPlayer === 1 && (
          <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-70 animate-pulse" />
        )}

        {isTopMove && (
          <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-1 rounded">
            {topMoves.findIndex(m => m.move.row === row && m.move.col === col) + 1}
          </div>
        )}

        {isHint && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            💡 BEST
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="grid gap-1 mx-auto"
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        maxWidth: `${Math.min(600, boardSize * 60)}px`
      }}
    >
      {board.map((row, i) =>
        row.map((_, j) => renderCell(i, j))
      )}
    </div>
  );
};

export default Board;
