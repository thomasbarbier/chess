const initialPosition = [
    ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
    ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"]
];

let boardState = JSON.parse(JSON.stringify(initialPosition)); // copie de la position
let selectedSquare = null; // case sélectionnée
let nextPlayer = "W"; // joueur qui doit jouer, les blancs commencent
let nextLegalMoves = []; // prochain coup pour la case sélectionnée
let nextSpecialMoves = []; // prochain coup pour roque ou en passant
let lastMove = null; // dernier coup joué
let isLastMoveDoubleJump = false;
let takenPieces = [];
let checkedKing = null;
let whiteKingHasMoved = false;
let blackKingHasMoved = false;
let whiteKingPos = { row: 7, col: 4 };
let blackKingPos = { row: 0, col: 4 };
let attackedSquares = [];

let rookHasMoved = { a1: false, h1: false, a8: false, h8: false };
let whitePieces = ["♖", "♘", "♗", "♕", "♔", "♙"];
let blackPieces = ["♜", "♞", "♝", "♛", "♚", "♟"];

let directionsB = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
let directionsR = [[0, 1], [0, -1], [-1, 0], [1, 0]];
let directionsQ = directionsB.concat(directionsR);

function createBoard() {
    const board = document.getElementById("chessboard");
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

    board.innerHTML = "";

    for (let row = 0; row < 8; row++) {
        const label = document.createElement("div");
        label.textContent = 8 - row; // inversé pour commencer par 8 en haut
        label.classList.add("label");
        board.appendChild(label);

        for (let col = 1; col < 9; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            square.dataset.row = row;
            square.dataset.col = col - 1;

            // couleur des cases
            if ((row + col + 1) % 2 === 0) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }

            // pièce
            square.textContent = boardState[row][col - 1];

            // clic sur une case
            square.addEventListener("click", () => handleSquareClick(row, col - 1));

            board.appendChild(square);
        }
    }
    const empty = document.createElement("div");
    board.appendChild(empty);
    letters.forEach((l) => {
        const label = document.createElement("div");
        label.textContent = l;
        label.classList.add("label");
        board.appendChild(label);
    });

    // TODO affichage des pièces mangées

    // TODO affichage du joueur à qui c'est le tour 

    // TODO affichage check and checkmate and stalemate
}

function handleSquareClick(row, col) {
    if (selectedSquare === null) {
        // Première sélection
        if (boardState[row][col] !== "" && getPieceOwner(boardState[row][col]) === nextPlayer) {
            selectedSquare = { row, col };
            selectSquare(row, col);
            console.log("Sélectionné :", boardState[row][col], row, col);

            // cherche coups possibles et highlights 
            nextLegalMoves = getLegalMoves(row, col);
            // recherche coups spéciaux possibles
            nextSpecialMoves = getSpecialMoves(row, col);
            nextSpecialMoves.forEach((m) => nextLegalMoves.push(m.destination));
            highlightSquares(nextLegalMoves);
        }
    } else {
        // test si la case sélectionnée est la même ou pas un coup jouable
        if ((selectedSquare.row === row && selectedSquare.col === col) ||
            (nextLegalMoves && !nextLegalMoves.some(move => move.row === row && move.col === col))) {
            console.log("Désélection");
            deselectSquare();
            clearHighlights();
            selectedSquare = null; // reset sélection
            nextLegalMoves = null;
            return;
        }
        // Déplacement
        const from = selectedSquare;
        var piece = boardState[from.row][from.col];

        //check si promotion d'un pion (à implémenter pour le choix de la pièce, par défaut Queen)
        // TODO 
        if (piece === "♙" && row === 0) {
            piece = "♕";
        } else if (piece === "♟" && row === 7) {
            piece = "♛";
        }

        updateBoardStatus(piece, from, { row, col });

        // move speciaux (en passant et roques)
        if (nextSpecialMoves.length !== 0 && nextSpecialMoves.some((m) => row === m.destination.row && col === m.destination.col)) {
            const specialMove = nextSpecialMoves.find((m) => row === m.destination.row && col === m.destination.col);
            if (specialMove.type === "EP") {
                // en passant
                boardState[row][col] = piece;
                boardState[from.row][from.col] = "";
                addCapturedPiece(boardState[lastMove.row][lastMove.col]);
                boardState[lastMove.row][lastMove.col] = "";
            } else if (specialMove.type === "R") {
                // roque
                console.log("On fait un roque !");
                boardState[row][col]= piece; // on bouge le roi
                boardState[specialMove.rookDestination.row][specialMove.rookDestination.col] = boardState[specialMove.rookOrigin.row][specialMove.rookOrigin.col];
                boardState[specialMove.rookOrigin.row][specialMove.rookOrigin.col] = "";
                boardState[from.row][from.col] = "";
            }
        } else {
            // déplace la pièce
            addCapturedPiece(boardState[row][col]);
            boardState[row][col] = piece;
            boardState[from.row][from.col] = "";
        }


        lastMove = { row, col };

        selectedSquare = null; // reset sélection
        createBoard(); // re-render

        //check if mate or check
        attackedSquares = getAttackedSquaresByPlayer(nextPlayer);
        //changement de joueur après le coup
        changeTurn();
        const isKingCheck = attackedSquares.filter((pos) => getPieceType(boardState[pos.row][pos.col]) === "K" && getPieceOwner(boardState[pos.row][pos.col]) === nextPlayer);
        if (isKingCheck.length != 0) {
            console.log("CHECK !!!", isKingCheck);
            checkedKing = true;
            colorInRed(isKingCheck[0].row, isKingCheck[0].col);
        }

    }
}

function updateBoardStatus(piece, from, to) {
    // cas double pas 
    isLastMoveDoubleJump = false; // reset
    if (piece === "♙" || piece === "♟") {
        if (Math.abs(from.row - to.row) === 2) {
            isLastMoveDoubleJump = true;
        }
    }
    // si tour ou roi qui bouge (pour suivi roque)
    if (piece === "♔") {
        whiteKingHasMoved = true;
        whiteKingPos = { row: to.row, col: to.col };
    } else if (piece === "♚") {
        blackKingHasMoved = true
        blackKingPos = { row: to.row, col: to.col };
    } else if (piece === "♜") {
        if (from.row === 0 && from.col === 0) {
            rookHasMoved.a8 = true;
        } else if (from.row === 0 && from.col === 7) {
            rookHasMoved.h8 = true;
        }
    } else if (piece === "♖") {
        if (from.row === 7 && from.col === 0) {
            rookHasMoved.a1 = true;
        } else if (from.row === 7 && from.col === 7) {
            rookHasMoved.h1 = true;
        }
    }
}

function getLegalMoves(row, col, board = boardState) {
    const piece = board[row][col];
    var moves = [];
    const directionsB = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const directionsR = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    const directionsQ = directionsB.concat(directionsR);
    switch (piece) {
        // cas pion (peut être factorisable)
        case "♙":
            // cas avancement classique
            if (board[row - 1][col] === "") {
                moves.push({ row: row - 1, col });
                if (row === 6 && board[4][col] === "") {
                    moves.push({ row: 4, col });
                }
            }
            // cas manger une pièce en diagonale
            if (board[row - 1][col - 1] !== "" && getPieceOwner(board[row - 1][col - 1]) !== getPieceOwner(piece)) {
                moves.push({ row: row - 1, col: col - 1 });
            }
            if (board[row - 1][col + 1] !== "" && getPieceOwner(board[row - 1][col + 1]) !== getPieceOwner(piece)) {
                moves.push({ row: row - 1, col: col + 1 });
            }
            break;
        case "♟":
            // cas avancement classique
            if (board[row + 1][col] === "") {
                moves.push({ row: row + 1, col });
                if (row === 1 && board[3][col] === "") {
                    moves.push({ row: 3, col });
                }
            }
            // cas manger une pièce en diagonale
            if (board[row + 1][col + 1] !== "" && getPieceOwner(board[row + 1][col + 1]) !== getPieceOwner(piece)) {
                moves.push({ row: row + 1, col: col + 1 });
            }
            if (board[row + 1][col - 1] !== "" && getPieceOwner(board[row + 1][col - 1]) !== getPieceOwner(piece)) {
                moves.push({ row: row + 1, col: col - 1 });
            }
            break;
        // cas chevaux
        case "♘":
        case "♞":
            moves = [{ row: row + 1, col: col + 2 }, { row: row - 1, col: col + 2 },
            { row: row + 1, col: col - 2 }, { row: row - 1, col: col - 2 },
            { row: row + 2, col: col + 1 }, { row: row - 2, col: col + 1 },
            { row: row + 2, col: col - 1 }, { row: row - 2, col: col - 1 }];
            break;
        case "♗":
        case "♝":
            moves = computeMovesForQueenRookAndBishop(directionsB, row, col, piece, board);
            break;
        case "♜":
        case "♖":
            moves = computeMovesForQueenRookAndBishop(directionsR, row, col, piece, board);
            break;
        case "♕":
        case "♛":
            moves = computeMovesForQueenRookAndBishop(directionsQ, row, col, piece, board);
            break;
        case "♔":
        case "♚":
            // check if not checked
            directionsQ.forEach((d) => moves.push(movePiece({ row, col }, d[0], d[1])));
            return moves.filter((p) => isLegal(p, piece, board));
        default:
            console.log("Erreur, pièce inconnue");
            return [];
    }
    moves = moves.filter(pos => isLegal(pos, piece, board));
    const availableMovesIfPinned = isPinned(row, col, board);
    // console.log("avalaible: ", availableMovesIfPinned);
    // console.log("Moves : ", moves);
    // vérifie les cas de clouage
    if (availableMovesIfPinned.length !== 0) {
        return moves.filter((m) => availableMovesIfPinned.some(a => a.row === m.row && a.col === m.col));
    } else {
        return moves;
    }
}

function getAttackedSquaresByAPiece(row, col, board = boardState) {
    const piece = board[row][col];
    switch (piece) {
        case "♙": // pion blanc
            return [
                { row: row - 1, col: col - 1 },
                { row: row - 1, col: col + 1 }
            ].filter(m => m.row >= 0 && m.row < 8 && m.col >= 0 && m.col < 8);

        case "♟": // pion noir
            return [
                { row: row + 1, col: col - 1 },
                { row: row + 1, col: col + 1 }
            ].filter(m => m.row >= 0 && m.row < 8 && m.col >= 0 && m.col < 8);

        default:
            // pour toutes les autres pièces, on peut réutiliser la logique des déplacements
            return getLegalMoves(row, col, board);
    }
}

function getAttackedSquaresByPlayer(player, board = boardState) {
    var attackedSquaresList = [];
    for (let rx = 0; rx < 8; rx++) {
        for (cx = 0; cx < 8; cx++) {
            if (getPieceOwner(board[rx][cx]) === player) {
                attackedSquaresList = attackedSquaresList.concat(getAttackedSquaresByAPiece(rx, cx, board));
            }
        }
    }
    // pas d'élimination des doublons car pourra être utile pour bot 
    return attackedSquaresList;
}


function getSpecialMoves(row, col) {
    const piece = boardState[row][col];
    switch (piece) {
        // en passant si un pion adverse fait double pas, manger en diagonale 
        case "♙":
            if (isLastMoveDoubleJump && row === 3) {
                if (Math.abs(lastMove.col - col) === 1) {
                    return [{ type: "EP", destination: { row: 2, col: lastMove.col } }];
                }
            }
            break;
        case "♟":
            if (isLastMoveDoubleJump && row === 4) {
                if (Math.abs(lastMove.col - col) === 1) {
                    return [{ type: "EP", destination: { row: 5, col: lastMove.col } }];
                }
            }
            break;
        case "♔":
            if (whiteKingHasMoved) {
                return [];
            } else {
                var ret = [];
                // grand roque
                if (!rookHasMoved.a1 && boardState[7][1] === "" && boardState[7][2] === "" && boardState[7][3] === ""
                    && !attackedSquares.some((p) => p.row === 7 && [1,2,3].includes(p.col))
                ) {
                    console.log("Grand roque possible !");
                    ret.push({type: "R", destination: {row:7,col:2}, rookDestination: {row:7,col:3}, rookOrigin: {row:7,col:0}});
                }
                // petit roque
                if (!rookHasMoved.a8 && boardState[7][5] === "" && boardState[7][6] === ""
                    && !attackedSquares.some((p) => p.row === 7 && [5,6].includes(p.col))) {
                    console.log("Petit roque possible !");
                    ret.push({type: "R", destination: {row:7,col:6}, rookDestination: {row:7,col:5}, rookOrigin: {row:7,col:7}});
                }
                return ret;
            }
        case "♚":
            if (blackKingHasMoved) {
                return [];
            } else {
                var ret = [];
                // grand roque
                if (!rookHasMoved.h1 && boardState[0][1] === "" && boardState[0][2] === "" && boardState[0][3] === ""
                    && !attackedSquares.some((p) => p.row === 0 && [1,2,3].includes(p.col))
                ) {
                    console.log("Grand roque possible !");
                    ret.push({type: "R", destination: {row:0,col:2}, rookDestination: {row:0,col:3}, rookOrigin: {row:0,col:0}});
                }
                // petit roque
                if (!rookHasMoved.h8 && boardState[0][5] === "" && boardState[0][6] === ""
                    && !attackedSquares.some((p) => p.row === 0 && [5,6].includes(p.col))) {
                    console.log("Petit roque possible !");
                    ret.push({type: "R", destination: {row:0,col:6}, rookDestination: {row:0,col:5}, rookOrigin: {row:0,col:7}});
                }
                return ret;
            }
        default: return [];
    }
    return [];

}

function isPinned(row, col, board = boardState) {
    const piece = board[row][col];
    if (["♔", "♚"].includes(piece)) {
        return []; // un roi ne peut pas être cloué
    }
    const pieceOwner = getPieceOwner(piece);
    const kingPosition = pieceOwner === "W" ? whiteKingPos : blackKingPos;
    const r = kingPosition.row;
    const c = kingPosition.col;
    // si la pièce est dans la même colonne
    if (c === col) {
        if (r < row) {
            // check si une pièce entre les deux 
            for (i = r + 1; i != row; i++) {
                if (board[i][c] != "") {
                    return [];
                }
            }
            // check si une tour ou reine est présente
            for (i = row + 1; i < 8; i++) {
                if (board[i][c] === "") {
                    continue;
                } else if (["Q", "R"].includes(getPieceType(board[i][c])) && pieceOwner !== getPieceOwner(board[i][c])) {
                    console.log("Cloué par : " + board[i][c]);
                    return Array(i - row + 1).fill().map((_, j) => { return { row: row + j + 1, col: c }; })
                        .concat(Array(row - r - 1).fill().map((_, j) => { return { row: r + j + 1, col: c } }));
                } else {
                    break;
                }
            }
        } else {
            // check si une pièce entre les deux 
            for (i = r - 1; i != row; i--) {
                if (board[i][c] != "") {
                    return [];
                }
            }
            // check si une tour ou reine est présente
            for (i = row - 1; i >= 0; i--) {
                if (board[i][c] === "") {
                    continue;
                } else if (["Q", "R"].includes(getPieceType(board[i][c])) && pieceOwner !== getPieceOwner(board[i][c])) {
                    console.log("Cloué par : " + board[i][c]);
                    return Array(row - i + 1).fill().map((_, j) => { return { row: row - j - 1, col: c }; })
                        .concat(Array(r - row - 1).fill().map((_, j) => { return { row: r - j - 1, col: c } }));
                } else {
                    break;
                }
            }
        }
    } else if (r === row) { // même ligne
        if (c < col) {
            // check si une pièce entre les deux 
            for (i = c + 1; i != col; i++) {
                if (board[row][i] != "") {
                    return [];
                }
            }
            // check si une tour ou reine est présente
            for (i = col + 1; i < 8; i++) {
                if (board[row][i] === "") {
                    continue;
                } else if (["Q", "R"].includes(getPieceType(board[row][i])) && pieceOwner !== getPieceOwner(board[row][i])) {
                    console.log("Cloué par : " + board[row][i]);
                    return Array(i - col + 1).fill().map((_, j) => { return { row: row, col: col + j + 1 }; })
                        .concat(Array(col - c - 1).fill().map((_, j) => { return { row: row, col: c + j + 1 } }));
                } else {
                    break;
                }
            }
        } else {
            // check si une pièce entre les deux 
            for (i = c - 1; i != col; i--) {
                if (board[row][i] != "") {
                    return [];
                }
            }
            // check si une tour ou reine est présente
            for (i = col - 1; i >= 0; i--) {
                if (board[row][i] === "") {
                    continue;
                } else if (["Q", "R"].includes(getPieceType(board[row][i])) && pieceOwner !== getPieceOwner(board[row][i])) {
                    console.log("Cloué par : " + board[row][i]);
                    return Array(col - i + 1).fill().map((_, j) => { return { row: row, col: c - j - 1 }; })
                        .concat(Array(c - col - 1).fill().map((_, j) => { return { row: row, col: c - j - 1 } }));
                } else {
                    break;
                }
            }
        }
    } else if ((r - c) === (row - col)) { // diag 1

    } else if ((r + c) === (row + col)) { // diag 2

    }

    return [];
}

function computeMovesForQueenRookAndBishop(directions, row, col, piece, board = boardState) {
    var moves = []
    directions.forEach((d) => {
        var pos = movePiece({ row, col }, d[0], d[1]);
        while (isLegal(pos, piece)) {
            moves.push(pos); // copy
            if (board[pos.row][pos.col] !== "" && getPieceOwner(board[pos.row][pos.col]) !== getPieceOwner(piece)) {
                // si on tombe sur une pièce adverse, on ne va pas plus loin
                break;
            }
            // sinon on continue d'avancer
            pos = movePiece(pos, d[0], d[1]);
        }
    });
    return moves;
}

function movePiece(pos, r, c) {
    return { row: pos.row + r, col: pos.col + c };
}

function isLegal(pos, origine, board = boardState) {
    // on ne peut pas sortir de l'échiquier
    if (pos.row < 0 || pos.row > 7 || pos.col < 0 || pos.col > 7) {
        return false;
    }
    const piece = boardState[pos.row][pos.col];
    // on ne peut pas manger sa propre pièce
    if (piece !== "" && getPieceOwner(piece) === getPieceOwner(origine)) {
        return false;
    }
    return true;
}

function getPieceOwner(piece) {
    if (!piece) return null; // case vide

    if (whitePieces.includes(piece)) {
        return "W";
    }
    if (blackPieces.includes(piece)) {
        return "B";
    }

    return null; // au cas où l'émoji ne correspond pas
}

function addCapturedPiece(piece) {
    if (!piece || piece === "") return;

    if (getPieceOwner(piece) === "W") {
        // pièce blanche mangée → ajoutée chez "captured-white"
        document.getElementById("captured-white").textContent += piece;
    } else {
        document.getElementById("captured-black").textContent += piece;
    }
}

function highlightSquares(moves) {
    if (!moves) {
        return;
    }
    moves.forEach(move => {
        const selector = `.square[data-row='${move.row}'][data-col='${move.col}']`;
        const square = document.querySelector(selector);
        if (square) {
            if (square.classList.contains("dark")) {
                square.classList.add("highlight_dark");
            } else {
                square.classList.add("highlight_light");
            }
        }
    });
}

function colorInRed(rowo, colo) {
    const selector = `.square[data-row='${rowo}'][data-col='${colo}']`;
    const square = document.querySelector(selector);
    if (square) {
        console.log("red");
        square.classList.add("checked");
    }
}

function clearHighlights() {
    document.querySelectorAll(".highlight_dark").forEach(sq => {
        sq.classList.remove("highlight_dark");
    });
    document.querySelectorAll(".highlight_light").forEach(sq => {
        sq.classList.remove("highlight_light");
    });
}

function selectSquare(row, col) {
    const selector = `.square[data-row='${row}'][data-col='${col}']`;
    const square = document.querySelector(selector);
    if (square) {
        square.classList.add("selected");
    }
}

function deselectSquare() {
    document.querySelectorAll(".selected").forEach(sq => {
        sq.classList.remove("selected");
    });
}

function changeTurn() {
    const indicator = document.getElementById("turn-indicator");
    if (nextPlayer === "W") {
        nextPlayer = "B";
        indicator.textContent = "C'est aux Noirs de jouer";
    } else {
        nextPlayer = "W";
        indicator.textContent = "C'est aux Blancs de jouer";
    }
}

function getPieceType(piece) {
    switch (piece) {
        case "♙":
        case "♟":
            return "P";
        case "♘":
        case "♞":
            return "C"; // pour cheval parce que K = king
        case "♗":
        case "♝":
            return "B";
        case "♜":
        case "♖":
            return "R";
        case "♕":
        case "♛":
            return "Q";
        case "♔":
        case "♚":
            return "K";
        default: return null;
    }
}

createBoard();
