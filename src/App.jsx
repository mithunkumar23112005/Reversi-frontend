import React, { useState, useEffect, useCallback } from 'react';
import { Users, Brain, RotateCcw, TrendingUp, Zap, Target, Cpu, Clock, Activity, Lightbulb, Play, Network, LogOut, Loader, Plus, List, AlertTriangle, Search } from 'lucide-react';
import io from 'socket.io-client';
import BoardEditor from './components/BoardEditor.jsx'; 

const API_URL = 'https://reversi-djpc.onrender.com';
const SOCKET_URL = 'https://reversi-djpc.onrender.com';

let socket;

const ReversiGame = () => {
  const [gameState, setGameState] = useState('menu');
  const [boardSize, setBoardSize] = useState(8);
  const [board, setBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [validMoves, setValidMoves] = useState([]);
  const [scores, setScores] = useState({ black: 2, white: 2 });
  const [difficulty, setDifficulty] = useState('medium');
  const [thinking, setThinking] = useState(false);
  const [gameMode, setGameMode] = useState('');
  const [stats, setStats] = useState({
    nodesExplored: 0,
    timeMs: 0,
    depthReached: 0,
    pruningRate: 0,
    ttHits: 0
  });
  const [topMoves, setTopMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [aiHint, setAiHint] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showHvHSubMenu, setShowHvHSubMenu] = useState(false);

  // --- Online Game State ---
  const [isOnlineReady, setIsOnlineReady] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState('');
  const [onlinePlayerColor, setOnlinePlayerColor] = useState(0); 
  const [onlineStatus, setOnlineStatus] = useState(''); 
  const [openGames, setOpenGames] = useState([]);
  const [socketId, setSocketId] = useState(null);
  const [manualGameId, setManualGameId] = useState(''); 


  // --- Game Logic Wrappers ---

  const calculateScores = useCallback((currentBoard) => {
    let black = 0, white = 0;
    currentBoard.forEach(row => {
      row.forEach(cell => {
        if (cell === 1) black++;
        if (cell === 2) white++;
      });
    });
    setScores({ black, white });
  }, []);

  const fetchValidMoves = useCallback(async (currentBoard, player) => {
    try {
      const response = await fetch(`${API_URL}/api/valid_moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          board: currentBoard, 
          player: player,
          session_id: sessionId 
        })
      });
      const data = await response.json();
      if (data.success) {
        setValidMoves(data.moves);
        return data.moves;
      }
    } catch (error) {
      console.error('Error fetching valid moves:', error);
    }
    return [];
  }, [sessionId]);
   
  const makeAIMove = useCallback(async (currentBoard, player) => {
    setShowStats(true); 
    try {
      const response = await fetch(`${API_URL}/api/ai_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: currentBoard,
          player: player,
          difficulty: difficulty,
          session_id: sessionId
        })
      });
      const data = await response.json();
      if (data.success) {
        const newBoard = data.board;
        setBoard(newBoard);
        setStats({
          nodesExplored: data.stats.nodes_explored,
          timeMs: data.stats.time_ms,
          depthReached: data.stats.depth_reached,
          pruningRate: data.stats.pruning_rate,
          ttHits: data.stats.tt_hits
        });
        calculateScores(newBoard);
        setMoveHistory(prev => [...prev, { 
          player, 
          row: data.move.row, 
          col: data.move.col 
        }]);
        setTimeout(() => {
          setThinking(false);
          checkGameOver(newBoard, player); 
        }, 300);
      } else {
        setThinking(false);
        await checkGameOver(currentBoard, player);
      }
    } catch (error) {
      console.error('Error making AI move:', error);
      setThinking(false);
    }
  }, [calculateScores, difficulty, sessionId]);
  
  const checkGameOver = useCallback(async (currentBoard, player) => {
    const nextPlayer = 3 - player;
    const nextMoves = await fetchValidMoves(currentBoard, nextPlayer); 
    
    if (nextMoves.length === 0) {
      const currentMoves = await fetchValidMoves(currentBoard, player);
      if (currentMoves.length === 0) {
        setGameOver(true);
        const black = currentBoard.flat().filter(c => c === 1).length;
        const white = currentBoard.flat().filter(c => c === 2).length;
        setWinner(black > white ? 'Black' : white > black ? 'White' : 'Draw');
      } else {
        setCurrentPlayer(player);
        if (gameMode === 'hvai' && player === 2) {
          setThinking(true);
          setTimeout(() => makeAIMove(currentBoard, 2), 400);
        } else {
          setValidMoves(currentMoves); 
        }
      }
    } else {
      setCurrentPlayer(nextPlayer);
      if (gameMode === 'hvai' && nextPlayer === 2) {
        setValidMoves([]); 
        setThinking(true); 
        setTimeout(() => makeAIMove(currentBoard, nextPlayer), 400);
      } else if (gameMode === 'hvh' || (gameMode === 'hvai' && nextPlayer === 1)) {
        setValidMoves(nextMoves); 
      }
    }
  }, [fetchValidMoves, gameMode, makeAIMove]); 

  const initializeGame = useCallback(async (size, mode) => {
    setThinking(true);
    try {
      const response = await fetch(`${API_URL}/api/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_size: size, session_id: sessionId })
      });
      const data = await response.json();
      if (data.success) {
        setBoard(data.board);
        setBoardSize(size);
        setCurrentPlayer(1);
        setMoveHistory([]);
        setGameOver(false);
        setWinner('');
        setAiHint(null);
        setShowHint(false);
        calculateScores(data.board);
        if (mode !== 'online') {
          await fetchValidMoves(data.board, 1);
        }
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      alert('❌ Failed to connect to backend!');
    }
    setThinking(false);
  }, [calculateScores, fetchValidMoves, sessionId]);
    
  const makeHumanMove = async (row, col) => {
    if (thinking || gameOver) return;
    const move = validMoves.find(m => m.row === row && m.col === col);
    if (!move) return;

    setShowHint(false);
    setAiHint(null);

    if (gameMode === 'online' && onlineGameId && socket) {
      socket.emit('make_online_move', { row, col });
      return; 
    }

    try {
      const res = await fetch(`${API_URL}/api/make_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: board,
          row,
          col,
          player: currentPlayer,
          session_id: sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        const newBoard = data.board;
        setBoard(newBoard);
        calculateScores(newBoard);
        setMoveHistory(prev => [...prev, { player: currentPlayer, row, col }]);
        await checkGameOver(newBoard, currentPlayer); 
      }
    } catch (error) {
      console.error('Error making move:', error);
    }
  };

  const getAIHint = async () => {
    if (!board || board.length === 0 || thinking || (gameMode !== 'hvai' && gameMode !== 'hvh')) return;
    setThinking(true);
    setShowStats(true);
    try {
      const response = await fetch(`${API_URL}/api/ai_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: board,
          player: currentPlayer, 
          difficulty: difficulty,
          session_id: sessionId
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiHint(data.move);
        setShowHint(true);
        setStats({
          nodesExplored: data.stats.nodes_explored,
          timeMs: data.stats.time_ms,
          depthReached: data.stats.depth_reached,
          pruningRate: data.stats.pruning_rate,
          ttHits: data.stats.tt_hits
        });
      }
      setThinking(false);
    } catch (error) {
      console.error('Error getting hint:', error);
      setThinking(false);
    }
  };
  
  const startGame = async (mode) => {
    setGameMode(mode);
    setShowHvHSubMenu(false);
    if (mode === 'online') {
      setGameState('online_lobby');
      return;
    }
    setGameState('playing');
    await initializeGame(boardSize, mode);
    setShowStats(mode === 'aivai' || mode === 'hvai');
    if (mode === 'aivai') {
      setTimeout(() => {
        if (board.length > 0) {
          setThinking(true);
          makeAIMove(board, 1);
        }
      }, 1000);
    } 
  };


  // --- SocketIO Implementation ---
  useEffect(() => {
    socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      console.log("Connected to WebSocket");
      setIsOnlineReady(true);
    });

    socket.on('session_ready', (data) => {
      setSocketId(data.sid);
    });

    socket.on('disconnect', () => {
      console.log("Disconnected from WebSocket");
      setIsOnlineReady(false);
    });

    // Handle generic errors (like "Game full" or "Game not found")
    socket.on('error', (data) => {
        console.error("Socket Error:", data);
        alert(`Server Error: ${data.message || 'Unknown error'}`);
    });

    socket.on('game_created', (data) => {
      setOnlineGameId(data.game_id);
      setOnlinePlayerColor(data.player_color); 
      setOnlineStatus('waiting');
      setBoardSize(data.board_size);
      setGameState('online_playing');
      initializeGame(data.board_size, 'online');
    });

    socket.on('game_joined', (data) => {
      setOnlineGameId(data.game_id);
      setOnlinePlayerColor(data.player_color);
      setOnlineStatus('playing');
      setBoardSize(data.board_size);
      setBoard(data.board);
      setCurrentPlayer(1);
      setGameState('online_playing');
      calculateScores(data.board);
      fetchValidMoves(data.board, 1);
    });

    socket.on('game_state_update', (data) => {
      setBoard(data.board);
      setCurrentPlayer(data.turn);
      calculateScores(data.board);
      setOnlineStatus(data.status);
      if (data.message && data.message.startsWith('Player')) {
        setMoveHistory(prev => [...prev, { player: 3 - data.turn, message: data.message }]);
      }
      if (data.status === 'finished') {
        setGameOver(true);
        const winnerName = data.winner === 1 ? 'Black' : data.winner === 2 ? 'White' : 'Draw';
        setWinner(winnerName);
      } else {
        if (data.turn === onlinePlayerColor) {
          fetchValidMoves(data.board, data.turn);
        } else {
          setValidMoves([]);
        }
      }
    });

    socket.on('opponent_left', (data) => {
      setOnlineStatus('disconnected');
      setGameOver(true);
      alert(`Opponent Left: ${data.message}`);
    });
    
    socket.on('move_error', (data) => {
      alert(`Move Error: ${data.message}`);
    });

    socket.on('open_games_list', (data) => {
      console.log("Games list received:", data.games);
      setOpenGames(data.games);
    });

    return () => {
      socket.disconnect();
    };
  }, [calculateScores, fetchValidMoves, onlinePlayerColor, initializeGame]);


  // FIX: This useEffect now explicitly watches 'isOnlineReady' to fetch games immediately upon connection
  useEffect(() => {
    if (gameState === 'online_lobby' && isOnlineReady && socket) {
      console.log("Fetching open games...");
      socket.emit('get_open_games');
    }
  }, [gameState, isOnlineReady]);


  // AI vs AI loop
  useEffect(() => {
    if (gameMode === 'aivai' && gameState === 'playing' && !thinking && !gameOver && validMoves.length > 0 && board.length > 0) {
      const timer = setTimeout(() => {
        setThinking(true);
        makeAIMove(board, currentPlayer);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, thinking, gameOver, validMoves, board, makeAIMove]);


  const renderCell = (row, col) => {
    if (!board || !board[row]) return null;
    const cell = board[row][col];
    const isValid = validMoves.some(m => m.row === row && m.col === col);
    const isTopMove = topMoves.some(m => m.move.row === row && m.move.col === col);
    const isHint = showHint && aiHint && aiHint.row === row && aiHint.col === col;
    const isCurrentPlayerHumanControlled = 
      gameMode === 'hvh' || 
      (gameMode === 'hvai' && currentPlayer === 1) ||
      (gameMode === 'online' && currentPlayer === onlinePlayerColor);
    const canMove = isCurrentPlayerHumanControlled && isValid && !thinking && !gameOver;
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => canMove && makeHumanMove(row, col)}
        className={`
          aspect-square border-2 border-green-700 flex items-center justify-center
          transition-all duration-200 relative
          ${canMove ? 'cursor-pointer hover:bg-green-600 hover:scale-105' : ''}
          ${isTopMove ? 'ring-4 ring-yellow-400' : ''}
          ${isHint ? 'ring-4 ring-blue-400 animate-pulse' : ''}
        `}
        style={{ backgroundColor: '#0a8f4a' }}
      >
        {cell === 1 && <div className="w-4/5 h-4/5 rounded-full bg-gray-900 shadow-lg" />}
        {cell === 2 && <div className="w-4/5 h-4/5 rounded-full bg-white shadow-lg" />}
        {isValid && isCurrentPlayerHumanControlled && <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-70 animate-pulse" />}
        {isTopMove && <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-1 rounded">{topMoves.findIndex(m => m.move.row === row && m.move.col === col) + 1}</div>}
        {isHint && <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">💡 BEST</div>}
      </div>
    );
  };

  const resetOnlineState = () => {
    setOnlineGameId('');
    setOnlinePlayerColor(0);
    setOnlineStatus('');
    setOpenGames([]);
    setManualGameId('');
    setGameState('menu');
  };

  // --- Game Mode UI ---

  // 1. Online Lobby Screen
  if (gameState === 'online_lobby') {
    const fetchOpenGames = () => {
      if(socket) socket.emit('get_open_games');
    };
     useEffect(() => {
      // Fetch games immediately when entering the lobby AND the socket is ready
      if (isOnlineReady && socket) {
        fetchOpenGames();
      }
    }, [isOnlineReady]);
    // ----------------------------
    const createGame = () => {
      if (socket) socket.emit('create_game', { board_size: boardSize });
    };

    // FIX: Enhanced Join Game Logic with Debugging
    const joinGame = (id) => {
      const cleanId = id.trim();
      console.log("Attempting to join game:", cleanId);
      
      if (!isOnlineReady) {
        alert("⚠️ You are not connected to the server. Please wait for the green 'Connected' status.");
        return;
      }
      
      if (!cleanId) {
        alert("⚠️ Please enter a Game ID.");
        return;
      }

      if (socket) {
        socket.emit('join_game', { game_id: cleanId });
      } else {
        alert("⚠️ Internal Error: Socket object is null.");
      }
    };

    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-2xl shadow-2xl p-8 border-2 border-green-600">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
              <Network size={32} /> Online HvH Lobby
            </h1>
            <button
              onClick={() => setGameState('menu')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all"
            >
              ← Menu
            </button>
            </div>
          
          {/* Lobby Status */}
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg mb-6 text-white">
            <p className="flex items-center gap-2">
              <Play size={20} /> Current Board Size: 
              <span className="font-bold text-green-300">{boardSize}x{boardSize}</span>
            </p>
            <p className="flex items-center gap-2">
              {isOnlineReady ? <span className="text-green-500">🟢 Connected</span> : <span className="text-red-500">🔴 Disconnected (Connecting...)</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Create Game Side */}
            <div className="bg-gray-700/50 p-6 rounded-xl border border-gray-600">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Plus size={24} className="text-green-400" /> Create Game
                </h3>
                <p className="text-gray-400 mb-4 text-sm">Host a new game and wait for someone to join.</p>
                <button 
                    onClick={createGame} 
                    disabled={!isOnlineReady}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                    Create {boardSize}x{boardSize} Game
                </button>
            </div>

            {/* Join by ID Side */}
            <div className="bg-gray-700/50 p-6 rounded-xl border border-gray-600">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Search size={24} className="text-blue-400" /> Join Specific Game
                </h3>
                <p className="text-gray-400 mb-4 text-sm">Have a friend's Game ID? Enter it here.</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={manualGameId}
                        onChange={(e) => setManualGameId(e.target.value)}
                        placeholder="Enter Game ID..." 
                        className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    />
                    <button 
                        onClick={() => joinGame(manualGameId)}
                        disabled={!isOnlineReady || !manualGameId}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-all"
                    >
                        Join
                    </button>
                </div>
            </div>
          </div>

          {/* Open Games List */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl text-yellow-400 flex items-center gap-2"><List size={20} /> Open Games</h2>
            <button onClick={fetchOpenGames} className="text-sm text-green-400 hover:text-green-300">
              <RotateCcw size={16} className="inline mr-1" /> Refresh List
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto bg-gray-900/50 p-4 rounded-xl border border-gray-700">
            {openGames.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                 {isOnlineReady ? "No open games found. Create one!" : "Connecting to server..."}
              </p>
            ) : (
              openGames.map((game) => (
                <div key={game.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center border border-gray-600 hover:border-green-500 transition-colors">
                  <div className="text-white">
                    <span className="font-bold text-lg text-yellow-300 mr-3">{game.id}</span>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">{game.size}x{game.size}</span>
                  </div>
                  <button 
                    onClick={() => joinGame(game.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-all text-sm"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // 2. Online Playing Screen
  if (gameState === 'online_playing') {
    if (onlineStatus === 'waiting') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center border-2 border-yellow-600">
            <Loader className="animate-spin text-yellow-500 mx-auto mb-4" size={48} />
            <h1 className="text-3xl font-bold text-yellow-400 mb-2">Waiting for Opponent...</h1>
            <p className="text-white mb-4">Game ID: <span className="font-mono text-xl text-green-300 select-all">{onlineGameId}</span></p>
            <p className="text-gray-400">Share this ID with a friend to play! You are Black (⚫)</p>
            <button onClick={resetOnlineState} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto gap-2">
              <LogOut size={18} /> Cancel Game
            </button>
          </div>
        </div>
      );
    }
    if (onlineStatus === 'disconnected') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center border-2 border-red-600">
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
            <h1 className="text-3xl font-bold text-red-400 mb-2">Opponent Disconnected</h1>
            <p className="text-white mb-4">Game forfeited. You win by default.</p>
            <button onClick={resetOnlineState} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto gap-2">
              Back to Menu
            </button>
          </div>
        </div>
      );
    }
    if(gameMode !== 'online') setGameMode('online');
  }

  // 3. Menu Screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border-2 border-green-600">
          <h1 className="text-5xl font-bold text-center mb-2 text-green-400">🎮 Advanced Reversi AI</h1>
          <p className="text-center text-gray-400 mb-8">Minimax + Alpha-Beta Pruning | Transposition Tables | Iterative Deepening</p>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-green-400 mb-2 font-semibold">Board Size:</label>
              <select value={boardSize} onChange={(e) => setBoardSize(Number(e.target.value))} className="w-full bg-gray-700 text-white rounded-lg p-3 border-2 border-gray-600 focus:border-green-500 focus:outline-none">
                <option value={6}>6x6 (Small)</option>
                <option value={8}>8x8 (Classic)</option>
                <option value={10}>10x10 (Large)</option>
                <option value={12}>12x12 (Expert)</option>
              </select>
            </div>
            <div>
              <label className="block text-green-400 mb-2 font-semibold">AI Difficulty:</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-gray-700 text-white rounded-lg p-3 border-2 border-gray-600 focus:border-green-500 focus:outline-none">
                <option value="easy">Easy (Depth 4)</option>
                <option value="medium">Medium (Depth 6)</option>
                <option value="hard">Hard (Depth 8)</option>
                <option value="expert">Expert (Depth 10)</option>
              </select>
            </div>
          </div>
          
          {showHvHSubMenu && (
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-700 rounded-lg border-2 border-blue-500">
              <button onClick={() => startGame('hvh')} className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 transition-all transform hover:scale-105 flex flex-col items-center gap-2 border-2 border-green-500">
                <Users size={30} /> <span className="font-bold text-md">Local HvH</span>
              </button>
              <button onClick={() => startGame('online')} disabled={!isOnlineReady} className={`text-white rounded-xl p-4 transition-all flex flex-col items-center gap-2 border-2 ${isOnlineReady ? 'bg-blue-600 hover:bg-blue-700 border-blue-500' : 'bg-gray-600 text-gray-400 border-gray-500'}`}>
                <Network size={30} /> <span className="font-bold text-md">Online HvH</span> <span className="text-sm">{isOnlineReady ? 'Play Friend' : 'Connecting...'}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => setShowHvHSubMenu(!showHvHSubMenu)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition-all transform hover:scale-105 flex flex-col items-center gap-3 border-2 border-blue-500">
              <Users size={40} /> <span className="font-bold text-lg">Human vs Human</span>
            </button>
            <button onClick={() => startGame('hvai')} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl p-6 transition-all transform hover:scale-105 flex flex-col items-center gap-3 border-2 border-orange-500">
              <Cpu size={40} /> <span className="font-bold text-lg">Human vs AI</span>
            </button>
            <button onClick={() => { setGameMode('editor'); setGameState('editor'); }} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-6 transition-all transform hover:scale-105 flex flex-col items-center gap-3 border-2 border-purple-500">
              <Brain size={40} /> <span className="font-bold text-lg">AI Solver</span>
            </button>
          </div>
          <div className="mt-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2"><Zap size={20} /> Advanced Features:</h3>
            <ul className="text-sm text-gray-300 space-y-1"><li>✅ Zobrist Hashing & Transposition Tables</li><li>✅ 10+ Advanced Heuristics</li><li>✅ Phase-Based Strategy (Opening/Mid/End)</li><li>✅ Real-time Performance Analytics</li></ul>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'editor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => { setGameState('menu'); setGameMode(''); }} className="bg-gray-700 text-white px-4 py-2 rounded">← Menu</button>
              <h1 className="text-2xl font-bold text-green-400">🧠 AI Solver — Enter Board & Analyze</h1>
            </div>
          </div>
          <BoardEditor initialSize={boardSize} apiUrl={API_URL} />
        </div>
      </div>
    );
  }

  // 5. Main Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between border-2 border-green-600 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => { if(gameMode === 'online') resetOnlineState(); setGameState('menu'); setBoard([]); }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all">← Menu</button>
            <h1 className="text-2xl font-bold text-green-400">{gameMode === 'hvai' ? '👤 Human vs AI' : gameMode === 'hvh' ? '👥 Local Human vs Human' : gameMode === 'online' ? `🌐 Online HvH: ${onlineGameId}` : gameMode === 'aivai' ? '🤖 AI vs AI' : 'Game'}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {((gameMode === 'hvai' && currentPlayer === 1) || gameMode === 'hvh') && !gameOver && (
              <button onClick={getAIHint} disabled={thinking} className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"><Lightbulb size={18} /> Get Hint</button>
            )}
            <button onClick={() => initializeGame(boardSize, gameMode)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"><RotateCcw size={18} /> Reset</button>
            {(gameMode === 'hvai' || gameMode === 'aivai') && (
              <button onClick={() => setShowStats(!showStats)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"><TrendingUp size={18} /> Stats</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-green-600">
              {(thinking && gameMode !== 'hvh' && gameMode !== 'online') && (
                <div className="mb-4 bg-yellow-900 border border-yellow-600 text-yellow-200 p-3 rounded-lg flex items-center gap-3"><div className="animate-spin">🤔</div><span>AI is thinking...</span></div>
              )}
              {gameOver && (
                <div className="mb-4 bg-blue-900 border-2 border-blue-500 text-white p-4 rounded-lg text-center"><h2 className="text-2xl font-bold mb-2">🎮 Game Over!</h2><p className="text-xl">{winner === 'Draw' ? '🤝 Draw!' : `🏆 ${winner} Wins!`}</p><p className="text-sm mt-2 text-gray-300">Final Score - Black: {scores.black} | White: {scores.white}</p></div>
              )}
              {board.length > 0 ? (
                <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`, maxWidth: `${Math.min(600, boardSize * 60)}px` }}>
                  {board.map((row, i) => row.map((_, j) => renderCell(i, j)))}
                </div>
              ) : (
                <div className="text-center text-white p-8"><div className="animate-spin text-4xl mb-4">⏳</div><p>Loading board...</p></div>
              )}
              {board.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 ${currentPlayer === 1 ? 'bg-gray-700 border-yellow-400' : 'bg-gray-900 border-gray-700'}`}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700" /><div><div className="text-white font-bold">Black (Player 1) {currentPlayer === 1 ? (gameMode === 'online' && onlinePlayerColor !== 1 ? '(Opponent Turn)' : '(Your Turn)') : ''}</div></div></div></div>
                  <div className={`p-4 rounded-lg border-2 ${currentPlayer === 2 ? 'bg-gray-700 border-yellow-400' : 'bg-gray-900 border-gray-700'}`}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300" /><div><div className="text-white font-bold">White (Player 2) {currentPlayer === 2 ? (gameMode === 'online' && onlinePlayerColor !== 2 ? '(Opponent Turn)' : (gameMode === 'hvai' ? '(AI Turn)' : '(Your Turn)')) : ''}</div></div></div></div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {(gameMode === 'hvai' || gameMode === 'aivai') && showStats && (
              <div className="bg-gray-800 rounded-xl p-6 border-2 border-purple-600"><h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2"><Activity size={24} /> Performance</h3><div className="space-y-3"><div className="bg-gray-700 p-3 rounded-lg"><div className="text-sm text-gray-400">Nodes Explored</div><div className="text-2xl font-bold text-white">{stats.nodesExplored.toLocaleString()}</div></div><div className="bg-gray-700 p-3 rounded-lg"><div className="text-sm text-gray-400">Time Taken</div><div className="text-2xl font-bold text-white">{stats.timeMs}ms</div></div><div className="bg-gray-700 p-3 rounded-lg"><div className="text-sm text-gray-400">Depth Reached</div><div className="text-2xl font-bold text-white">{stats.depthReached}</div></div><div className="bg-gray-700 p-3 rounded-lg"><div className="text-sm text-gray-400">Pruning Rate</div><div className="text-2xl font-bold text-green-400">{stats.pruningRate}%</div></div></div></div>
            )}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-blue-600 max-h-96 overflow-y-auto"><h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2"><Clock size={24} /> Move History ({moveHistory.length})</h3><div className="space-y-2">{moveHistory.length > 0 ? (moveHistory.slice().reverse().map((move, idx) => (<div key={idx} className="bg-gray-700 p-2 rounded text-sm text-white flex items-center gap-2"><div className={`w-4 h-4 rounded-full ${move.player === 1 ? 'bg-gray-900' : 'bg-white'}`} /><span>{move.message || `Move ${moveHistory.length - idx}: Row ${move.row}, Col ${move.col}`}</span></div>))) : (<div className="text-gray-400 text-center py-4">No moves yet</div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReversiGame;
