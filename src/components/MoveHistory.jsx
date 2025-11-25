import React from "react";
import { Clock } from "lucide-react";

const MoveHistory = ({ moveHistory }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border-2 border-blue-600 max-h-64 overflow-y-auto">
      <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
        <Clock size={24} />
        Move History ({moveHistory.length})
      </h3>

      <div className="space-y-2">
        {moveHistory.length > 0 ? (
          moveHistory
            .slice()
            .reverse()
            .map((move, idx) => (
              <div
                key={idx}
                className="bg-gray-700 p-2 rounded text-sm text-white flex items-center gap-2"
              >
                <div
                  className={`w-4 h-4 rounded-full ${
                    move.player === 1 ? "bg-gray-900" : "bg-white"
                  }`}
                />
                <span>
                  Move {moveHistory.length - idx}: Row {move.row}, Col {move.col}
                </span>
              </div>
            ))
        ) : (
          <div className="text-gray-400 text-center py-4">No moves yet</div>
        )}
      </div>
    </div>
  );
};

export default MoveHistory;
