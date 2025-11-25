import React, { useState, useEffect } from "react";
import { LogOut } from 'lucide-react';

const DEFAULT_COLORS = {
  empty: "#0a8f4a",
  black: "#111317",
  white: "#ffffff",
};

const BoardEditor = ({ initialSize = 8, apiUrl = "http://localhost:5000" }) => {
  const [size, setSize] = useState(initialSize);
  const [board, setBoard] = useState([]);
  const [player, setPlayer] = useState(1); // Black starts
  const [topMoves, setTopMoves] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [scores, setScores] = useState({ black: 0, white: 0 });

  // NEW: History stack for undo
  const [history, setHistory] = useState([]);

  // NEW: Show results panel flag
  const [showResults, setShowResults] = useState(false);

  // --- INIT BOARD ---
  useEffect(() => {
    setBoard(createEmptyBoard(size));
  }, [size]);

  // --- UPDATE SCORES WHEN BOARD CHANGES ---
  useEffect(() => {
    updateScores(board);
  }, [board]);

  function createEmptyBoard(n) {
    return Array.from({ length: n }, () => Array(n).fill(0));
  }

  function updateScores(b) {
    let black = 0,
      white = 0;
    b.forEach((row) =>
      row.forEach((cell) => {
        if (cell === 1) black++;
        else if (cell === 2) white++;
      })
    );
    setScores({ black, white });
  }

  // --- DEFAULT POSITION ---
  function loadDefaultStart(n) {
    pushHistory();
    const b = createEmptyBoard(n);
    const mid = Math.floor(n / 2);
    b[mid - 1][mid - 1] = 2;
    b[mid - 1][mid] = 1;
    b[mid][mid - 1] = 1;
    b[mid][mid] = 2;

    setBoard(b);
    setTopMoves([]);
    setShowResults(false);
  }

  // --- CLEAR BOARD ---
  function clearBoard() {
    pushHistory();
    setBoard(createEmptyBoard(size));
    setTopMoves([]);
    setShowResults(false);
  }


  // --- APPLY SOLVER MOVE (Existing function, encapsulated) ---
  async function applyMove(m) {
    pushHistory(); // store current board

    try {
      const res = await fetch(`${apiUrl}/api/make_move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          row: m.row,
          col: m.col,
          player,
          session_id: `solver_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBoard(data.board);
        // After applying a move, we clear the analysis results
        setTopMoves([]);
        setShowResults(false); 
      } else {
        alert(`Error applying move: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error communicating with backend to apply move.");
    }
  }


  // --- PUSH CURRENT BOARD TO HISTORY ---
  function pushHistory() {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(board))]);
  }

  // --- UNDO MOVE ---
  function undo() {
    if (history.length === 0) return;

    const last = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setBoard(last);
    setTopMoves([]);
    setShowResults(false);
  }

  // --- ANALYZE BOARD (CALL BACKEND) ---
  async function analyzeBoard() {
    setThinking(true);
    setTopMoves([]);

    try {
      const res = await fetch(`${apiUrl}/api/solver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          player,
          session_id: `solver_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTopMoves(data.top_moves || []);
        setShowResults(true); // show panel only after analyze
      }
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Make sure the Flask server is running and accessible.");
    }

    setThinking(false);
  }


  // --- Map top moves to highlight ---
  const topMap = {};
  topMoves.forEach((m, i) => {
    const mv = m.move;
    // Store the entire move object (including score/evaluation) for easier lookup
    if (mv) topMap[`${mv.row}_${mv.col}`] = m;
  });


  // --- CELL CLICK: handle piece setting or applying solver move ---
  function handleCellClick(r, c) {
    const key = `${r}_${c}`;
    const moveObject = topMap[key]; // Get the move object if it exists at this position
    
    // 1. Check if the click is on a highlighted suggestion AND the results panel is visible
    if (showResults && moveObject) {
      // Apply the suggested move
      applyMove(moveObject.move);
      return;
    }

    // 2. Default behavior: cycle piece color (for custom setup)
    pushHistory();
    setBoard((prev) => {
      const nb = prev.map((row) => row.slice());
      nb[r][c] = (nb[r][c] + 1) % 3;
      return nb;
    });
    setTopMoves([]);
    setShowResults(false);
  }


  return (
    <div className="bg-gray-800 p-6 rounded-xl border-2 border-green-600 max-w-6xl mx-auto">
      {/* HEADER SETTINGS */}

      <div className="flex items-center gap-4 mb-4">
        <label className="text-green-300 font-semibold">Board Size</label>
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="bg-gray-700 text-white rounded p-2"
        >
          <option value={6}>6x6</option>
          <option value={8}>8x8</option>
          <option value={10}>10x10</option>
          <option value={12}>12x12</option>
        </select>

        <label className="text-green-300 font-semibold ml-4">Player to Move</label>
        <select
          value={player}
          onChange={(e) => setPlayer(Number(e.target.value))}
          className="bg-gray-700 text-white rounded p-2"
        >
          <option value={1}>Black (1)</option>
          <option value={2}>White (2)</option>
        </select>

        {/* Live Scoreboard */}
        <div className="ml-auto text-white flex gap-6 text-lg">
          <div>⚫ Black: {scores.black}</div>
          <div>⚪ White: {scores.white}</div>
        </div>
      </div>

      {/* BOARD GRID */}
      <div
        className="grid gap-1 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          maxWidth: `${Math.min(700, size * 50)}px`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}_${c}`;
            const moveObject = topMap[key];
            const topRank = moveObject ? topMoves.findIndex(m => m === moveObject) + 1 : null;
            
            const isSuggestion = showResults && moveObject;

            return (
              <div
                key={key}
                onClick={() => handleCellClick(r, c)}
                className={`aspect-square border-2 border-green-700 flex items-center justify-center relative cursor-pointer
                ${isSuggestion ? "ring-4 ring-yellow-400 hover:scale-105 transition-transform" : ""}`}
                style={{ backgroundColor: DEFAULT_COLORS.empty }}
              >
                {cell === 1 && <div className="w-4/5 h-4/5 rounded-full bg-black" />}
                {cell === 2 && <div className="w-4/5 h-4/5 rounded-full bg-white" />}

                {isSuggestion && topRank && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-1 rounded">
                    #{topRank}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CENTERED BUTTON ROW */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => loadDefaultStart(size)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Default
        </button>

        <button onClick={clearBoard} className="bg-gray-600 text-white px-4 py-2 rounded">
          Clear
        </button>

        <button onClick={undo} className="bg-indigo-600 text-white px-4 py-2 rounded">
          Undo
        </button>

        <button
          onClick={analyzeBoard}
          disabled={thinking}
          className="bg-yellow-600 text-black px-4 py-2 rounded font-bold"
        >
          {thinking ? "Analyzing..." : "Analyze Board"}
        </button>
      </div>

      {/* RESULTS PANEL */}
      {showResults && (
        <div className="mt-6 bg-gray-900 p-4 rounded border border-gray-700">
          <h3 className="text-lg text-green-400 font-bold mb-3">Solver Results</h3>

          {topMoves.length === 0 ? (
            <div className="text-gray-400">No valid moves found from this position.</div>
          ) : (
            <div className="space-y-3">
              {topMoves.map((m, idx) => {
                const mv = m.move;
                return (
                  <div
                    key={idx}
                    onClick={() => applyMove(mv)}
                    className="p-3 bg-gray-800 rounded border border-gray-600 cursor-pointer hover:border-green-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-yellow-400 font-bold">#{idx + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                        m.evaluation === 'Winning' ? 'bg-green-600' :
                        m.evaluation === 'Strong' ? 'bg-blue-600' :
                        m.evaluation === 'Good' ? 'bg-purple-600' :
                        m.evaluation === 'Equal' ? 'bg-gray-600' :
                        m.evaluation === 'Weak' ? 'bg-orange-600' :
                        'bg-red-600'
                      }`}>
                        {m.evaluation}
                      </span>
                    </div>
                    <div className="text-white">Row {mv.row}, Col {mv.col}</div>
                    <div className="text-gray-300 text-sm">Score: {m.score}</div>
                    <div className="text-xs text-green-300 mt-1">(Click to apply move)</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardEditor;