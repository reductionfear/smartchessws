// ==UserScript==
// @name        Smart Chess Bot: The Ultimate Chess Analysis System
// @name:fr     Smart Chess Bot: Le système d'analyse ultime pour les échecs
// @namespace   sayfpack13
// @author      sayfpack13
// @version     8.6
// @homepageURL https://github.com/sayfpack13/chess-analysis-bot
// @supportURL  https://mmgc.ninja/
// @match       https://www.chess.com/*
// @match       https://lichess.org/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceText
// @grant       GM_registerMenuCommand
// @connect     *
// @description 	Our chess analysis system is designed to give players the edge they need to win. By using advanced algorithms and cutting-edge technology, our system can analyze any chess position and suggest the best possible move, helping players to make smarter and more informed decisions on the board.
// @description:fr 	Notre système d'analyse d'échecs est conçu pour donner aux joueurs l'avantage dont ils ont besoin pour gagner. En utilisant des algorithmes avancés et des technologies de pointe, notre système peut analyser n'importe quelle position d'échecs et suggérer le meilleur coup possible, aidant les joueurs à prendre des décisions plus intelligentes et plus éclairées sur l'échiquier.
// @require     https://greasyfork.org/scripts/460400-usergui-js/code/userguijs.js?version=1157130
// @resource    jquery.js       	https://cdn.jsdelivr.net/npm/jquery@3.6.3/dist/jquery.min.js
// @resource    chessboard.js   	https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script/content/chessboard.js
// @resource    chessboard.css  	https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script/content/chessboard.css
// @resource    lozza.js        	https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script/content/lozza.js
// @resource    stockfish-5.js  	https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script/content/stockfish-5.js
// @resource    stockfish-2018.js   https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script/content/stockfish-2018.js
// @run-at      document-start
// @inject-into content
// @downloadURL https://update.greasyfork.org/scripts/460147/Smart%20Chess%20Bot%3A%20The%20Ultimate%20Chess%20Analysis%20System.user.js
// @updateURL https://update.greasyfork.org/scripts/460147/Smart%20Chess%20Bot%3A%20The%20Ultimate%20Chess%20Analysis%20System.meta.js
// ==/UserScript==



// VARS
const repositoryRawURL = 'https://raw.githubusercontent.com/sayfpack13/chess-analysis-bot/main/tampermonkey%20script';
const LICHESS_API = "https://lichess.org/api/cloud-eval";
const CHESS_COM = 0;
const LICHESS_ORG = 1;


const MAX_DEPTH = 20;
const MIN_DEPTH = 1;
const MAX_MOVETIME = 2000;
const MIN_MOVETIME = 50;
const MAX_ELO = 3500;
const DEPTH_MODE = 0;
const MOVETIME_MODE = 1;
const MATE_SCORE = 10000;  // Score value for checkmate positions
const rank = ["Beginner", "Intermediate", "Advanced", "Expert", "Master", "Grand Master"];
// Web engine IDs (incompatible with Lichess due to CSP)
const WEB_ENGINE_IDS = [0, 1, 2]; // Lozza, Stockfish 5, Stockfish 2018
// Timeout for iframe sandbox engine initialization (in milliseconds)
const ENGINE_INITIALIZATION_TIMEOUT = 5000;



var nightMode = false;
var engineMode = 0;                                         // engine mode (0:depth / 1:movetime)
var engineIndex = 0;                                        // engine index (lozza => 0, stockfish => 1...)
var reload_every = 10;                                      // reload engine after x moves
var reload_engine = false;                                      // reload engine
var enableUserLog = true;                                   // enable interface log
var enableEngineLog = true;                                 // enable engine log
var displayMovesOnSite = false;                              // display moves on chess board
var show_opposite_moves = false;                            // show opponent best moves if available
var use_book_moves = false;                                 // use lichess api to get book moves
var node_engine_url = "http://localhost:5000";              // node server api url
var node_engine_name = "stockfish-15.exe"                   // default engine name (node server engine only)
var current_depth = Math.round(MAX_DEPTH / 2);              // current engine depth
var current_movetime = Math.round(MAX_MOVETIME / 3);        // current engine move time
var max_best_moves = Math.floor(current_depth / 2);
var bestMoveColors = [];

// Bullet mode settings for fast games
var bullet_mode = false;                                    // enable bullet mode for faster response
var bullet_depth = 4;                                       // lower depth for faster response in bullet mode (was 8, now 4)
var bullet_movetime = 100;                                  // movetime in ms for bullet mode (100ms max for fast response)

var lastBestMoveID = 0;



const dbValues = {
    nightMode: 'nightMode',
    engineMode: 'engineMode',
    engineIndex: 'engineIndex',
    reload_every: 'reload_every',
    reload_engine: 'reload_engine',
    enableUserLog: 'enableUserLog',
    enableEngineLog: 'enableEngineLog',
    displayMovesOnSite: 'displayMovesOnSite',
    show_opposite_moves: "show_opposite_moves",
    use_book_moves: "use_book_moves",
    node_engine_url: "node_engine_url",
    node_engine_name: "node_engine_name",
    current_depth: "current_depth",
    current_movetime: "current_movetime",
    max_best_moves: "max_best_moves",
    bestMoveColors: "bestMoveColors",
    bullet_mode: "bullet_mode",
    bullet_depth: "bullet_depth",
    bullet_movetime: "bullet_movetime"
};


var Gui;
var closedGui = false;
var reload_count = 1;
var node_engine_id = 3;
var lichess_cloud_engine_id = 4;
var Interface = null;
var LozzaUtils = null;
var CURRENT_SITE = null;
var boardElem = null;
var firstPieceElem = null;
const MAX_LOGS = 50;


var initialized = false;
var firstMoveMade = false;

var forcedBestMove = false;
var engine = null;
var engineObjectURL = null;
var lastEngine = engineIndex;

var chessBoardElem = null;
var turn = '-';
var last_turn = null;
var playerColor = null;
var lastPlayerColor = null;
var isPlayerTurn = null;
var lastFen = null;

var uiChessBoard = null;

var activeGuiMoveHighlights = [];
var activeSiteMoveHighlights = [];

// Track the last FEN when highlights were shown to prevent premature clearing
var lastHighlightedFen = null;
var lastHighlightTime = 0;
const MIN_HIGHLIGHT_DISPLAY_MS = 500; // Show highlights for at least 500ms

// Request throttling to prevent excessive analysis requests
var lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 200; // Max 5 requests per second

// Minimum depth threshold for quality warning
const MIN_DEPTH_THRESHOLD = 10;

var engineLogNum = 1;
var userscriptLogNum = 1;
var enemyScore = 0;
var myScore = 0;

var possible_moves = [];

var updatingBestMove = false;

// style
const defaultFromSquareStyle = 'border: 4px solid rgb(0 0 0 / 50%);';
const defaultToSquareStyle = 'border: 4px dashed rgb(0 0 0 / 50%);';


// Start function
function isNotCompatibleBrowser() {
    return navigator.userAgent.toLowerCase().includes("firefox")
}

onload = function () {
    if (isNotCompatibleBrowser()) {
        Gui = new UserGui;
    }

    const waitingMessage = document.createElement('div');
    waitingMessage.style.position = 'fixed';
    waitingMessage.style.bottom = '0';
    waitingMessage.style.left = '0';
    waitingMessage.style.right = '0';
    waitingMessage.style.backgroundColor = 'rgba(255, 54, 54, 0.7)';
    waitingMessage.style.color = '#fff';
    waitingMessage.style.padding = '10px';
    waitingMessage.style.fontSize = '2rem';
    waitingMessage.style.textAlign = 'center';
    waitingMessage.textContent = '♟️ Smart Chess Bot is waiting for your game ♟️';
    waitingMessage.style.zIndex = "100000";
    document.body.appendChild(waitingMessage);



    const waitForChessBoard = setInterval(() => {
        if (CURRENT_SITE) {
            return;
        }

        if (window.location.href.includes("lichess.org")) {
            const mainBoard = document.querySelector('.round__app__board.main-board');
            if (mainBoard && mainBoard.querySelector('piece')) {
                CURRENT_SITE = LICHESS_ORG;
                boardElem = mainBoard;
                firstPieceElem = mainBoard.querySelector('piece');
            }
        }
        else if (window.location.href.includes("chess.com")) {
            if (document.querySelector('.board').querySelector(".piece")) {
                CURRENT_SITE = CHESS_COM;
                boardElem = document.querySelector('.board');
                firstPieceElem = document.querySelector('.piece');
            }
        }

        if (boardElem && firstPieceElem && chessBoardElem != boardElem) {
            chessBoardElem = boardElem;

            initialize();

            waitingMessage.style.display = 'none';

            clearInterval(waitForChessBoard);
        }
    }, 2000);
}

if (!isNotCompatibleBrowser()) {
    Gui = new UserGui;
} else {
    onload();
}





function moveResult(from, to, power, clear = true, depth = null) {
    if (from.length < 2 || to.length < 2) {
        return;
    }

    if (clear) {
        clearBoard(true); // Force clear for new move result
    }

    // Track the FEN and time when highlights are shown (lastFen is set by updateBestMove before this is called)
    lastHighlightedFen = lastFen;
    lastHighlightTime = Date.now();

    if (!forcedBestMove) {
        if (isPlayerTurn) // my turn
            myScore = myScore + Number(power);
        else
            enemyScore = enemyScore + Number(power);

        Interface.boardUtils.updateBoardPower(myScore, enemyScore);
    } else {
        forcedBestMove = false;
        Gui.document.querySelector('#bestmove-btn').disabled = false;
    }

    // Log depth warning if analysis depth is shallow (only when depth is explicitly provided)
    if (depth !== null && Number(depth) < MIN_DEPTH_THRESHOLD) {
        Interface.log(`⚠️ Warning: Analysis depth only ${depth}, results may be unreliable`);
    }

    const color = hexToRgb(bestMoveColors[0]);
    Interface.boardUtils.markMove(from, to, color);


    // other suggested moves
    for (let a = 0; a < possible_moves.length; a++) {
        const color = hexToRgb(bestMoveColors[a]);
        Interface.boardUtils.markMove(possible_moves[a].slice(0, 2), possible_moves[a].slice(2, 4), color);
    }


    Interface.stopBestMoveProcessingAnimation();
}

function hexToRgb(hex) {
    // Fallback to green if hex is undefined
    if (!hex) {
        return [0, 255, 0, 0.5]; // Default green
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 0.5];
}



function getBookMoves(request) {
    Interface.log('Checking book moves from Lichess API...');

    GM_xmlhttpRequest({
        method: "GET",
        url: LICHESS_API + "?fen=" + encodeURIComponent(request.fen) + "&multiPv=1&variant=fromPosition",
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            // Check if response is stale - verify position hasn't changed
            const FenUtil = new FenUtils();
            const currentFen = FenUtil.getFen();
            if (currentFen !== request.fen) {
                Interface.log('Position changed, discarding book move response');
                return;
            }
            
            if (response.response.includes("error") || !response.ok) {
                if (lastBestMoveID != request.id) {
                    Interface.log('Ignoring stale book move response');
                    return;
                }
                Interface.log('No book move found, using engine analysis...');
                getBestMoves(request);
            } else {
                if (lastBestMoveID != request.id) {
                    Interface.log('Ignoring stale book move response');
                    return;
                }

                let data = JSON.parse(response.response);
                let nextMove = data.pvs[0].moves.split(' ')[0];
                let depth = data.depth || current_depth;

                Interface.log(`Book move found: ${nextMove} (depth ${depth})`);

                possible_moves = [];
                moveResult(nextMove.slice(0, 2), nextMove.slice(2, 4), depth, true, depth);
            }


        }, onerror: function (error) {
            // Check if response is stale
            if (lastBestMoveID != request.id) {
                return;
            }
            getBestMoves(request);

        }
    });

}

function getLichessCloudBestMoves(request) {
    // Use multiPv for multiple move suggestions (capped at 5 for cloud API)
    const multiPv = Math.min(max_best_moves + 1, 5);

    // Construct full URL for logging
    const fullUrl = LICHESS_API + "?fen=" + encodeURIComponent(request.fen) + "&multiPv=" + multiPv + "&variant=fromPosition";
    Interface.log(`Lichess Cloud request URL: ${fullUrl}`);

    GM_xmlhttpRequest({
        method: "GET",
        url: fullUrl,
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            // Check if response is stale - verify position hasn't changed
            const FenUtil = new FenUtils();
            const currentFen = FenUtil.getFen();
            if (currentFen !== request.fen) {
                Interface.log('Position changed, discarding Lichess Cloud analysis');
                return;
            }
            
            // Also check request ID
            if (lastBestMoveID != request.id) {
                Interface.log('Ignoring stale response (request ID mismatch)');
                return;
            }

            Interface.log('Received response from Lichess Cloud API');

            // Check HTTP status code for error responses
            if (!response.response || response.status !== 200) {
                // Fallback to node server if cloud API fails
                Interface.log('Lichess Cloud API unavailable, falling back to Node Server...');
                getNodeBestMoves(request);
                return;
            }

            try {
                let data = JSON.parse(response.response);

                if (!data.pvs || data.pvs.length === 0) {
                    Interface.log('No analysis available from Lichess Cloud, trying Node Server...');
                    getNodeBestMoves(request);
                    return;
                }

                // Get the best move from the first PV line
                let bestPv = data.pvs[0];
                let nextMove = bestPv.moves.split(' ')[0];
                let depth = data.depth || current_depth;
                let score = bestPv.cp !== undefined ? bestPv.cp : (bestPv.mate !== undefined ? (bestPv.mate > 0 ? MATE_SCORE : -MATE_SCORE) : 0);

                // Extract additional best moves for highlighting
                possible_moves = [];
                for (let i = 1; i < data.pvs.length && i <= max_best_moves; i++) {
                    let pvMove = data.pvs[i].moves.split(' ')[0];
                    if (pvMove && pvMove.length >= 4) {
                        possible_moves.push(pvMove);
                    }
                }

                Interface.updateBestMoveProgress(`Cloud Depth: ${depth}`);
                Interface.engineLog("bestmove " + nextMove + " (Lichess Cloud, depth " + depth + ", score " + score + ")");
                Interface.log(`Analysis complete: depth ${depth}, move ${nextMove}`);

                // Pass depth to moveResult for depth warning
                moveResult(nextMove.slice(0, 2), nextMove.slice(2, 4), depth, true, depth);

            } catch (e) {
                Interface.log('Error parsing Lichess Cloud response: ' + e.message);
                getNodeBestMoves(request);
            }

        },
        onerror: function (error) {
            if (lastBestMoveID != request.id) {
                return;
            }
            Interface.log('Lichess Cloud API error, falling back to Node Server...');
            getNodeBestMoves(request);
        }
    });
}

function getNodeBestMoves(request) {
    // Apply bullet settings if bullet mode is enabled
    const effectiveDepth = bullet_mode ? Math.min(current_depth, bullet_depth) : current_depth;
    const effectiveMovetime = bullet_mode ? bullet_movetime : current_movetime;
    
    // Add bullet_mode parameter to URL
    const bulletParam = bullet_mode ? '&bullet_mode=true' : '';
    
    // Calculate the correct turn for the engine: last_turn is who just moved,
    // so the engine should analyze for the opposite color (whose turn is next)
    const engineTurn = last_turn ? (last_turn === 'w' ? 'b' : 'w') : turn;
    
    // Construct full URL for logging and debugging
    const fullUrl = node_engine_url + "/getBestMove?fen=" + encodeURIComponent(request.fen) + "&engine_mode=" + engineMode + "&depth=" + effectiveDepth + "&movetime=" + effectiveMovetime + "&turn=" + engineTurn + "&engine_name=" + node_engine_name + bulletParam;
    Interface.log(`Node Server request URL: ${fullUrl}`);

    GM_xmlhttpRequest({
        method: "GET",
        url: fullUrl,
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            const result = JSON.parse(response.response);
            if (result.success == "false") {
                forcedBestMove = false;
                Gui.document.querySelector('#bestmove-btn').disabled = false;
                return Interface.log("Error: " + result.data);
            }

            // Check if response is stale - verify position hasn't changed
            const FenUtil = new FenUtils();
            const currentFen = FenUtil.getFen();
            if (currentFen !== request.fen) {
                Interface.log('Position changed, discarding Node Server analysis');
                return;
            }
            
            // Also check request ID
            if (lastBestMoveID != request.id) {
                Interface.log('Ignoring stale response (request ID mismatch)');
                return;
            }

            Interface.log('Received response from Node Server');

            let data = result.data;
            let server_fen = data.fen;
            let depth = data.depth;
            let movetime = data.movetime;
            let power = data.score;
            let move = data.bestMove;
            let ponder = data.ponder

            // Log the actual depth achieved vs requested
            if (engineMode == DEPTH_MODE) {
                Interface.updateBestMoveProgress(`Depth: ${depth}`);
                Interface.log(`Analysis complete: requested depth ${effectiveDepth}, achieved depth ${depth}`);
            } else {
                Interface.updateBestMoveProgress(`Move time: ${movetime} ms`);
                Interface.log(`Analysis complete: movetime ${movetime}ms, depth ${depth}`);
            }

            Interface.engineLog("bestmove " + move + " ponder " + ponder + " (depth " + depth + ", score " + power + ")");


            possible_moves = [];
            // Pass depth to moveResult for depth warning
            moveResult(move.slice(0, 2), move.slice(2, 4), power, true, depth);
        }, onerror: function (error) {
            forcedBestMove = false;
            Gui.document.querySelector('#bestmove-btn').disabled = false;
            Interface.log("make sure node server is running !!");
        }
    });

}

function getElo() {
    let elo;
    if (engineMode == DEPTH_MODE) {
        elo = MAX_ELO / MAX_DEPTH;
        elo *= current_depth;
    } else {
        elo = MAX_ELO / MAX_MOVETIME;
        elo *= current_movetime;
    }
    elo = Math.round(elo);

    return elo;
}

function getRank() {
    let part;
    if (engineMode == DEPTH_MODE) {
        part = current_depth / (MAX_DEPTH / rank.length);
    } else {
        part = current_movetime / (MAX_MOVETIME / rank.length);
    }
    part = Math.round(part);

    if (part >= rank.length) {
        part = rank.length - 1;
    }

    return rank[part];
}



function setEloDescription(eloElem) {
    eloElem.querySelector("#value").innerText = `Elo: ${getElo()}`;
    eloElem.querySelector("#rank").innerText = `Rank: ${getRank()}`;
    eloElem.querySelector("#power").innerText = engineMode == DEPTH_MODE ? `Depth: ${current_depth}` : `Move Time: ${current_movetime}`;
}







Gui.settings.window.title = 'Smart Chess Bot';
Gui.settings.window.external = true;
Gui.settings.window.size.width = 500;
Gui.settings.gui.external.popup = false;
Gui.settings.gui.external.style += GM_getResourceText('chessboard.css');
Gui.settings.gui.external.style += `
div[class^='board'] {
    background-color: black;
}
body {
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: 360px;
}
#fen {
    margin-left: 10px;
}
#engine-log-container {
    max-height: 35vh;
    overflow: auto!important;
}
#userscript-log-container {
    max-height: 35vh;
    overflow: auto!important;
}
.sideways-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.rendered-form .card {
    margin-bottom: 10px;
}
.hidden {
    display: none;
}
.main-title-bar {
    display: flex;
    justify-content: space-between;
}
@keyframes wiggle {
    0% { transform: scale(1); }
   80% { transform: scale(1); }
   85% { transform: scale(1.1); }
   95% { transform: scale(1); }
  100% { transform: scale(1); }
}

.wiggle {
  display: inline-block;
  animation: wiggle 1s infinite;
}
`;


function alphabetPosition(text) {
    return text.charCodeAt(0) - 97;
}

// Helper function to check if the Lichess board is flipped (playing as black)
function isLichessBoardFlipped() {
    return document.querySelector(".orientation-white") === null;
}


function FenUtils() {
    // Constants for Lichess position extraction
    const SQUARE_SIZE_PERCENT = 12.5; // Each square is 12.5% (100% / 8 squares)
    const DEFAULT_BOARD_SIZE = 400; // Default board size in pixels when dimensions cannot be determined
    const STYLE_TOP_REGEX = /top:\s*(\d+(?:\.\d+)?)\s*%/;
    const STYLE_LEFT_REGEX = /left:\s*(\d+(?:\.\d+)?)\s*%/;
    // Regex for transform: translate(Xpx, Ypx) or translate3d(Xpx, Ypx, Zpx)
    const TRANSFORM_REGEX = /transform:\s*translate(?:3d)?\(\s*(-?\d+(?:\.\d+)?)\s*px\s*,\s*(-?\d+(?:\.\d+)?)\s*px(?:\s*,\s*-?\d+(?:\.\d+)?\s*px)?\)/;
    // Regex for parsing container dimensions
    const STYLE_WIDTH_REGEX = /width:\s*(\d+(?:\.\d+)?)\s*px/;
    const STYLE_HEIGHT_REGEX = /height:\s*(\d+(?:\.\d+)?)\s*px/;
    const PIECE_TYPES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    const BOARD_MIN = 0;
    const BOARD_MAX = 7;
    
    this.board = [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
    ];

    this.pieceCodeToFen = pieceStr => {
        let [pieceColor, pieceName] = pieceStr.split('');

        return pieceColor == 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
    }

    this.getFenCodeFromPieceElem = pieceElem => {
        if (CURRENT_SITE == CHESS_COM) {
            return this.pieceCodeToFen([...pieceElem.classList].find(x => x.match(/^(b|w)[prnbqk]{1}$/)));
        } else if (CURRENT_SITE == LICHESS_ORG) {
            // Extract piece info from class list (e.g., "white rook" or "black knight")
            // Find the color and piece type classes
            const classList = [...pieceElem.classList];
            let pieceColor = null;
            let pieceName = null;
            
            // Look for color class (white/black)
            if (classList.includes('white')) {
                pieceColor = 'white';
            } else if (classList.includes('black')) {
                pieceColor = 'black';
            }
            
            // Look for piece type class
            for (const type of PIECE_TYPES) {
                if (classList.includes(type)) {
                    pieceName = type;
                    break;
                }
            }
            
            // If not found in classList, fall back to className parsing
            if (!pieceColor || !pieceName) {
                // Search for known patterns in className string
                const classStr = pieceElem.className.toLowerCase();
                if (classStr.includes('white')) {
                    pieceColor = 'white';
                } else if (classStr.includes('black')) {
                    pieceColor = 'black';
                }
                
                for (const type of PIECE_TYPES) {
                    if (classStr.includes(type)) {
                        pieceName = type;
                        break;
                    }
                }
            }
            
            // If still unable to determine piece type, return null to skip this piece
            if (!pieceColor || !pieceName) {
                return null;
            }

            // fix pieceName
            if (pieceName == "knight") {
                pieceName = "n"
            }

            let pieceText = pieceColor[0] + pieceName[0];
            return this.pieceCodeToFen(pieceText)
        }
    }

    this.getPieceColor = pieceFenStr => {
        return pieceFenStr == pieceFenStr.toUpperCase() ? 'w' : 'b';
    }

    this.getPieceOppositeColor = pieceFenStr => {
        return this.getPieceColor(pieceFenStr) == 'w' ? 'b' : 'w';
    }

    this.squeezeEmptySquares = fenStr => {
        return fenStr.replace(/11111111/g, '8')
            .replace(/1111111/g, '7')
            .replace(/111111/g, '6')
            .replace(/11111/g, '5')
            .replace(/1111/g, '4')
            .replace(/111/g, '3')
            .replace(/11/g, '2');
    }

    this.posToIndex = pos => {
        let [x, y] = pos.split('');

        return { 'y': 8 - y, 'x': 'abcdefgh'.indexOf(x) };
    }

    this.getBoardPiece = pos => {
        let indexObj = this.posToIndex(pos);

        return this.board[indexObj.y][indexObj.x];
    }

    this.getRights = () => {
        let rights = '';

        // check for white
        let e1 = this.getBoardPiece('e1'),
            h1 = this.getBoardPiece('h1'),
            a1 = this.getBoardPiece('a1');

        if (e1 == 'K' && h1 == 'R') rights += 'K';
        if (e1 == 'K' && a1 == 'R') rights += 'Q';

        //check for black
        let e8 = this.getBoardPiece('e8'),
            h8 = this.getBoardPiece('h8'),
            a8 = this.getBoardPiece('a8');

        if (e8 == 'k' && h8 == 'r') rights += 'k';
        if (e8 == 'k' && a8 == 'r') rights += 'q';

        return rights ? rights : '-';
    }




    this.getBasicFen = () => {
        let pieceElems = null;

        if (CURRENT_SITE == CHESS_COM) {
            pieceElems = [...chessBoardElem.querySelectorAll('.piece')];


        } else if (CURRENT_SITE == LICHESS_ORG) {
            pieceElems = [...chessBoardElem.querySelectorAll('piece')];
        }


        pieceElems.filter(pieceElem => !pieceElem.classList.contains("ghost")).forEach(pieceElem => {
            let pieceFenCode = this.getFenCodeFromPieceElem(pieceElem);

            // Skip piece if we couldn't determine its type
            if (!pieceFenCode) {
                return;
            }

            if (CURRENT_SITE == CHESS_COM) {
                let [xPos, yPos] = pieceElem.classList.toString().match(/square-(\d)(\d)/).slice(1);

                this.board[8 - yPos][xPos - 1] = pieceFenCode;
            } else if (CURRENT_SITE == LICHESS_ORG) {
                // Check board orientation to properly map visual positions to FEN coordinates
                const flipped = isLichessBoardFlipped();
                
                // Try to get position from cgKey property set by Chessground
                if (pieceElem.cgKey) {
                    let [xPos, yPos] = pieceElem.cgKey.split('');
                    this.board[8 - yPos][alphabetPosition(xPos)] = pieceFenCode;
                } else {
                    // Fallback: Extract position from style attribute if cgKey is not available
                    const style = pieceElem.getAttribute('style');
                    if (style) {
                        // Try transform: translate() first (pixel-based positioning)
                        const transformMatch = style.match(TRANSFORM_REGEX);
                        if (transformMatch) {
                            const xPixels = parseFloat(transformMatch[1]);
                            const yPixels = parseFloat(transformMatch[2]);
                            
                            // Get board dimensions from cg-container
                            const cgContainer = chessBoardElem.querySelector('cg-container');
                            if (cgContainer) {
                                const containerStyle = cgContainer.getAttribute('style') || '';
                                const widthMatch = containerStyle.match(STYLE_WIDTH_REGEX);
                                const heightMatch = containerStyle.match(STYLE_HEIGHT_REGEX);
                                
                                // Default to common board size if not found in style
                                const boardWidth = widthMatch ? parseFloat(widthMatch[1]) : cgContainer.clientWidth || DEFAULT_BOARD_SIZE;
                                const boardHeight = heightMatch ? parseFloat(heightMatch[1]) : cgContainer.clientHeight || DEFAULT_BOARD_SIZE;
                                
                                const squareWidth = boardWidth / 8;
                                const squareHeight = boardHeight / 8;
                                
                                // Convert pixel position to visual board coordinates (0-7)
                                let visualX = Math.floor(xPixels / squareWidth);
                                let visualY = Math.floor(yPixels / squareHeight);
                                
                                // Convert visual coordinates to FEN coordinates based on orientation
                                let fenX, fenY;
                                if (!flipped) {
                                    // White's view: visual coordinates match FEN coordinates
                                    fenX = visualX;
                                    fenY = visualY;
                                } else {
                                    // Black's view: board is flipped, so invert both axes
                                    fenX = 7 - visualX;
                                    fenY = 7 - visualY;
                                }
                                
                                // Bounds checking to ensure coordinates are valid
                                if (fenY >= BOARD_MIN && fenY <= BOARD_MAX && fenX >= BOARD_MIN && fenX <= BOARD_MAX) {
                                    this.board[fenY][fenX] = pieceFenCode;
                                }
                            }
                        } else {
                            // Fallback: try top/left percentage positioning
                            const topMatch = style.match(STYLE_TOP_REGEX);
                            const leftMatch = style.match(STYLE_LEFT_REGEX);
                            
                            if (topMatch && leftMatch) {
                                const topPercent = parseFloat(topMatch[1]);
                                const leftPercent = parseFloat(leftMatch[1]);
                                
                                // Convert percentage to visual board coordinates (0-7)
                                let visualY = Math.floor(topPercent / SQUARE_SIZE_PERCENT);
                                let visualX = Math.floor(leftPercent / SQUARE_SIZE_PERCENT);
                                
                                // Convert visual coordinates to FEN coordinates based on orientation
                                let fenX, fenY;
                                if (!flipped) {
                                    // White's view: visual coordinates match FEN coordinates
                                    fenX = visualX;
                                    fenY = visualY;
                                } else {
                                    // Black's view: board is flipped, so invert both axes
                                    fenX = 7 - visualX;
                                    fenY = 7 - visualY;
                                }
                                
                                // Bounds checking to ensure coordinates are valid
                                if (fenY >= BOARD_MIN && fenY <= BOARD_MAX && fenX >= BOARD_MIN && fenX <= BOARD_MAX) {
                                    this.board[fenY][fenX] = pieceFenCode;
                                }
                            }
                        }
                    }
                }
            }
        });

        let basicFen = this.squeezeEmptySquares(this.board.map(x => x.join('')).join('/'));



        return basicFen;
    }


    this.getFen = () => {
        let basicFen = this.getBasicFen();
        let rights = this.getRights();

        // Extract the turn from the FEN string
        let turn = this.getTurnFromFen(basicFen);

        return `${basicFen} ${turn} ${rights} - 0 1`;
    };

    this.getTurnFromFen = (fen) => {
        // The turn is the second part of the FEN string
        const fenTurn = fen.split(' ')[1];
        if (fenTurn) {
            return fenTurn;
        }
        // last_turn represents who just moved, so we need the opposite (whose turn is next)
        // If Black just moved (last_turn=b), it's White's turn (w) and vice versa
        if (last_turn) {
            return last_turn === 'w' ? 'b' : 'w';
        }
        return turn;
    };
}



function InterfaceUtils() {
    this.boardUtils = {
        findSquareElem: (squareCode) => {
            if (!Gui?.document) return;

            return Gui.document.querySelector(`.square-${squareCode}`);
        },
        markMove: (fromSquare, toSquare, rgba_color) => {
            if (!Gui?.document) return;

            let fromElem = toElem = null;


            if (CURRENT_SITE == CHESS_COM) {
                [fromElem, toElem] = [this.boardUtils.findSquareElem(fromSquare), this.boardUtils.findSquareElem(toSquare)];


                if (!isNotCompatibleBrowser()) {
                    fromElem.style.scale = 0.8;
                    toElem.style.scale = 0.9;
                    fromElem.style.backgroundColor = `rgb(${rgba_color[0]},${rgba_color[1]},${rgba_color[2]})`;
                    toElem.style.backgroundColor = `rgb(${rgba_color[0]},${rgba_color[1]},${rgba_color[2]})`;



                    activeGuiMoveHighlights.push(fromElem);
                    activeGuiMoveHighlights.push(toElem);
                }

            }

            if (displayMovesOnSite || (!isPlayerTurn && show_opposite_moves)) {
                markMoveToSite(fromSquare, toSquare, rgba_color);
            }
        },
        removeBestMarkings: () => {
            if (!Gui?.document) return;

            activeGuiMoveHighlights.forEach(elem => {
                elem.style.scale = 1.0;
                elem.style.backgroundColor = "";
            });

            activeGuiMoveHighlights = [];
        },
        updateBoardFen: fen => {
            if (!Gui?.document) return;

            Gui.document.querySelector('#fen').textContent = fen.slice(0, fen.lastIndexOf('-') - 1);
        },
        updateBoardPower: (myScore, enemyScore) => {
            if (!Gui?.document) return;

            Gui.document.querySelector('#enemy-score').textContent = enemyScore;
            Gui.document.querySelector('#my-score').textContent = myScore;
        },
        updateBoardOrientation: orientation => {
            if (!Gui?.document) return;

            const orientationElem = Gui?.document?.querySelector('#orientation');

            if (orientationElem) {
                orientationElem.textContent = orientation;
            }
        }
    }

    this.engineLog = str => {
        if (!Gui?.document || enableEngineLog == false) return;

        const logElem = document.createElement('div');
        logElem.classList.add('list-group-item');

        if (str.includes('info')) logElem.classList.add('list-group-item-info');
        if (str.includes('bestmove')) logElem.classList.add('list-group-item-success');

        logElem.innerText = `#${engineLogNum++} ${str}`;

        if (engineLogNum > MAX_LOGS) {
            Gui.document.querySelector('#engine-log-container').lastChild.remove();
        }

        Gui.document.querySelector('#engine-log-container').prepend(logElem);


    }

    this.log = str => {
        if (!Gui?.document || enableUserLog == false) return;

        const logElem = document.createElement('div');
        logElem.classList.add('list-group-item');

        if (str.includes('info')) logElem.classList.add('list-group-item-info');
        if (str.includes('bestmove')) logElem.classList.add('list-group-item-success');

        const container = Gui?.document?.querySelector('#userscript-log-container');

        if (container) {
            logElem.innerText = `#${userscriptLogNum++} ${str}`;

            if (userscriptLogNum > MAX_LOGS) {
                container.lastChild.remove();
            }


            container.prepend(logElem);
        }
    }

    this.getBoardOrientation = () => {
        if (CURRENT_SITE == CHESS_COM) {
            return document.querySelector('.board.flipped') ? 'b' : 'w';
        } else if (CURRENT_SITE == LICHESS_ORG) {
            return document.querySelector(".orientation-white") !== null ? 'w' : 'b'
        }

    }

    this.updateBestMoveProgress = text => {
        if (!Gui?.document || isNotCompatibleBrowser() || CURRENT_SITE === LICHESS_ORG) return;

        const progressBarElem = Gui.document.querySelector('#best-move-progress');

        progressBarElem.innerText = text;

        progressBarElem.classList.remove('hidden');
        progressBarElem.classList.add('wiggle');
    }

    this.stopBestMoveProcessingAnimation = () => {
        if (!Gui?.document || isNotCompatibleBrowser() || CURRENT_SITE === LICHESS_ORG) return;

        const progressBarElem = Gui.document.querySelector('#best-move-progress');

        progressBarElem.classList.remove('wiggle');
    }

    this.hideBestMoveProgress = () => {
        if (!Gui?.document || isNotCompatibleBrowser() || CURRENT_SITE === LICHESS_ORG) return;

        const progressBarElem = Gui.document.querySelector('#best-move-progress');

        if (!progressBarElem.classList.contains('hidden')) {
            progressBarElem.classList.add('hidden');
            this.stopBestMoveProcessingAnimation();
        }
    }
}

function LozzaUtility() {
    this.separateMoveCodes = moveCode => {
        moveCode = moveCode.trim();

        let move = moveCode.split(' ')[1];

        return [move.slice(0, 2), move.slice(2, 4)];
    }

    this.extractInfo = str => {

        const keys = ['time', 'nps', 'depth', 'pv'];

        return keys.reduce((acc, key) => {
            let match = str.match(`${key} (\\d+)`);


            if (match) {
                acc[key] = (match[1]);
            }

            return acc;
        }, {});
    }
}

function fenSquareToChessComSquare(fenSquareCode) {
    const [x, y] = fenSquareCode.split('');

    return `square-${['abcdefgh'.indexOf(x) + 1]}${y}`;
}

function markMoveToSite(fromSquare, toSquare, rgba_color) {
    const highlight = (fenSquareCode, style, rgba_color) => {

        let squareClass = highlightElem = existingHighLight = parentElem = null

        if (CURRENT_SITE == CHESS_COM) {
            squareClass = fenSquareToChessComSquare(fenSquareCode);

            highlightElem = document.createElement('div');
            highlightElem.classList.add('custom');
            highlightElem.classList.add('highlight');
            highlightElem.classList.add(squareClass);
            highlightElem.dataset.testElement = 'highlight';
            highlightElem.style = style;
            highlightElem.style.backgroundColor = `rgba(${rgba_color[0]},${rgba_color[1]},${rgba_color[2]},${rgba_color[3]})`;
            // Allow clicks to pass through highlight to the board underneath
            highlightElem.style.pointerEvents = 'none';


            activeSiteMoveHighlights.push(highlightElem);



            existingHighLight = document.querySelector(`.highlight.${squareClass}`);


            if (existingHighLight) {
                existingHighLight.remove();
            }

            parentElem = chessBoardElem;

        } else if (CURRENT_SITE == LICHESS_ORG) {
            // check if flipped white: false  / black: true
            const flipped = isLichessBoardFlipped();

            // Use percentage-based positioning to match Lichess's native piece positioning
            const SQUARE_PERCENT = 100 / 8; // Each square is 12.5% of the board
            let left_percent, top_percent;

            if (!flipped) {
                // player has white side
                // File a=0%, h=87.5%; Rank 1=87.5% (bottom), Rank 8=0% (top)
                left_percent = alphabetPosition(fenSquareCode[0]) * SQUARE_PERCENT;
                top_percent = (8 - Number(fenSquareCode[1])) * SQUARE_PERCENT;
            } else {
                // black side (board is flipped)
                // File a=87.5% (right), h=0% (left); Rank 1=0% (top), Rank 8=87.5% (bottom)
                left_percent = (7 - alphabetPosition(fenSquareCode[0])) * SQUARE_PERCENT;
                top_percent = (Number(fenSquareCode[1]) - 1) * SQUARE_PERCENT;
            }

            highlightElem = document.createElement('square');
            highlightElem.classList.add('custom');
            highlightElem.classList.add('highlight');
            highlightElem.dataset.testElement = 'highlight';
            highlightElem.style = style;
            highlightElem.style.backgroundColor = `rgba(${rgba_color[0]},${rgba_color[1]},${rgba_color[2]},${rgba_color[3]})`;
            // Allow clicks to pass through highlight to the board underneath
            highlightElem.style.pointerEvents = 'none';

            // Use percentage-based positioning like Lichess pieces
            highlightElem.style.top = `${top_percent}%`;
            highlightElem.style.left = `${left_percent}%`;
            highlightElem.style.zIndex = 1;

            activeSiteMoveHighlights.push(highlightElem);

            parentElem = chessBoardElem.querySelector("cg-container");
        }



        parentElem.prepend(highlightElem);
    }



    highlight(fromSquare, defaultFromSquareStyle, rgba_color);
    highlight(toSquare, defaultToSquareStyle, rgba_color);
}

function removeSiteMoveMarkings() {
    // Remove tracked elements
    activeSiteMoveHighlights.forEach(elem => {
        elem?.remove();
    });
    activeSiteMoveHighlights = [];
    
    // Also clean up any orphaned highlight elements that might have been missed
    document.querySelectorAll('.custom.highlight').forEach(elem => {
        elem.remove();
    });
}

/**
 * Force a complete refresh of highlights - useful when highlights get into a bad state
 * This clears all existing highlights and re-triggers analysis for the current position
 */
function refreshHighlights() {
    // Force clear all existing highlights
    clearBoard(true); // Pass true to force clear
    
    // Reset tracking variables
    lastHighlightedFen = null;
    lastHighlightTime = 0;
    
    // Reset lastFen so updateBestMove thinks position changed
    lastFen = null;
    
    // Re-analyze and re-draw highlights for current position
    updateBestMove(null); // Trigger re-analysis
    
    Interface.log('Highlights refreshed');
}





function updateBestMove(mutationArr) {
    const FenUtil = new FenUtils();
    let currentFen = FenUtil.getFen();


    // Only process if the FEN has actually changed (real piece movement)
    if (currentFen != lastFen) {
        // Log that we detected a real position change
        Interface.log(`Position changed, analyzing new position...`);
        
        lastFen = currentFen;
        
        // Only clear highlights when FEN actually changes AND they're for a different position
        // This prevents highlights from disappearing on click/hover events
        if (lastHighlightedFen && currentFen !== lastHighlightedFen) {
            clearBoard();
            lastHighlightedFen = null;
        } else if (currentFen === lastHighlightedFen) {
            // Already showing correct highlights for this position, don't re-analyze
            Interface.log(`Highlights already correct for current position, skipping analysis`);
            return;
        }


        if (mutationArr) {
            let attributeMutationArr

            if (CURRENT_SITE == CHESS_COM) {
                attributeMutationArr = mutationArr.filter(m => m.target.classList.contains('piece') && m.attributeName == 'class');
            } else if (CURRENT_SITE == LICHESS_ORG) {
                attributeMutationArr = mutationArr.filter(m => m.target.tagName == 'PIECE' && !m.target.classList.contains('fading') && m.attributeName == 'class');
            }



            if (attributeMutationArr?.length) {
                // Get the color of the piece that just moved
                const movedPieceColor = FenUtil.getPieceColor(FenUtil.getFenCodeFromPieceElem(attributeMutationArr[0].target));

                // last_turn = who just moved (the piece's color)
                last_turn = movedPieceColor;

                // turn = whose turn is next (opposite of who just moved)
                turn = movedPieceColor === 'w' ? 'b' : 'w';



                Interface.log(`Turn updated to ${turn}!`);

                updateBoard(false); // Don't clear again, we already did above if needed
                sendBestMove();
            }
        } else {
            // No mutation array means we need to update immediately (e.g., player color change)
            updateBoard(false);
            sendBestMove();
        }
    }
}






function sendBestMove() {
    Interface.log(`sendBestMove: isPlayerTurn=${isPlayerTurn}, playerColor=${playerColor}, last_turn=${last_turn}`);
    if (!isPlayerTurn && !show_opposite_moves) {
        Interface.log('Skipping analysis - not player turn');
        return;
    }

    sendBestMoveRequest();
}

function sendBestMoveRequest() {
    // Throttle requests to prevent excessive analysis in fast games
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL_MS) {
        Interface.log('Request throttled - too soon since last request');
        return;
    }
    lastRequestTime = now;
    
    const FenUtil = new FenUtils();
    let currentFen = FenUtil.getFen();
    possible_moves = [];

    // Increment request ID to track which request this is
    lastBestMoveID++;
    const requestId = lastBestMoveID;
    
    Interface.log(`Requesting analysis (request #${requestId})...`);

    reloadChessEngine(false, () => {
        // Let all requests go through - stale responses will be rejected based on FEN verification
        if (use_book_moves) {
            getBookMoves({ id: requestId, fen: currentFen });
        } else {
            getBestMoves({ id: requestId, fen: currentFen });
        }
    });
}




function clearBoard(force = false) {
    // Don't clear highlights if they were just shown, unless forced
    const now = Date.now();
    if (!force && now - lastHighlightTime < MIN_HIGHLIGHT_DISPLAY_MS) {
        Interface.log('Skipping highlight clear - minimum display time not reached');
        return;
    }
    
    // Don't clear if highlights are still valid for current position
    if (!force && lastHighlightedFen) {
        const FenUtil = new FenUtils();
        const currentFen = FenUtil.getFen();
        if (currentFen === lastHighlightedFen) {
            Interface.log('Highlights still valid for current position, skipping clear');
            return;
        }
    }
    
    Interface.log('Clearing board highlights (FEN changed)');
    Interface.stopBestMoveProcessingAnimation();

    Interface.boardUtils.removeBestMarkings();

    removeSiteMoveMarkings();
}
function updateBoard(clear = true) {
    if (clear)
        clearBoard();

    const FenUtil = new FenUtils();
    let currentFen = FenUtil.getFen();

    if (currentFen == ("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") || currentFen == ("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1")) {
        enemyScore = 0;
        myScore = 0;
        Interface.boardUtils.updateBoardPower(myScore, enemyScore);
    }

    isPlayerTurn = playerColor == null || last_turn == null || last_turn !== playerColor;
    Interface.log(`Turn calculation: playerColor=${playerColor}, last_turn=${last_turn}, isPlayerTurn=${isPlayerTurn}`);

    Interface.boardUtils.updateBoardFen(currentFen);
}


function removeDuplicates(arr) {
    return arr.filter((item,
        index) => arr.indexOf(item) === index);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBestMoves(request) {
    // Use Lichess Cloud API when on Lichess.org and using Lichess Cloud engine
    if (CURRENT_SITE === LICHESS_ORG && engineIndex === lichess_cloud_engine_id) {
        getLichessCloudBestMoves(request);
        return;
    }

    // Use Node server when node engine is selected
    if (engineIndex === node_engine_id) {
        getNodeBestMoves(request);
        return;
    }

    // Local/web engines (works for Chess.com and Lichess via iframe sandbox)
    if (WEB_ENGINE_IDS.includes(engineIndex)) {
        // local engines
        while (!engine) {
            sleep(100);
        }

        // Apply bullet settings if bullet mode is enabled
        const effectiveDepth = bullet_mode ? Math.min(current_depth, bullet_depth) : current_depth;
        const effectiveMovetime = bullet_mode ? bullet_movetime : current_movetime;

        Interface.log(`Using local engine (depth: ${effectiveDepth}, movetime: ${effectiveMovetime})...`);

        engine.postMessage(`position fen ${request.fen}`);

        // In bullet mode, always use movetime for guaranteed response time
        if (bullet_mode) {
            engine.postMessage('go movetime ' + effectiveMovetime);
        } else if (engineMode == DEPTH_MODE) {
            engine.postMessage('go depth ' + effectiveDepth);
        } else {
            engine.postMessage('go movetime ' + effectiveMovetime);
        }

        // Track the achieved depth for reporting
        let achievedDepth = effectiveDepth;

        engine.onmessage = e => {
            // Check if response is stale - verify position hasn't changed
            const FenUtil = new FenUtils();
            const currentFen = FenUtil.getFen();
            if (currentFen !== request.fen) {
                Interface.log('Position changed, discarding engine analysis');
                return;
            }
            
            // Also check request ID
            if (lastBestMoveID != request.id) {
                Interface.log('Ignoring stale engine response');
                return;
            }
            if (e.data.includes('bestmove')) {
                let move = e.data.split(' ')[1];
                Interface.log(`Analysis complete: depth ${achievedDepth}, move ${move}`);
                // Pass achieved depth for depth warning
                moveResult(move.slice(0, 2), move.slice(2, 4), effectiveDepth, true, achievedDepth);
            } else if (e.data.includes('info')) {
                const infoObj = LozzaUtils.extractInfo(e.data);
                achievedDepth = infoObj.depth || effectiveDepth;
                let move_time = infoObj.time || effectiveMovetime;

                // Limit possible_moves to max_best_moves
                possible_moves = e.data.slice(e.data.lastIndexOf("pv"), e.data.length)
                    .split(" ")
                    .slice(1)
                    .filter((_, index) => index % 2 === 0)
                    .slice(1, max_best_moves);


                if (bullet_mode) {
                    Interface.updateBestMoveProgress(`Bullet: ${move_time} ms`);
                } else if (engineMode == DEPTH_MODE) {
                    Interface.updateBestMoveProgress(`Depth: ${achievedDepth}`);
                } else {
                    Interface.updateBestMoveProgress(`Move time: ${move_time} ms`);
                }
            }
            Interface.engineLog(e.data);
        };
    } else {
        getNodeBestMoves(request);
    }
}




// Debounce timeout for mutation observer to prevent rapid clearing
let mutationDebounceTimeout = null;
const MUTATION_DEBOUNCE_MS = 0; // No debounce - respond immediately for faster bullet games

// Track last processed FEN to avoid reacting to DOM noise
let lastProcessedFen = null;

function observeNewMoves() {
    const handleMutation = (mutationArr) => {
        // Early FEN check - only process if position actually changed
        const FenUtil = new FenUtils();
        const currentFen = FenUtil.getFen();
        
        // If FEN hasn't changed, this is just DOM noise (hover, click, drag, animation)
        if (currentFen === lastProcessedFen) {
            return; // Ignore DOM noise
        }
        
        // Filter out transient mutations (hover, click, drag states, ghost pieces, animations)
        const significantMutations = mutationArr.filter(m => {
            // Ensure target has classList before checking
            const classList = m.target.classList;
            if (!classList) {
                return true; // Keep mutations on elements without classList
            }
            
            // Skip mutations that are just attribute changes on highlight elements
            if (classList.contains('highlight')) {
                return false;
            }
            if (classList.contains('custom')) {
                return false;
            }
            // Skip ghost pieces (used for drag previews)
            if (classList.contains('ghost')) {
                return false;
            }
            // Skip fading/animated elements
            if (classList.contains('fading')) {
                return false;
            }
            // Skip if the mutation is on a dragging piece
            if (classList.contains('dragging')) {
                return false;
            }
            // Skip cursor/pointer related changes on non-piece elements
            if (m.attributeName === 'style' && m.target.tagName !== 'PIECE' && !classList.contains('piece')) {
                return false;
            }
            return true;
        });

        // Only proceed if we have significant mutations
        if (significantMutations.length === 0) {
            return;
        }

        // Update processed FEN before processing
        lastProcessedFen = currentFen;

        // Clear any pending debounce operation
        if (mutationDebounceTimeout) {
            clearTimeout(mutationDebounceTimeout);
        }

        // Debounce the mutation processing by 100ms to prevent rapid clearing
        mutationDebounceTimeout = setTimeout(() => {
            lastPlayerColor = playerColor;

            updatePlayerColor(() => {
                if (playerColor != lastPlayerColor) {
                    Interface.log(`Player color changed from ${lastPlayerColor} to ${playerColor}!`);
                    updateBestMove();
                } else {
                    updateBestMove(significantMutations);
                }
            });
        }, MUTATION_DEBOUNCE_MS);
    };

    const boardObserver = new MutationObserver(handleMutation);
    boardObserver.observe(chessBoardElem, { childList: true, subtree: true, attributes: true });
}


function addGuiPages() {
    if (Gui?.document) return;

    Gui.addPage("Main", `
    <div class="rendered-form" id="main-tab">

                <script>${CURRENT_SITE != LICHESS_ORG ? GM_getResourceText('jquery.js') : ""}</script>
                <script>${CURRENT_SITE != LICHESS_ORG ? GM_getResourceText('chessboard.js') : ""}</script>


        <div class="card" id="chessboard-card">
            <div class="card-body" id="chessboard">
                <div class="main-title-bar">
                    <h4 class="card-title">Live Chessboard</h4>
                    <p class="card-title" id="best-move-progress"></p>
                </div>

                <div id="board" style="width: 447px"></div>
            </div>
            <div id="orientation" class="hidden"></div>
            <div class="card-footer sideways-card"><input class="btn" type="button" value="Get Best Move" id="bestmove-btn"></input></div>
            <div class="card-footer sideways-card"><input class="btn" type="button" value="Refresh Highlights" id="refresh-highlights-btn"></input></div>
            <div class="card-footer sideways-card">FEN :<div id="fen"></div></div>
            <div class="card-footer sideways-card">ENEMY SCORE :<div id="enemy-score"></div></div>
            <div class="card-footer sideways-card">MY SCORE : <div id="my-score"></div></div>
        </div>
        <script>
        const orientationElem = document.querySelector('#orientation');
        const fenElem = document.querySelector('#fen');

        let board = ChessBoard('board', {
            pieceTheme: '${repositoryRawURL}/content/chesspieces/{piece}.svg',
            position: 'start',
            orientation: '${playerColor == 'b' ? 'black' : 'white'}'
        });

        const orientationObserver = new MutationObserver(() => {
            board = ChessBoard('board', {
                pieceTheme: '${repositoryRawURL}/content/chesspieces/{piece}.svg',
                position: fenElem.textContent,
                orientation: orientationElem.textContent == 'b' ? 'black' : 'white'
            });
        });

        const fenObserver = new MutationObserver(() => {
            board.position(fenElem.textContent);
        });

        orientationObserver.observe(orientationElem, { attributes: true,  childList: true,  characterData: true });
        fenObserver.observe(fenElem, { attributes: true,  childList: true,  characterData: true });
        </script>
    </div>
    `);

    Gui.addPage('Log', `
    <div class="rendered-form" id="log-tab">
        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Userscript Log:</h4>
                <ul class="list-group" id="userscript-log-container"></ul>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Engine Log</h4>
                <ul class="list-group" id="engine-log-container"></ul>
            </div>
        </div>
    </div>
    `);







    Gui.addPage('Settings', `
    <style>
        body{
            display:grid;
            justify-items: center;
            background-color:#fff;

            transition:0.2s;
        }


        body.night{
            background-color:#312e2b;
            transition:0.2s;
        }



        .rendered-form{
            width:100%;
        }

        .card{
            border: 3px solid rgba(0,0,0,.2) !important;
            background-color:#fff;
            transition:0.2s;
        }
        .card.night{
            background-color:#545454;
            transition:0.2s;
        }



        .card-title{
            color:#000;
            transition:0.2s;
        }
        .card-title.night{
            color:#fff;
            transition:0.2s;
        }


        .form-control{
            color:#000;
            background-color:#fff;
            transition:0.2s;
        }
        .form-control.night{
            color:#fff;
            background-color:#525252;
            transition:0.2s;
        }


        label,input{
            color:#000;
            transition:0.2s;
        }
        label.night,input.night{
            color:#fff;
            transition:0.2s;
        }

        input{
            background-color:#fff;
            transition:0.2s;
        }
        input.night{
            background-color:#525252;
            transition:0.2s;
        }


        .list-group div{
            background-color:#fff;
            transition:0.2s;
        }
        .list-group.night div{
            background-color:#bbb;
            transition:0.2s;
        }



        .card-footer{
            color:#000;
            font-weight:bold;
            transition:0.2s;
        }
        .card-footer.night{
            color:#fff;
            transition:0.2s;
        }

        #fen{
            color:#000;
            font-size: 15px;
            transition:0.2s;
        }
        #fen.night{
            color:#fff;
            transition:0.2s;
        }

        #chessboard-card{
            width:max-content;
        }

        #chessboard{
            margin-left:auto;
            margin-right:auto;
        }

        .nav-tabs .nav-link:hover {
            border-color: #454646  #454646  #454646;
            isolation: isolate;
        }
        .nav-tabs .nav-link.night:hover {
            border-color: #e9ecef #e9ecef #dee2e6;
            isolation: isolate;
        }

        .nav-tabs .nav-link.active{
            background-color:#bbb;
        }
        .nav-tabs .nav-link.active.night{
            background-color:#fff;
        }

        .btn{
            border-color:#bbb;
            border-width:3px;
            width:100%;
            transition :0.2s;
        }
        .btn:hover{
            background-color: #0d6efd;
            transition :0.2s;
        }
        .btn:active{
            background-color: #0c5acd;
            transition :0.2s;
        }

        .space{
            height:10px;
        }

        .form-control,.list-group{
            border: 2px solid #0000004f !important;
        }
        #reload-count{
            width:15%;
        }
        .nav-link{
            font-weight:bold;
        }

		.alert {
			padding: 20px;
			background-color: #f44336;
			color: white;
		}


        .container {
            display: block;
            position: relative;
            padding-left: 35px;
            margin-bottom: 12px;
            cursor: pointer;
            font-size: 15px;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }


        .container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }


        .checkmark {
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            height: 25px;
            width: 25px;
            background-color: #eee;
            outline:3px solid #bbb;
        }

        .checkmark.night{
            outline:none;
        }

        .container:hover input ~ .checkmark {
            background-color: #ccc;
        }


        .container input:checked ~ .checkmark {
            background-color: #2196F3;
        }


        .checkmark:after {
            content: "";
            position: absolute;
            display: none;
        }


        .container input:checked ~ .checkmark:after {
            display: block;
        }

        .container .checkmark:after {
            width: 40%;
            height: 70%;
            margin-left: 1px;
            border: solid white;
            border-width: 0 3px 3px 0;
            -webkit-transform: rotate(45deg);
            -ms-transform: rotate(45deg);
            transform: rotate(45deg);
        }
    </style>

    <div class="rendered-form" id="settings-tab">

    <div class="card">
        <div class="card-body">
            <h4 class="card-title">Main Settings:</h4>
            <input class="btn" type="button" value="Reset Settings" id="reset-settings">
            <div class="space"></div>
            <input class="btn" type="button" value="${nightMode == true ? 'Disable Night Mode' : 'Enable Night Mode'}" id="night-mode">
			<div class="space"></div>
            <input class="btn" type="button" value="Tutorials / Support" id="tuto">
        </div>
    </div>

        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Engine:</h4>
                <div class="form-group field-select-engine">
                    <select class="form-control" name="select-engine" id="select-engine">
                        <option value="option-lozza" id="web-engine">Lozza</option>
                        <option value="option-stockfish" id="web-engine">Stockfish 5</option>
                        <option value="option-stockfish2" id="web-engine">Stockfish 2018</option>
                        <option value="option-nodeserver" id="local-engine">Node Server Engines</option>
                        <option value="option-lichesscloud" id="lichess-cloud-engine">Lichess Cloud (Lichess.org only)</option>
                    </select>
                </div>


                <label class="container">Use book moves
                    <input type="checkbox" id="use-book-moves" ${use_book_moves == true ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>


                <div id="reload-engine-div" style="display:${(node_engine_id == engineIndex || lichess_cloud_engine_id == engineIndex) ? 'none' : 'block'};">


                    <label class="container">Enable Engine Reload
                        <input type="checkbox" id="reload-engine" ${reload_engine == true ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>

                    <div id="reload-count-div" style="display:${reload_engine == true ? 'block' : 'none'};">
                        <label for="reload-count">Reload Engine every</label>
                        <input type="number" id="reload-count" value="${reload_every}">
                        <label for="reload-count"> moves</label>
                    </div>



                </div>




				<div id="node-engine-div" style="display:${(engineIndex == node_engine_id) ? 'block' : 'none'};">
                    <div>
                    <label for="engine-url">Engine URL:</label>
                    <input type="text" id="engine-url" value="${node_engine_url}">
                    </div>

                    <div class="space"></div>
                    <div>
					<label for="engine-name">Engine Name:</label>
					<input type="text" id="engine-name" value="${node_engine_name}">
                    </div>
				</div>

                <div id="lichess-cloud-info" style="display:${(engineIndex == lichess_cloud_engine_id) ? 'block' : 'none'};">
                    <p style="color: #666; font-style: italic;">Lichess Cloud uses Lichess.org's cloud analysis API. Analysis depth depends on the position's popularity in the database.</p>
                </div>
            </div>
        </div>


        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Engine Strength:</h4>

			<h7 class="card-title">Engine Mode:</h7>
            <div class="form-group field-select-engine-mode">
                <select class="form-control" name="select-engine-mode" id="select-engine-mode">
                    <option value="option-depth" id="select-engine-mode-0">Depth</option>
                    <option value="option-movetime" id="select-engine-mode-1">Move time</option>
                </select>
            </div>



            <h7 class="card-title">Engine Power:</h7>
                <input type="range" class="form-range" min="${MIN_DEPTH}" max="${MAX_DEPTH}" step="1" value="${current_depth}" id="depth-range">
                <input type="number" class="form-range" min="${MIN_DEPTH}" max="${MAX_DEPTH}" value="${current_depth}" id="depth-range-number">
                <input type="range" class="form-range" min="${MIN_MOVETIME}" max="${MAX_MOVETIME}" step="50" value="${current_movetime}" id="movetime-range">
                <input type="number" class="form-range" min="${MIN_MOVETIME}" max="${MAX_MOVETIME}" value="${current_movetime}" id="movetime-range-number">
			</div>

            <div class="card-footer sideways-card" id="elo">
                <ul style="margin:0px;">
                    <li id="value">
                        Elo:
                    </li>
                    <li id="rank">
                        Rank:
                    </li>
                    <li id="power">
                        Elo:
                    </li>
                </ul>
            </div>
        </div>


        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Bullet Mode (Fast Games):</h4>

                <label class="container">Ultra-fast mode (very low depth)
                    <input type="checkbox" id="bullet-mode" ${bullet_mode == true ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>

                <div id="bullet-settings" style="display:${bullet_mode == true ? 'block' : 'none'};">
                    <div>
                        <label for="bullet-movetime">Bullet movetime (ms):</label>
                        <input type="number" id="bullet-movetime" min="50" max="200" value="${bullet_movetime}">
                    </div>

                    <div class="space"></div>

                    <div>
                        <label for="bullet-depth">Max depth limit:</label>
                        <input type="number" id="bullet-depth" min="1" max="10" value="${bullet_depth}">
                    </div>
                </div>
            </div>
        </div>


        <div class="card">
            <div class="card-body">
                <h4 class="card-title">Visual:</h4>

				<h6 class="alert">
                    <span>&#9888;</span>Warning</span>: Displaying moves are detectable, use with caution !!
				</h6>

                <div id="max-moves-div" style="display:${node_engine_id == engineIndex ? 'none' : 'block'};">
                    <div>
                        <label for="reload-count">Max Best Moves</label>
                        <input type="number" min="1" max="${Math.floor(current_depth / 2)}" id="max-moves" value="${max_best_moves}">
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <h4 class="card-title">Best Moves Colors:</h4>
                            <div id="best-moves-colors">
                                
                            </div>
                        </div>
                    </div>
                </div>

                <label class="container">Display moves on chessboard
                    <input type="checkbox" id="display-moves-on-site" ${displayMovesOnSite == true ? 'checked' : ''}>
					<span class="checkmark"></span>
                </label>


                <label class="container">Display Opponent best moves
                    <input type="checkbox" id="show-opposite-moves" ${show_opposite_moves == true ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>







            </div>
        </div>


        <div class="card">
        <div class="card-body">
            <h4 class="card-title">Other:</h4>


            <label class="container">Enable Userscript Log
            <input type="checkbox" id="enable-user-log" ${enableUserLog == true ? 'checked' : ''}>
            <span class="checkmark"></span>
            </label>


            <label class="container">Enable Engine Log
            <input type="checkbox" id="enable-engine-log" ${enableEngineLog == true ? 'checked' : ''}>
            <span class="checkmark"></span>
            </label>




    </div>
    </div>
    `);


}

function fixDepthMoveTimeInput(depthRangeElem, depthRangeNumberElem, moveTimeRangeElem, moveTimeRangeNumberElem, eloElem) {
    if (engineMode == DEPTH_MODE) {
        if (isNotCompatibleBrowser()) {
            depthRangeElem.style.display = "none";
            depthRangeNumberElem.style.display = "block";
            moveTimeRangeElem.style.display = "none";
            moveTimeRangeNumberElem.style.display = "none";
        } else {
            depthRangeElem.style.display = "block";
            depthRangeNumberElem.style.display = "none";
            moveTimeRangeElem.style.display = "none";
            moveTimeRangeNumberElem.style.display = "none";
        }
    } else {
        if (isNotCompatibleBrowser()) {
            depthRangeElem.style.display = "none";
            depthRangeNumberElem.style.display = "none";
            moveTimeRangeElem.style.display = "none";
            moveTimeRangeNumberElem.style.display = "block";
        } else {
            depthRangeElem.style.display = "none";
            depthRangeNumberElem.style.display = "none";
            moveTimeRangeElem.style.display = "block";
            moveTimeRangeNumberElem.style.display = "none";
        }
    }



    setEloDescription(eloElem);
}


async function resetSettings() {
    await GM_setValue(dbValues.nightMode, undefined);


    Gui.close();

    initialize();
}


function updateBestMoveColors() {
    // Preserve existing colors and add new ones if needed
    bestMoveColors = Array.from({ length: max_best_moves }, (_, i) => bestMoveColors[i] || getRandomColor());
    GM_setValue(dbValues.bestMoveColors, bestMoveColors);

    const bestMovesContainer = Gui.document.getElementById("best-moves-colors");

    bestMovesContainer.innerHTML = "";

    bestMoveColors.forEach((color, index) => {
        const moveDiv = document.createElement("div");

        moveDiv.innerHTML = `
            <label for="best-move-color-${index}">Best Move ${index + 1}:</label>
            <input type="color" id="best-move-color-${index}" value="${color}">
        `;

        bestMovesContainer.appendChild(moveDiv);

        Gui.document.getElementById(`best-move-color-${index}`).addEventListener("change", (event) => {
            bestMoveColors[index] = event.target.value;
            GM_setValue(dbValues.bestMoveColors, bestMoveColors);
        });
    });
}


function openGUI() {
    Gui.open(() => {



        updateBestMoveColors();

        const bodyElem = Gui.document.querySelector("body");
        const cardElem = Gui.document.querySelectorAll(".card");
        const cardTitleElem = Gui.document.querySelectorAll(".card-title");
        const FormControlElem = Gui.document.querySelectorAll(".form-control");
        const labelElem = Gui.document.querySelectorAll("label");
        const checkMarkElem = Gui.document.querySelectorAll(".checkmark");
        const inputElem = Gui.document.querySelectorAll("input");
        const listGroupElem = Gui.document.querySelectorAll(".list-group");
        const cardFooterElem = Gui.document.querySelectorAll(".card-footer");
        const textMutedElem = Gui.document.querySelectorAll("#fen");
        const navLinkElem = Gui.document.querySelectorAll(".nav-tabs .nav-link");




        const depthRangeElem = Gui.document.querySelector('#depth-range');
        const depthRangeNumberElem = Gui.document.querySelector('#depth-range-number');
        const maxMovesElem = Gui.document.querySelector('#max-moves');
        const maxMovesDivElem = Gui.document.querySelector('#max-moves-div');
        const moveTimeRangeElem = Gui.document.querySelector('#movetime-range');
        const moveTimeRangeNumberElem = Gui.document.querySelector('#movetime-range-number');
        const engineModeElem = Gui.document.querySelector('#select-engine-mode');
        const engineElem = Gui.document.querySelector('#select-engine');
        const engineNameDivElem = Gui.document.querySelector('#node-engine-div');
        const lichessCloudInfoElem = Gui.document.querySelector('#lichess-cloud-info');
        const reloadEngineDivElem = Gui.document.querySelector('#reload-engine-div');
        const reloadEngineElem = Gui.document.querySelector('#reload-engine');
        const reloadEveryDivElem = Gui.document.querySelector('#reload-count-div');
        const reloadEveryElem = Gui.document.querySelector('#reload-count');
        const nodeEngineNameElem = Gui.document.querySelector('#engine-name');
        const nodeEngineUrlElem = Gui.document.querySelector('#engine-url');
        const useLocalEngineElem = Gui.document.querySelector('#use-book-moves');
        const showOppositeMovesElem = Gui.document.querySelector('#show-opposite-moves');
        const displayMovesOnSiteElem = Gui.document.querySelector('#display-moves-on-site');
        const enableUserLogElem = Gui.document.querySelector('#enable-user-log');
        const enableEngineLogElem = Gui.document.querySelector('#enable-engine-log');
        const eloElem = Gui.document.querySelector('#elo');
        const getBestMoveElem = Gui.document.querySelector('#bestmove-btn');
        const refreshHighlightsElem = Gui.document.querySelector('#refresh-highlights-btn');
        const nightModeElem = Gui.document.querySelector('#night-mode');
        const tutoElem = Gui.document.querySelector('#tuto');
        const resetElem = Gui.document.querySelector('#reset-settings');
        
        // Bullet mode elements
        const bulletModeElem = Gui.document.querySelector('#bullet-mode');
        const bulletDepthElem = Gui.document.querySelector('#bullet-depth');
        const bulletMovetimeElem = Gui.document.querySelector('#bullet-movetime');
        const bulletSettingsDivElem = Gui.document.querySelector('#bullet-settings');







        const setNightClassName = (elem) => {
            const pos = elem.className.indexOf("night");
            if (pos == -1) {
                elem.className += " night";
            }
        }

        const removeNightClassName = (elem) => {
            const pos = elem.className.indexOf("night");
            if (pos != -1) {
                elem.className = elem.className.slice(0, pos - 1);
            }
        }

        const setNightClassNames = (elems) => {
            for (var a = 0; a < elems.length; a++) {
                setNightClassName(elems[a]);
            }
        }
        const removeNightClassNames = (elems) => {
            for (var a = 0; a < elems.length; a++) {
                removeNightClassName(elems[a]);
            }
        }


        const checkNightMode = () => {
            if (nightMode) {
                setNightClassName(bodyElem);
                setNightClassNames(cardElem);
                setNightClassNames(cardTitleElem);
                setNightClassNames(FormControlElem);
                setNightClassNames(inputElem);
                setNightClassNames(labelElem);
                setNightClassNames(checkMarkElem);
                setNightClassNames(listGroupElem);
                setNightClassNames(cardFooterElem);
                setNightClassNames(textMutedElem);
                setNightClassNames(navLinkElem);
            } else {
                removeNightClassName(bodyElem);
                removeNightClassNames(cardElem);
                removeNightClassNames(cardTitleElem);
                removeNightClassNames(FormControlElem);
                removeNightClassNames(inputElem);
                removeNightClassNames(labelElem);
                removeNightClassNames(checkMarkElem);
                removeNightClassNames(listGroupElem);
                removeNightClassNames(cardFooterElem);
                removeNightClassNames(textMutedElem);
                removeNightClassNames(navLinkElem);
            }
        }


        bodyElem.style.width = "100%";


        fixDepthMoveTimeInput(depthRangeElem, depthRangeNumberElem, moveTimeRangeElem, moveTimeRangeNumberElem, eloElem);
        engineElem.selectedIndex = engineIndex;
        engineModeElem.selectedIndex = engineMode;
        checkNightMode();


        // compatibility fix
        if (isNotCompatibleBrowser()) {
            var forms = Gui.document.querySelectorAll('.rendered-form');
            for (var a = 0; a < forms.length; a++) {
                forms[a].style.width = "auto";
            }
            Gui.document.querySelector('#gui').style.minWidth = "350px";
            Gui.document.querySelector('#content').style.maxHeight = "500px";
            Gui.document.querySelector('#content').style.overflow = "scroll";
            Gui.document.querySelector('#chessboard').remove();
            Gui.document.querySelector('#orientation').remove();
            Gui.document.querySelector('#engine-log-container').style.maxHeight = "100px";
            Gui.document.querySelector('#engine-log-container').style.overflow = "scroll";
            Gui.document.querySelector('#userscript-log-container').style.maxHeight = "100px";
            Gui.document.querySelector('#userscript-log-container').style.overflow = "scroll";

            Gui.document.querySelector('#button-close-gui').addEventListener('click', e => {
                e.preventDefault();
                if (closedGui == true) {
                    closedGui = false;
                    Gui.document.querySelector("#content").style.display = "block";
                }
                else {
                    closedGui = true;
                    Gui.document.querySelector("#content").style.display = "none";

                }
            });
        }


        if (CURRENT_SITE == LICHESS_ORG) {
            // On Lichess: web engines now work via iframe sandbox, enable all engines
            // Lichess Cloud and Node Server are also available on Lichess

            if (!isNotCompatibleBrowser()) {
                Gui.document.querySelector('#chessboard').remove();
                Gui.document.querySelector('#orientation').remove();
            }

            engineElem.selectedIndex = engineIndex;

            // Show/hide appropriate divs based on selected engine
            if (engineIndex === lichess_cloud_engine_id) {
                maxMovesDivElem.style.display = "block";
                engineNameDivElem.style.display = "none";
                reloadEngineDivElem.style.display = "none";
                Gui.document.querySelector('#lichess-cloud-info').style.display = "block";
            } else if (engineIndex === node_engine_id) {
                maxMovesDivElem.style.display = "none";
                engineNameDivElem.style.display = "block";
                reloadEngineDivElem.style.display = "none";
                Gui.document.querySelector('#lichess-cloud-info').style.display = "none";
            } else {
                // Web engines (Lozza, Stockfish 5, Stockfish 2018)
                maxMovesDivElem.style.display = "block";
                engineNameDivElem.style.display = "none";
                reloadEngineDivElem.style.display = "block";
                Gui.document.querySelector('#lichess-cloud-info').style.display = "none";
            }
        } else {
            // On Chess.com: disable Lichess Cloud option
            engineElem.childNodes.forEach(elem => {
                if (elem.id == "lichess-cloud-engine") {
                    elem.disabled = true;
                }
            })
        }


        resetElem.onclick = () => {
            resetSettings()
        }

        tutoElem.onclick = () => {
            window.open("https://www.youtube.com/watch?v=WaqI4l_hmIE&t=16s", "_blank");
        }

        nightModeElem.onclick = () => {
            if (nightMode) {
                nightMode = false;
                nightModeElem.value = "Enable Night Mode";
            } else {
                nightMode = true;
                nightModeElem.value = "Disable Night Mode";
            }



            checkNightMode();

            GM_setValue(dbValues.nightMode, nightMode);


        }

        getBestMoveElem.onclick = () => {
            if (forcedBestMove)
                return;

            getBestMoveElem.disabled = true;
            forcedBestMove = true;



            updateBoard();
            sendBestMove();
        }

        refreshHighlightsElem.onclick = () => {
            refreshHighlights();
        }

        engineModeElem.onchange = () => {
            engineMode = engineModeElem.selectedIndex;
            GM_setValue(dbValues.engineMode, engineMode);

            fixDepthMoveTimeInput(depthRangeElem, depthRangeNumberElem, moveTimeRangeElem, moveTimeRangeNumberElem, eloElem);
        }
        nodeEngineNameElem.onchange = () => {
            node_engine_name = nodeEngineNameElem.value;
            GM_setValue(dbValues.node_engine_name, node_engine_name);
        }
        nodeEngineUrlElem.onchange = () => {
            node_engine_url = nodeEngineUrlElem.value;
            GM_setValue(dbValues.node_engine_url, node_engine_url);
        }

        enableUserLogElem.onchange = () => {
            enableUserLog = enableUserLogElem.checked;


            GM_setValue(dbValues.enableUserLog, enableUserLog);
        }
        enableEngineLogElem.onchange = () => {
            enableEngineLog = enableEngineLogElem.checked;


            GM_setValue(dbValues.enableEngineLog, enableEngineLog);
        }

        reloadEngineElem.onchange = () => {
            reload_engine = reloadEngineElem.checked;

            if (reload_engine) {
                reloadEveryDivElem.style.display = "block";
            } else {
                reloadEveryDivElem.style.display = "none";
            }

            GM_setValue(dbValues.reload_engine, reload_engine);
        }

        reloadEveryElem.onchange = () => {
            reload_every = reloadEveryElem.value;
            GM_setValue(dbValues.reload_every, reload_every);
        }

        engineElem.onchange = () => {
            lastEngine = engineIndex;
            engineIndex = engineElem.selectedIndex;
            GM_setValue(dbValues.engineIndex, engineIndex);


            if (node_engine_id == engineIndex) {
                reloadEngineDivElem.style.display = "none";
                engineNameDivElem.style.display = "block";
                maxMovesDivElem.style.display = "none";
                if (lichessCloudInfoElem) lichessCloudInfoElem.style.display = "none";
            }
            else if (lichess_cloud_engine_id == engineIndex) {
                reloadEngineDivElem.style.display = "none";
                engineNameDivElem.style.display = "none";
                maxMovesDivElem.style.display = "block";
                if (lichessCloudInfoElem) lichessCloudInfoElem.style.display = "block";
            }
            else {
                reloadEngineDivElem.style.display = "block";
                engineNameDivElem.style.display = "none";
                maxMovesDivElem.style.display = "block";
                if (lichessCloudInfoElem) lichessCloudInfoElem.style.display = "none";
            }





            if (engineObjectURL) {
                URL.revokeObjectURL(engineObjectURL);
                engineObjectURL = null;
            }




            reloadChessEngine(true, () => {
                Interface.boardUtils.removeBestMarkings();

                removeSiteMoveMarkings();

                Interface.boardUtils.updateBoardPower(0, 0);
            });

        }



        depthRangeElem.onchange = () => {
            changeEnginePower(depthRangeElem.value, eloElem, maxMovesElem);
        };

        depthRangeNumberElem.onchange = () => {
            changeEnginePower(depthRangeNumberElem.value, eloElem, maxMovesElem);
        };


        maxMovesElem.onchange = () => {
            max_best_moves = maxMovesElem.value;
            GM_setValue(dbValues.max_best_moves, max_best_moves);


            updateBestMoveColors();
        };



        moveTimeRangeElem.onchange = () => {
            changeEnginePower(moveTimeRangeElem.value, eloElem, maxMovesElem);
        };

        moveTimeRangeNumberElem.onchange = () => {
            changeEnginePower(moveTimeRangeNumberElem.value, eloElem, maxMovesElem);
        };

        showOppositeMovesElem.onchange = () => {
            show_opposite_moves = showOppositeMovesElem.checked;


            GM_setValue(dbValues.show_opposite_moves, show_opposite_moves);
        }

        useLocalEngineElem.onchange = () => {
            use_book_moves = useLocalEngineElem.checked;



            GM_setValue(dbValues.use_book_moves, use_book_moves);
        }

        displayMovesOnSiteElem.onchange = () => {
            displayMovesOnSite = displayMovesOnSiteElem.checked;


            GM_setValue(dbValues.displayMovesOnSite, displayMovesOnSite);
        };

        // Bullet mode event handlers
        bulletModeElem.onchange = () => {
            bullet_mode = bulletModeElem.checked;

            if (bullet_mode) {
                bulletSettingsDivElem.style.display = "block";
            } else {
                bulletSettingsDivElem.style.display = "none";
            }

            GM_setValue(dbValues.bullet_mode, bullet_mode);
        };

        bulletDepthElem.onchange = () => {
            bullet_depth = parseInt(bulletDepthElem.value, 10);
            GM_setValue(dbValues.bullet_depth, bullet_depth);
        };

        bulletMovetimeElem.onchange = () => {
            bullet_movetime = parseInt(bulletMovetimeElem.value, 10);
            GM_setValue(dbValues.bullet_movetime, bullet_movetime);
        };


        window.onunload = () => {
            if (Gui.window && !Gui.window.closed) {
                Gui.window.close();
            }
        };

        const isWindowClosed = setInterval(() => {
            if (Gui.window.closed) {
                clearInterval(isWindowClosed);
                if (engine != null)
                    engine.terminate();
            }
        }, 1000);



        Interface.log('Initialized GUI!');

        observeNewMoves();
    });
}


function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}


function changeEnginePower(val, eloElem, maxMovesElem) {
    if (engineMode == DEPTH_MODE) {
        current_depth = val;
        max_best_moves = Math.floor(current_depth / 2);
        GM_setValue(dbValues.current_depth, current_depth);
        GM_setValue(dbValues.max_best_moves, max_best_moves);

        updateBestMoveColors();

        maxMovesElem.value = max_best_moves;
    } else {
        current_movetime = val;
        GM_setValue(dbValues.current_movetime, current_movetime);
    }

    setEloDescription(eloElem);
}



function reloadChessEngine(forced, callback) {
    // reload only if using local engines (skip for node server and lichess cloud)
    if ((node_engine_id == engineIndex || lichess_cloud_engine_id == engineIndex) && forced == false) {
        callback();
    }
    else if (reload_engine == true && reload_count >= reload_every || forced == true) {
        reload_count = 1;
        Interface.log(`Reloading the chess engine!`);

        if (engine)
            engine.terminate();

        loadChessEngine(callback);
    }
    else {
        reload_count = reload_count + 1;
        callback();
    }
}


// Create engine in iframe sandbox to bypass Lichess CSP restrictions
function createEngineInSandbox(engineCode, callback) {
    // Add a timeout to prevent hanging if iframe fails to initialize
    let callbackCalled = false;
    const timeoutId = setTimeout(() => {
        if (!callbackCalled) {
            callbackCalled = true;
            console.error('Engine sandbox initialization timed out');
            // Create a dummy engine that does nothing so the app doesn't crash
            callback({
                postMessage: function(msg) {
                    console.warn('Dummy engine: postMessage called with:', msg);
                },
                terminate: function() {
                    console.warn('Dummy engine: terminate called');
                },
                onmessage: null
            });
        }
    }, ENGINE_INITIALIZATION_TIMEOUT);

    // Create iframe with relaxed CSP
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    
    // Create the iframe content that will host the worker
    const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Engine Sandbox</title></head>
        <body>
        <script>
            let worker = null;
            
            window.addEventListener('message', function(e) {
                if (e.data.type === 'init') {
                    // Create worker from the engine code
                    const blob = new Blob([e.data.engineCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    worker = new Worker(url);
                    
                    worker.onmessage = function(workerEvent) {
                        parent.postMessage({ type: 'engine-message', data: workerEvent.data }, '*');
                    };
                    
                    parent.postMessage({ type: 'ready' }, '*');
                } else if (e.data.type === 'command') {
                    if (worker) {
                        worker.postMessage(e.data.command);
                    }
                } else if (e.data.type === 'terminate') {
                    if (worker) {
                        worker.terminate();
                        worker = null;
                    }
                }
            });
        <\/script>
        </body>
        </html>
    `;
    
    iframe.srcdoc = iframeContent;
    document.body.appendChild(iframe);
    
    // Create a proxy engine object
    const proxyEngine = {
        iframe: iframe,
        postMessage: function(msg) {
            iframe.contentWindow.postMessage({ type: 'command', command: msg }, '*');
        },
        terminate: function() {
            iframe.contentWindow.postMessage({ type: 'terminate' }, '*');
            iframe.remove();
            // Clean up message listener to prevent memory leaks
            if (this._cleanup) {
                this._cleanup();
            }
        },
        onmessage: null
    };
    
    // Listen for messages from iframe
    // Note: We validate message types but cannot restrict origin since userscripts
    // operate in a complex environment where the iframe origin may be 'null' or vary
    const messageHandler = function(e) {
        // Only handle expected message types from the engine sandbox
        if (!e.data || typeof e.data.type !== 'string') {
            return;
        }
        
        // Validate source is our iframe when possible
        if (e.source !== iframe.contentWindow) {
            return;
        }
        
        if (e.data.type === 'ready') {
            if (!callbackCalled) {
                callbackCalled = true;
                clearTimeout(timeoutId);
                callback(proxyEngine);
            }
        } else if (e.data.type === 'engine-message' && proxyEngine.onmessage) {
            proxyEngine.onmessage({ data: e.data.data });
        }
    };
    window.addEventListener('message', messageHandler);
    
    // Store messageHandler reference for cleanup
    proxyEngine._messageHandler = messageHandler;
    proxyEngine._cleanup = function() {
        window.removeEventListener('message', this._messageHandler);
    };
    
    // Wait for iframe to load and set up message handling
    iframe.onload = function() {
        // Send engine code to iframe
        iframe.contentWindow.postMessage({ type: 'init', engineCode: engineCode }, '*');
    };
    
    return proxyEngine;
}

function loadChessEngine(callback) {
    // Use iframe sandbox for ALL sites with web engines (fixes CSP issues on both Lichess and Chess.com)
    if (WEB_ENGINE_IDS.includes(engineIndex)) {
        try {
            let engineCode;
            if (engineIndex == 0) engineCode = GM_getResourceText('lozza.js');
            else if (engineIndex == 1) engineCode = GM_getResourceText('stockfish-5.js');
            else if (engineIndex == 2) engineCode = GM_getResourceText('stockfish-2018.js');
            
            createEngineInSandbox(engineCode, function(proxyEngine) {
                engine = proxyEngine;
                engine.postMessage('ucinewgame');
                Interface.log('Loaded chess engine in sandbox!');
                callback();
            });
        } catch (e) {
            console.error('Failed to create engine sandbox:', e);
            Interface.log('Error loading engine: ' + e.message);
            // Still call callback so GUI opens
            callback();
        }
        return;
    }
    
    // Skip local engine loading for Lichess Cloud engine and Node server
    if (engineIndex == lichess_cloud_engine_id || engineIndex == node_engine_id) {
        return callback();
    }

    // Fallback to direct Worker creation (may fail on sites with strict CSP)
    if (!engineObjectURL) {
        if (engineIndex == 0)
            engineObjectURL = URL.createObjectURL(new Blob([GM_getResourceText('lozza.js')], { type: 'application/javascript' }));
        else if (engineIndex == 1)
            engineObjectURL = URL.createObjectURL(new Blob([GM_getResourceText('stockfish-5.js')], { type: 'application/javascript' }));
        else if (engineIndex == 2)
            engineObjectURL = URL.createObjectURL(new Blob([GM_getResourceText('stockfish-2018.js')], { type: 'application/javascript' }));
    }

    if (engineObjectURL) {
        engine = new Worker(engineObjectURL);

        engine.postMessage('ucinewgame');

        Interface.log(`Loaded the chess engine!`);
    }

    callback();
}



function updatePlayerColor(callback) {
    const boardOrientation = Interface.getBoardOrientation();

    if (boardOrientation) {
        playerColor = boardOrientation;
        turn = boardOrientation;

        Interface.boardUtils.updateBoardOrientation(playerColor);
    } else {
        // Fallback: Use the last known player color
        playerColor = lastPlayerColor || 'w';
        turn = playerColor;
    }

    callback();
}

function initialize() {
    Interface = new InterfaceUtils();
    LozzaUtils = new LozzaUtility();

    const boardOrientation = Interface.getBoardOrientation();
    turn = boardOrientation;

    initializeDatabase(() => {
        loadChessEngine(() => {
            updatePlayerColor(() => {
                try {
                    addGuiPages();
                    openGUI();
                } catch (e) {
                    console.error('Error opening GUI:', e);
                }
            });
        });
    });
}

if (typeof GM_registerMenuCommand == 'function') {
    GM_registerMenuCommand("Open Smart Chess Bot", e => {
        if (chessBoardElem) {
            initialize();
        }
    }, 's');
}







async function initializeDatabase(callback) {




    if (GM_getValue(dbValues.nightMode) == undefined) {
        await GM_setValue(dbValues.nightMode, nightMode);
        await GM_setValue(dbValues.engineMode, engineMode);
        await GM_setValue(dbValues.engineIndex, engineIndex);
        await GM_setValue(dbValues.reload_engine, reload_engine);
        await GM_setValue(dbValues.reload_every, reload_every);
        await GM_setValue(dbValues.enableUserLog, enableUserLog);
        await GM_setValue(dbValues.enableEngineLog, enableEngineLog);
        await GM_setValue(dbValues.displayMovesOnSite, displayMovesOnSite);
        await GM_setValue(dbValues.show_opposite_moves, show_opposite_moves);
        await GM_setValue(dbValues.use_book_moves, use_book_moves);
        await GM_setValue(dbValues.node_engine_url, node_engine_url);
        await GM_setValue(dbValues.node_engine_name, node_engine_name);
        await GM_setValue(dbValues.current_depth, current_depth);
        await GM_setValue(dbValues.current_movetime, current_movetime);
        await GM_setValue(dbValues.max_best_moves, max_best_moves);
        await GM_setValue(dbValues.bestMoveColors, bestMoveColors);
        await GM_setValue(dbValues.bullet_mode, bullet_mode);
        await GM_setValue(dbValues.bullet_depth, bullet_depth);
        await GM_setValue(dbValues.bullet_movetime, bullet_movetime);

        callback();
    } else {
        nightMode = await GM_getValue(dbValues.nightMode);
        engineMode = await GM_getValue(dbValues.engineMode);
        engineIndex = await GM_getValue(dbValues.engineIndex);
        reload_engine = await GM_getValue(dbValues.reload_engine);
        reload_every = await GM_getValue(dbValues.reload_every);
        enableUserLog = await GM_getValue(dbValues.enableUserLog);
        enableEngineLog = await GM_getValue(dbValues.enableEngineLog);
        displayMovesOnSite = await GM_getValue(dbValues.displayMovesOnSite);
        show_opposite_moves = await GM_getValue(dbValues.show_opposite_moves);
        use_book_moves = await GM_getValue(dbValues.use_book_moves);
        node_engine_url = await GM_getValue(dbValues.node_engine_url);
        node_engine_name = await GM_getValue(dbValues.node_engine_name);
        current_depth = await GM_getValue(dbValues.current_depth);
        current_movetime = await GM_getValue(dbValues.current_movetime);
        max_best_moves = await GM_getValue(dbValues.max_best_moves);
        bestMoveColors = await GM_getValue(dbValues.bestMoveColors);
        
        // Load bullet mode settings with defaults if not set
        const storedBulletMode = await GM_getValue(dbValues.bullet_mode);
        const storedBulletDepth = await GM_getValue(dbValues.bullet_depth);
        const storedBulletMovetime = await GM_getValue(dbValues.bullet_movetime);
        
        bullet_mode = storedBulletMode !== undefined ? storedBulletMode : bullet_mode;
        bullet_depth = storedBulletDepth !== undefined ? storedBulletDepth : bullet_depth;
        bullet_movetime = storedBulletMovetime !== undefined ? storedBulletMovetime : bullet_movetime;

        callback();
    }


}
