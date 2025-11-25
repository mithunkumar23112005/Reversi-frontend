import React from "react";
import { Activity } from "lucide-react";

const StatsPanel = ({ stats }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border-2 border-purple-600">
      <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
        <Activity size={24} />
        Performance
      </h3>

      <div className="space-y-3">
        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Nodes Explored</div>
          <div className="text-2xl font-bold text-white">{stats.nodesExplored.toLocaleString()}</div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Time Taken</div>
          <div className="text-2xl font-bold text-white">{stats.timeMs}ms</div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Depth Reached</div>
          <div className="text-2xl font-bold text-white">{stats.depthReached}</div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Pruning Rate</div>
          <div className="text-2xl font-bold text-green-400">{stats.pruningRate}%</div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-sm text-gray-400">TT Hits</div>
          <div className="text-2xl font-bold text-blue-400">{stats.ttHits}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
