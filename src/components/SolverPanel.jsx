import React from "react";
import { Target } from "lucide-react";

const SolverPanel = ({ topMoves, thinking, getSolverMoves }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border-2 border-green-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
          <Target size={24} />
          Top Moves
        </h3>
        <button
          onClick={getSolverMoves}
          disabled={thinking}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-all"
        >
          {thinking ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {topMoves.length > 0 ? (
        <div className="space-y-3">
          {topMoves.map((move, idx) => (
            <div
              key={idx}
              className="bg-gray-700 p-3 rounded-lg border-2 border-gray-600 hover:border-green-500 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-bold">#{idx + 1}</span>

                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    move.evaluation === 'Winning' ? 'bg-green-600' :
                    move.evaluation === 'Strong' ? 'bg-blue-600' :
                    move.evaluation === 'Good' ? 'bg-purple-600' :
                    move.evaluation === 'Equal' ? 'bg-gray-600' :
                    move.evaluation === 'Weak' ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}
                >
                  {move.evaluation}
                </span>
              </div>

              <div className="text-white">
                Position: Row {move.move.row}, Col {move.move.col}
              </div>

              <div className="text-gray-400 text-sm">
                Score: {move.score}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-4">Click "Analyze" to see best moves</div>
      )}
    </div>
  );
};

export default SolverPanel;
