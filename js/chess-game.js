(() => {
  const { el } = GIL;
  const board = document.getElementById("chess-board");
  const status = document.getElementById("chess-status");
  const level = document.getElementById("chess-level");
  const view3d = document.getElementById("chess-3d");
  const game = new Chess();
  const FILES = "abcdefgh";
  // U+FE0E keeps phones from swapping the pawn for its emoji version
  const GLYPHS = { p: "♟︎", n: "♞︎", b: "♝︎", r: "♜︎", q: "♛︎", k: "♚︎" };
  const NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  // Piece-square tables from the "simplified evaluation function" on the Chess Programming Wiki,
  // written from white's side with a8 first. Black reads them mirrored.
  // prettier-ignore
  const TABLES = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20,
      20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40,
      -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5,
      5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10,
      -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0,
      0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  // depth = how many half-moves the bot looks ahead; noise makes the easier levels blunder now and then
  const LEVELS = { 1: { depth: 1, noise: 80 }, 2: { depth: 2, noise: 15 }, 3: { depth: 3, noise: 0 } };
  const MATE = 100000;

  let selected = null;
  let targets = [];
  let lastMove = null;
  let thinking = false;
  let gameId = 0;

  const squares = {};
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const name = FILES[file] + rank;
      squares[name] = el("button", {
        type: "button",
        class: `square ${(file + rank) % 2 ? "dark" : "light"}`,
        "data-square": name,
        role: "gridcell",
      });
      board.append(squares[name]);
    }
  }

  // positive is good for white
  function evaluate() {
    let score = 0;
    game.board().forEach((row, r) =>
      row.forEach((piece, c) => {
        if (!piece) return;
        const index = piece.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
        const value = VALUES[piece.type] + TABLES[piece.type][index];
        score += piece.color === "w" ? value : -value;
      }),
    );
    return score;
  }

  // captures of valuable pieces by cheap ones first, which lets alpha-beta cut far more branches
  function ordered(moves) {
    const weight = (m) => (m.captured ? VALUES[m.captured] * 10 - VALUES[m.piece] : 0) + (m.promotion ? 800 : 0);
    return moves.sort((a, b) => weight(b) - weight(a));
  }

  // negamax with alpha-beta; `side` is 1 when white is to move, -1 for black
  function search(depth, alpha, beta, side) {
    if (depth === 0) return side * evaluate();
    const moves = game.moves({ verbose: true });
    if (!moves.length) return game.in_check() ? -MATE - depth : 0;
    let best = -Infinity;
    for (const move of ordered(moves)) {
      game.move(move);
      best = Math.max(best, -search(depth - 1, -beta, -alpha, -side));
      game.undo();
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }

  // Yields between root moves so the cursor and pets keep animating while the bot thinks.
  // Stops if a new game starts meanwhile, since the search makes and undoes moves on the shared board.
  async function chooseMove(id) {
    const { depth, noise } = LEVELS[level.value];
    const side = game.turn() === "w" ? 1 : -1;
    let best = null;
    let bestScore = -Infinity;
    for (const move of ordered(game.moves({ verbose: true }))) {
      game.move(move);
      const score = -search(depth - 1, -Infinity, Infinity, -side) + (Math.random() - 0.5) * noise;
      game.undo();
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
      await new Promise((resolve) => setTimeout(resolve));
      if (id !== gameId) return null;
    }
    return best;
  }

  function outcome() {
    if (game.in_checkmate()) return game.turn() === "w" ? "checkmate. the bot wins this one." : "checkmate. you win!";
    if (game.in_stalemate()) return "stalemate. nobody wins.";
    if (game.in_threefold_repetition()) return "draw by repetition.";
    if (game.insufficient_material()) return "draw: not enough pieces left to mate.";
    if (game.in_draw()) return "draw (50-move rule).";
    return null;
  }

  function render() {
    const checkedKing = game.in_check() ? game.turn() : null;
    for (const [name, square] of Object.entries(squares)) {
      const piece = game.get(name);
      square.replaceChildren(
        piece
          ? el("span", { class: `piece ${piece.color === "w" ? "white" : "black"}`, text: GLYPHS[piece.type] })
          : "",
      );
      square.setAttribute(
        "aria-label",
        piece ? `${name}, ${piece.color === "w" ? "white" : "black"} ${NAMES[piece.type]}` : name,
      );
      square.classList.toggle("is-selected", name === selected);
      square.classList.toggle("is-target", targets.includes(name));
      square.classList.toggle("is-capture", targets.includes(name) && Boolean(piece));
      square.classList.toggle("is-last", Boolean(lastMove) && (name === lastMove.from || name === lastMove.to));
      square.classList.toggle("is-check", piece?.type === "k" && piece.color === checkedKing);
    }
    const over = outcome();
    if (over) status.textContent = over;
    else if (thinking) status.textContent = "bot is thinking…";
    else {
      const last = lastMove?.color === "b" ? `bot played ${lastMove.san}. ` : "";
      status.textContent = `${last}${game.in_check() ? "check! " : ""}your move (white).`;
    }
  }

  async function botTurn() {
    const id = gameId;
    thinking = true;
    render();
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (id !== gameId) return;
    const move = await chooseMove(id);
    if (!move) return;
    lastMove = game.move(move);
    thinking = false;
    render();
  }

  function play(from, to) {
    lastMove = game.move({ from, to, promotion: "q" });
    selected = null;
    targets = [];
    render();
    if (!game.game_over()) botTurn();
  }

  board.addEventListener("click", (e) => {
    const square = e.target.closest(".square");
    if (!square || thinking || game.game_over() || game.turn() !== "w") return;
    const name = square.dataset.square;
    if (selected && targets.includes(name)) return play(selected, name);
    const piece = game.get(name);
    if (piece?.color === "w" && name !== selected) {
      selected = name;
      targets = game.moves({ square: name, verbose: true }).map((m) => m.to);
    } else {
      selected = null;
      targets = [];
    }
    render();
  });

  document.getElementById("chess-new").addEventListener("click", () => {
    gameId++;
    game.reset();
    selected = null;
    targets = [];
    lastMove = null;
    thinking = false;
    render();
  });

  view3d.addEventListener("click", () => {
    const on = board.parentElement.classList.toggle("is-3d");
    view3d.setAttribute("aria-pressed", String(on));
  });

  render();
})();
