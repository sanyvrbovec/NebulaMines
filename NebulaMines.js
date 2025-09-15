import React, { useState, useEffect, useCallback, useRef } from 'react';

const VERSION = '1.9.6'; // Verzija s robusnim dinamičkim skaliranjem ploče

// ICONS, numberColors, defaultDifficulties, difficultyColors... (sve ostaje isto)
const ICONS = {
  bomb: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
      <path d="M16 6c.6-.8 1.4-1.6 2.6-1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 4l1-1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bombFilled: (
    <svg className="w-10 h-10 text-red-500" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g>
        <circle cx="30" cy="34" r="14" fill="currentColor" />
        <rect x="40" y="18" width="10" height="3" rx="1.5" fill="#FFD166" transform="rotate(-20 40 18)" />
        <path d="M45 15c1.5-1.5 3-3.5 4.8-4.6 1.6-1 3.2-.4 3.7.9" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <g transform="translate(27,24)">
          <circle cx="6" cy="-9" r="1.8" fill="#FFD166" />
          <path d="M8 -11 l3 -3" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  ),
  flag: (
    <svg className="w-6 h-6 text-pink-400 flag-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2v20h2V13l8-2V4l-8 2V2H6z" />
    </svg>
  ),
  soundOn: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9v6h4l5 4V5L9 9H5z" /></svg>
  ),
  soundOff: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 7l-1.41 1.41L17.17 11H14v2h3.17l-2.58 2.59L16 17l4-4-4-4zM4 9v6h4l5 4V5L8 9H4z" />
    </svg>
  ),
  smile: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM8 10a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zm-8 4s1.333 2 4 2 4-2 4-2" /></svg>
  ),
  win: (
    <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4" /></svg>
  ),
  lose: (
    <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6l12 12M6 18L18 6" /></svg>
  ),
};
const numberColors = {
  1: 'text-blue-400 glow-1', 2: 'text-green-400 glow-2', 3: 'text-red-400 glow-3', 4: 'text-purple-400 glow-4',
  5: 'text-yellow-300 glow-5', 6: 'text-cyan-300 glow-6', 7: 'text-orange-300 glow-7', 8: 'text-pink-300 glow-8',
};
const defaultDifficulties = {
  easy: { name: 'Lako', rows: 9, cols: 9, mines: 10 },
  medium: { name: 'Srednje', rows: 16, cols: 16, mines: 40 },
  hard: { name: 'Teško', rows: 16, cols: 30, mines: 99 },
};
const difficultyColors = {
  easy: 'bg-green-500/10 text-green-300 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const createBoard = (rows, cols, mines) => {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0, id: Math.random().toString(36).slice(2, 9),
    }))
  );
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows); const c = Math.floor(Math.random() * cols);
    if (!board[r][c].isMine) { board[r][c].isMine = true; minesPlaced++; }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!board[i][j].isMine) {
        let cnt = 0;
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const nr = i + x; const nc = j + y;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) cnt++;
          }
        }
        board[i][j].neighborMines = cnt;
      }
    }
  }
  return board;
};

const revealEmptyCells = (board, row, col) => {
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    const q = [{ row, col }];
    const visited = new Set([`${row},${col}`]);
    if (newBoard[row][col].isMine || newBoard[row][col].isFlagged || newBoard[row][col].isRevealed) {
        return board;
    }
    while (q.length) {
      const { row: r, col: c } = q.shift();
      newBoard[r][c].isRevealed = true;
      if (newBoard[r][c].neighborMines === 0) {
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const nr = r + x; const nc = c + y;
            if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length && !visited.has(`${nr},${nc}`)) {
                const neighbor = newBoard[nr][nc];
                if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                    q.push({ row: nr, col: nc });
                    visited.add(`${nr},${nc}`);
                }
            }
          }
        }
      }
    }
    return newBoard;
};

export default function App() {
  const [difficulty, setDifficulty] = useState('easy');
  const [rows, setRows] = useState(defaultDifficulties.easy.rows);
  const [cols, setCols] = useState(defaultDifficulties.easy.cols);
  const [mines, setMines] = useState(defaultDifficulties.easy.mines);
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [minesLeft, setMinesLeft] = useState(mines);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [probeAvailable, setProbeAvailable] = useState(true);
  const [scanAvailable, setScanAvailable] = useState(true);
  const [scannedCells, setScannedCells] = useState({});
  const [status, setStatus] = useState(null);
  const [clickLocked, setClickLocked] = useState(false);
  const [scores, setScores] = useState([]);
  const [showScores, setShowScores] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [scoreToSave, setScoreToSave] = useState(null);
  const [explosion, setExplosion] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef(null);
  const [gameToken, setGameToken] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, limit: 10 });
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const longPressTimerRef = useRef(null);
  const isLongPressHandledRef = useRef(false);
  const [tileSize, setTileSize] = useState(30);
  const gameViewportRef = useRef(null);

  useEffect(() => {
    const calculateTileSize = () => {
      if (gameViewportRef.current) {
        const container = gameViewportRef.current;
        const style = window.getComputedStyle(container);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        
        const availableWidth = container.clientWidth - paddingX;
        const availableHeight = container.clientHeight - paddingY;
        
        const gap = 4; // Corresponds to Tailwind's `gap-1` (0.25rem = 4px)

        const widthBasedSize = (availableWidth - (cols - 1) * gap) / cols;
        const heightBasedSize = (availableHeight - (rows - 1) * gap) / rows;

        const optimalSize = Math.floor(Math.min(widthBasedSize, heightBasedSize));
        
        const newSize = Math.max(24, Math.min(48, optimalSize));

        setTileSize(newSize);
      }
    };

    const timerId = setTimeout(calculateTileSize, 0);
    window.addEventListener('resize', calculateTileSize);
    
    return () => {
      clearTimeout(timerId);
      window.removeEventListener('resize', calculateTileSize);
    };
  }, [rows, cols]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtxRef.current = null; }
    }
  }, []);

  const playTone = (freq, type = 'sine', duration = 0.12, when = 0, volume = 0.08) => {
    if (!soundOn) return; const ctx = audioCtxRef.current; if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + when);
    g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + duration + 0.02);
  };
  const playClick = () => playTone(880, 'triangle', 0.06, 0, 0.06);
  const playFlag = () => { playTone(440, 'square', 0.14, 0, 0.06); playTone(660, 'sine', 0.12, 0.04, 0.04); };
  const playPing = () => { playTone(1000, 'sine', 0.08, 0, 0.06); playTone(1400, 'sine', 0.08, 0.05, 0.04); };
  const playBoom = () => { if (!soundOn || !audioCtxRef.current) return; playTone(120, 'sawtooth', 0.5, 0, 0.12); playTone(220, 'triangle', 0.45, 0.03, 0.08); playTone(330, 'sine', 0.4, 0.06, 0.06); };
  const playVictory = () => { if (!soundOn) return; playTone(880, 'sine', 0.12, 0, 0.08); playTone(660, 'sine', 0.12, 0.14, 0.08); playTone(990, 'sine', 0.18, 0.28, 0.1); };

  const showStatus = (text, ms = 1600) => { setStatus(text); if (ms) setTimeout(() => setStatus(s => (s === text ? null : s)), ms); };
  
  const startGameSession = async () => {
    if (gameToken) return;
    try {
      const response = await fetch('/api/nebula/start-game', { method: 'POST' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP greška! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.gameToken) {
        setGameToken(data.gameToken);
      } else {
        setGameToken(null);
        showStatus('Greška pri pokretanju sesije.', 3000);
      }
    } catch (error) {
      console.error("Greška pri pokretanju sesije igre:", error.message);
      const userMessage = error.message.includes('Previše zahtjeva') ? 'Previše zahtjeva, pokušajte kasnije.' : 'Mrežna greška.';
      showStatus(userMessage, 3000);
    }
  };

  const initGame = useCallback((optDifficulty) => {
    setGameToken(null);
    const d = optDifficulty || 'easy';
    const conf = defaultDifficulties[d];
    setDifficulty(d); setRows(conf.rows); setCols(conf.cols); setMines(conf.mines);
    setBoard(createBoard(conf.rows, conf.cols, conf.mines));
    setGameOver(false); setIsWin(false); setMinesLeft(conf.mines); setTimer(0); setTimerActive(false);
    setProbeAvailable(true); setScanAvailable(true); setScannedCells({}); setStatus(null); setExplosion(null);
    startGameSession();
  }, []); 

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => { let id = null; if (timerActive) id = setInterval(() => setTimer(t => t + 1), 1000); return () => clearInterval(id); }, [timerActive]);
  
  const fetchScores = async (page = 1) => {
    setIsLoadingScores(true);
    try {
        const response = await fetch(`/api/nebula/scores?page=${page}&limit=${pagination.limit}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP greška! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            setScores(data.scores);
            setPagination(data.pagination);
        }
    } catch (error) {
        console.error("Greška pri dohvatu rezultata:", error.message);
        const userMessage = error.message.includes('Previše zahtjeva') ? 'Previše zahtjeva, pokušajte kasnije.' : 'Greška pri dohvatu rezultata.';
        showStatus(userMessage, 3000);
    } finally {
        setIsLoadingScores(false);
    }
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages && !isLoadingScores) {
        fetchScores(newPage);
    }
  };

  useEffect(() => {
    if (showScores) {
        fetchScores(1);
    }
  }, [showScores]);


  const revealAllMines = () => {
    setBoard(prevBoard => prevBoard.map(row => row.map(cell => cell.isMine ? { ...cell, isRevealed: true } : cell)));
  };

  const handleSaveScore = async () => {
    if (!gameToken) {
        showStatus('Nije moguće spremiti. Nema tokena sesije.', 3000);
        setShowNameModal(false);
        return;
    }
    const name = nameInput.trim() || 'Anon';
    const payload = { name, time: scoreToSave, difficulty, gameToken };
    try {
        const response = await fetch('/api/nebula/submit-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showStatus('Rezultat spremljen!');
            playVictory();
        } else {
            showStatus(data.message || 'Greška pri spremanju.', 3000);
        }
    } catch (error) {
        console.error("Greška pri slanju rezultata:", error);
        showStatus('Mrežna greška pri spremanju.', 3000);
    } finally {
        setShowNameModal(false);
        setNameInput('');
        setGameToken(null);
    }
  };

  const checkWin = (currentBoard) => {
    const revealed = currentBoard.reduce((acc, row) => acc + row.filter(c => c.isRevealed && !c.isMine).length, 0);
    const total = rows * cols; const nonMines = total - mines;
    if (revealed === nonMines) {
      setGameOver(true); setIsWin(true); setTimerActive(false); showStatus('Pobijedili ste!');
      setScoreToSave(timer);
      setTimeout(() => setShowNameModal(true), 800);
    }
  };

  const handleCellClick = (r, c) => {
    if (isLongPressHandledRef.current) return;
    if (clickLocked || gameOver || !board.length) return;
    const cell = board[r][c];
    if (!cell || cell.isRevealed || cell.isFlagged) return;
    setClickLocked(true);
    setTimeout(() => setClickLocked(false), 100);
    if (!timerActive) setTimerActive(true);
    if (cell.isMine) {
      setBoard(prevBoard => prevBoard.map((row, rowIndex) => row.map((cell, colIndex) => (rowIndex === r && colIndex === c) ? { ...cell, isRevealed: true } : cell)));
      setGameOver(true); setIsWin(false); setTimerActive(false);
      setExplosion({ r, c, ts: Date.now() });
      revealAllMines();
      showStatus('Boom! Mina.'); playBoom();
      return;
    }
    const newBoard = revealEmptyCells(board, r, c);
    setBoard(newBoard); playClick();
    checkWin(newBoard);
  };
  
  const handleRightClick = (e, r, c) => {
    if (e) e.preventDefault();
    if (clickLocked || gameOver || !board.length) return;
    const cell = board[r][c];
    if (!cell || cell.isRevealed) return;
    const newBoard = board.map((row, rowIndex) => {
      if (r !== rowIndex) return row;
      return row.map((cell, colIndex) => {
        if (c !== colIndex) return cell;
        return { ...cell, isFlagged: !cell.isFlagged };
      });
    });
    setBoard(newBoard);
    const flags = newBoard.flat().filter(x => x.isFlagged).length;
    setMinesLeft(Math.max(0, mines - flags));
    showStatus(newBoard[r][c].isFlagged ? 'Zastavica postavljena' : 'Zastavica uklonjena');
    playFlag();
    if (!timerActive) setTimerActive(true);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleTouchStart = (e, r, c) => { isLongPressHandledRef.current = false; longPressTimerRef.current = setTimeout(() => { handleRightClick(null, r, c); isLongPressHandledRef.current = true; }, 500); };
  const handleTouchEnd = () => { clearTimeout(longPressTimerRef.current); };
  const handleTouchMove = () => { clearTimeout(longPressTimerRef.current); };

  const useProbe = () => {
    if (clickLocked || !probeAvailable || gameOver || !board.length) return;
    const safeCells = [];
    for (let i = 0; i < rows; i++) { for (let j = 0; j < cols; j++) { if (!board[i][j].isMine && !board[i][j].isRevealed && !board[i][j].isFlagged) { safeCells.push({ r: i, c: j }); } } }
    if (!safeCells.length) { showStatus('Nema sigurnih polja za Probe.'); return; }
    const pick = safeCells[Math.floor(Math.random() * safeCells.length)];
    const newBoard = revealEmptyCells(board, pick.r, pick.c);
    setBoard(newBoard); setProbeAvailable(false); checkWin(newBoard);
    showStatus('Probe otkrio sigurno polje'); playPing();
    if (!timerActive) setTimerActive(true);
  };

  const useScan = () => {
    if (clickLocked || !scanAvailable || gameOver || !board.length) return;
    const visible = {};
    for (let i = 0; i < rows; i++) { for (let j = 0; j < cols; j++) { if (!board[i][j].isRevealed && !board[i][j].isMine) { visible[`${i}-${j}`] = board[i][j].neighborMines; } } }
    setScannedCells(visible); setScanAvailable(false); setTimeout(() => setScannedCells({}), 3000);
    showStatus('Scan aktiviran — kratki peek'); playPing();
    if (!timerActive) setTimerActive(true);
  };

  const handleReset = () => { initGame(difficulty); if (soundOn && audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume(); };
  
  const renderCellContent = (cell) => {
    if (cell.isRevealed) {
      if (cell.isMine) return ICONS.bombFilled;
      if (cell.neighborMines > 0) return <span className={`number-pop ${numberColors[cell.neighborMines]}`}>{cell.neighborMines}</span>;
    }
    return null;
  };

  const renderFrontContent = (cell, r, c) => {
    if (cell.isFlagged) return <span className="flag-bounce">{ICONS.flag}</span>;
    if (explosion && explosion.r === r && explosion.c === c) return <span className="explosion-bomb">{ICONS.bombFilled}</span>;

    if (scannedCells[`${r}-${c}`] !== undefined) {
      const val = scannedCells[`${r}-${c}`];
      const classes = 'animate-pulse text-sm font-semibold';
      return val > 0 ? <span className={`${classes} ${numberColors[val]}`}>{val}</span> : <span className="text-xs opacity-60 animate-pulse">•</span>;
    }
    return null;
  };
  
  const getCellClasses = (cell, r, c) => {
    const base = 'absolute inset-0 flex items-center justify-center font-semibold transition-transform duration-300 cursor-pointer rounded-xl select-none';
    if (cell.isRevealed) {
      if (cell.isMine && !isWin) return base + ' revealed mine revealed-mine bg-gradient-to-br from-red-700 to-red-500 shadow-inner animate-explode text-white';
      return base + ' revealed revealed-safe bg-gradient-to-br from-white/6 to-white/10 text-gray-900';
    }
    return base + ' unrevealed bg-gradient-to-br from-[#081025] to-[#050617] hover:scale-105 hover-tilt shadow-neon';
  };
  const handleKey = (e, r, c) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(r, c); } if (e.key === 'f' || e.key === 'F') { e.preventDefault(); const fakeEvent = { preventDefault: () => { } }; handleRightClick(fakeEvent, r, c); } };

  return (
    <div className="w-full h-full flex flex-col bg-black text-gray-100 font-sans relative">
      <div className="absolute inset-0 -z-10 starfield" aria-hidden="true" />
      <div className="w-full h-full mx-auto p-2 sm:p-4 flex flex-col">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
            <div className="w-full sm:w-auto">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl font-extrabold tracking-tight neon-title">NebulaMines <span className="text-xs text-gray-400">v{VERSION}</span></h1>
                    <p className="hidden sm:block text-xs text-gray-400">Nenad Dobrijevic</p>
                </div>
                <div className="mt-4 md:hidden">
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(defaultDifficulties).map(k => (
                            <button key={k} onClick={() => initGame(k)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${difficulty === k ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-200'}`}>
                                {defaultDifficulties[k].name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                <div className="rounded-lg p-2 bg-white/5 backdrop-blur flex items-center gap-3">
                    <div className="flex items-center gap-2"><span className="text-xs opacity-80">Mine:</span><strong className="text-lg">{minesLeft}</strong></div>
                    <div className="flex items-center gap-2"><span className="text-xs opacity-80">Time:</span><strong className="text-lg">{timer}s</strong></div>
                </div>
                <button onClick={handleReset} className="p-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow hover:scale-105">{gameOver ? (isWin ? ICONS.win : ICONS.lose) : ICONS.smile}</button>
                <button onClick={() => setShowScores(true) } className="px-3 py-2 rounded-lg bg-white/5 text-sm">Score</button>
                <button onClick={() => { setSoundOn(s => !s); if (!soundOn && audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume(); }} className="p-2 rounded-lg bg-white/5">{soundOn ? ICONS.soundOn : ICONS.soundOff}</button>
            </div>
        </header>

        <section className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
          <aside className="hidden md:flex md:flex-col w-full md:w-64 p-3 rounded-2xl glass-side flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-sm text-gray-300 mb-2">Težina</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(defaultDifficulties).map(k => (
                  <button key={k} onClick={() => initGame(k)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${difficulty === k ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent border border-white/10 text-gray-200 hover:bg-white/5'}`}>
                    {defaultDifficulties[k].name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm text-gray-300 mb-2">Power-ups</h3>
              <div className="flex gap-2">
                <button onClick={useProbe} disabled={!probeAvailable || gameOver} className="flex-1 px-3 py-2 rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105 bg-green-600/20 border border-green-500/30 text-green-300 disabled:bg-gray-700/20 disabled:border-gray-500/30 disabled:text-gray-400">
                  Probe (1)
                </button>
                <button onClick={useScan} disabled={!scanAvailable || gameOver} className="flex-1 px-3 py-2 rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105 bg-blue-600/20 border border-blue-500/30 text-blue-300 disabled:bg-gray-700/20 disabled:border-gray-500/30 disabled:text-gray-400">
                  Scan (1)
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-300 mb-2">Upute</h3>
              <ul className="text-xs text-gray-400 space-y-1.5 pl-1">
                <li><span className="font-bold text-gray-300">Dodir:</span> Otkrij polje</li>
                <li><span className="font-bold text-gray-300">Dugi pritisak:</span> Postavi zastavicu</li>
                <li><span className="font-bold text-gray-300">Cilj:</span> Otkrij sva sigurna polja</li>
                <li><strong className="text-green-400">Probe</strong> nasumično otkriva jedno sigurno polje.</li>
                <li><strong className="text-blue-400">Scan</strong> privremeno prikazuje brojeve na poljima.</li>
              </ul>
            </div>
          </aside>
          
          <main className="flex-1 relative min-w-0 flex flex-col min-h-0">
            <div ref={gameViewportRef} className="p-2 sm:p-4 rounded-2xl glass-main flex-1 overflow-auto game-viewport">
              <div className="w-full h-full grid place-items-center">
                  <div className="grid" style={{
                      gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
                      gap: '4px',
                  }}>
                      {board && board.length > 0 ? board.map((row, r) => row.map((cell, c) => (
                        <div 
                          key={cell.id} 
                          className="tile-wrapper" 
                          onClick={() => handleCellClick(r, c)} 
                          onContextMenu={(e) => handleRightClick(e, r, c)}
                          onTouchStart={(e) => handleTouchStart(e, r, c)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchMove}
                        >
                          <div className={getCellClasses(cell, r, c)} role="button" tabIndex={0} onKeyDown={(e) => handleKey(e, r, c)}>
                            <div className={`inner-tile ${cell.isRevealed ? 'flipped reveal-ripple' : ''}`}>
                              <div className="tile-front">{renderFrontContent(cell, r, c)}</div>
                              <div className="tile-back">{renderCellContent(cell)}</div>
                            </div>
                            {explosion && explosion.r === r && explosion.c === c && (<><div className="explosion-ring" /><div className="explosion-particles" /></>)}
                          </div>
                        </div>
                      ))) : (<div className="col-span-full text-center text-gray-400 py-6">Učitavanje ploče...</div>)}
                  </div>
              </div>
            </div>
            
            <div className="mt-4 md:hidden">
                <div className="flex gap-2">
                    <button onClick={useProbe} disabled={!probeAvailable || gameOver} className="flex-1 px-3 py-3 rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105 bg-green-600/20 border border-green-500/30 text-green-300 disabled:bg-gray-700/20 disabled:border-gray-500/30 disabled:text-gray-400">
                        Probe (1)
                    </button>
                    <button onClick={useScan} disabled={!scanAvailable || gameOver} className="flex-1 px-3 py-3 rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105 bg-blue-600/20 border border-blue-500/30 text-blue-300 disabled:bg-gray-700/20 disabled:border-gray-500/30 disabled:text-gray-400">
                        Scan (1)
                    </button>
                </div>
            </div>

          </main>
        </section>

        {status && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-2 rounded-lg text-sm text-gray-100 backdrop-blur-md shadow-lg z-50">{status}</div>)}
        
        {gameOver && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md">
                <div className="p-4 rounded-xl bg-white/5 text-center backdrop-blur-sm">
                    <h2 className="text-xl font-bold mb-1">{isWin ? 'Čestitamo!' : 'Boom!'}</h2>
                    <p className="text-gray-300 text-sm">{isWin ? `Riješeno u ${timer} sekundi.` : 'Više sreće drugi put!'}</p>
                </div>
            </div>
        )}
      </div>

      {showScores && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
            <h3 className="text-2xl font-bold mb-5 text-center text-slate-100 neon-title">Top Scores</h3>
            
            <div className="text-sm text-gray-300 min-h-[320px] overflow-auto space-y-2 pr-2">
              {isLoadingScores && <div className="text-slate-400 text-center py-10">Učitavanje...</div>}
              {!isLoadingScores && scores.length === 0 && <div className="text-slate-500 text-center py-10">Nema rezultata. Budi prvi!</div>}
              
              {!isLoadingScores && scores.map((s, i) => {
                const rank = (pagination.page - 1) * pagination.limit + i + 1;
                return (
                  <div key={`${s.created_at}-${i}`} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-transparent hover:border-slate-600 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-slate-500 w-8 text-center">#{rank}</span>
                      <div className="text-sm">
                        <div className="font-semibold text-slate-100">{s.player_name}</div>
                        <div className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('hr-HR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${difficultyColors[s.difficulty]}`}>
                        {defaultDifficulties[s.difficulty]?.name || s.difficulty}
                      </span>
                      <span className="text-lg font-mono text-sky-300 w-20 text-right">{s.score_time}s</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isLoadingScores && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-5 text-slate-300">
                    <button 
                        onClick={() => handlePageChange(pagination.page - 1)} 
                        disabled={pagination.page <= 1}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Prethodna
                    </button>
                    <span className="font-semibold">
                        Stranica {pagination.page} od {pagination.totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Sljedeća
                    </button>
                </div>
            )}
            
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowScores(false)} className="w-full px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition">Zatvori</button>
            </div>
          </div>
        </div>
      )}
      
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/20 w-full max-w-sm text-center animate-fade-in-up">
            <h3 className="text-lg font-bold mb-4">Spremi rezultat</h3>
            <p className="text-sm text-gray-300 mb-4">Unesi svoje ime:</p>
            <input type="text" className="w-full p-2 rounded-md bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Anon" onKeyDown={(e) => e.key === 'Enter' && handleSaveScore()} />
            <button onClick={handleSaveScore} className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">Spremi</button>
          </div>
        </div>
      )}

      <style>{`
        .starfield{ background-image: radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.12), transparent), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.08), transparent), linear-gradient(180deg, #001118 0%, #02040b 60%); animation: drift 60s linear infinite; background-size: cover; }
        @keyframes drift { 0% { transform: translateY(0); } 100% { transform: translateY(-200px); } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        .neon-title{ background: linear-gradient(90deg,#60a5fa,#7c3aed,#f472b6); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 18px rgba(124,58,237,0.25); }
        .glass-side, .glass-main { background: rgba(10, 20, 40, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .tile-wrapper{ perspective: 900px; width: 100%; position: relative; }
        .tile-wrapper::before{ content: ''; display:block; padding-top:100%; }
        .inner-tile{ position: absolute; inset: 0; transform-style:preserve-3d; transition: transform 380ms cubic-bezier(.2,.9,.2,1); }
        .inner-tile.flipped{ transform: rotateX(180deg); }
        .tile-front, .tile-back { 
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center; 
          border-radius: 8px; overflow:hidden; 
          -webkit-backface-visibility: hidden; backface-visibility: hidden; 
          user-select: none; -webkit-user-select: none;
        }
        .tile-front{ background: linear-gradient(180deg, #0f172a, #020617); box-shadow: 0 4px 12px rgba(2,8,23,0.5), inset 0 1px 1px rgba(255,255,255,0.05); transform: translateZ(2px); }
        .tile-back{ background: linear-gradient(180deg, #1e293b, #0f172a); transform: rotateX(180deg) translateZ(2px); }
        .revealed-safe { background: linear-gradient(180deg, #334155, #1e293b); color: #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .unrevealed:hover .inner-tile { transform: rotateX(8deg) rotateY(5deg) scale(1.05); }
        .game-viewport {
          overscroll-behavior-x: contain;
          touch-action: manipulation;
        }
        .number-pop{ font-weight:700; font-size: 1.1rem; animation: pop 380ms cubic-bezier(.2,.9,.2,1); }
        @keyframes pop{ 0%{ transform: scale(.6); opacity:0 } 60%{ transform: scale(1.08); opacity:1 } 100%{ transform: scale(1); opacity:1 } }
        .glow-1{ text-shadow: 0 0 8px rgba(96,165,250,0.3) } .glow-2{ text-shadow: 0 0 8px rgba(34,197,94,0.3) } .glow-3{ text-shadow: 0 0 8px rgba(239,68,68,0.3) } .glow-4{ text-shadow: 0 0 8px rgba(139,92,246,0.3) } .glow-5{ text-shadow: 0 0 8px rgba(245,158,11,0.3) } .glow-6{ text-shadow: 0 0 8px rgba(45,212,191,0.3) } .glow-7{ text-shadow: 0 0 8px rgba(249,115,22,0.3) } .glow-8{ text-shadow: 0 0 8px rgba(236,72,153,0.3) }
        .reveal-ripple::after{ content: ''; position:absolute; inset:0; border-radius:inherit; background: radial-gradient(circle at center, rgba(255,255,255,0.1), transparent 50%); animation: ripple 480ms ease-out; pointer-events:none; }
        @keyframes ripple{ 0%{ transform: scale(.4); opacity:0.9 } 100%{ transform: scale(1.6); opacity:0 } }
        .flag-bounce{ display:inline-block; animation: flagBounce 450ms cubic-bezier(.22,.8,.32,1); }
        @keyframes flagBounce{ 0%{ transform: translateY(6px) scale(.9); opacity:0 } 50%{ transform: translateY(-4px) scale(1.06); opacity:1 } 100%{ transform: translateY(0) scale(1); opacity:1 } }
        .explosion-ring{ position:absolute; inset:8%; border-radius:999px; pointer-events:none; box-shadow: 0 0 0 6px rgba(255,120,80,0.12); animation: ring 700ms ease-out forwards; }
        @keyframes ring{ 0%{ transform: scale(0.5); opacity:1 } 100%{ transform: scale(2.2); opacity:0 } }
        .explosion-particles{ position:absolute; inset:12%; pointer-events:none; border-radius:999px; background: radial-gradient(circle at 20% 30%, rgba(255,200,120,0.9) 0px, rgba(255,80,60,0.9) 6px, transparent 8px), radial-gradient(circle at 80% 70%, rgba(255,230,160,0.9) 0px, rgba(255,120,60,0.9) 6px, transparent 8px); animation: particles 700ms ease-out forwards; }
        @keyframes particles{ 0%{ transform: scale(0.6) translateY(0); opacity:1 } 100%{ transform: scale(1.6) translateY(-12px); opacity:0 } }
        .explosion-bomb{ transform: translateY(-4px); animation: bombPop 700ms cubic-bezier(.2,.9,.2,1); }
        @keyframes bombPop{ 0%{ transform: scale(0.2) translateY(-6px); opacity:0 } 40%{ transform: scale(1.05) translateY(0); opacity:1 } 100%{ transform: scale(1) translateY(0); opacity:1 } }
        @keyframes explodePulse{ 0%{ transform: scale(1) } 50%{ transform: scale(1.06) } 100%{ transform: scale(1) } }
        .animate-explode{ animation: explodePulse 700ms ease-in-out; }
      `}</style>
    </div>
  );
}

