const express = require('express');
const app = express();
const { ChessEngine } = require("./utils/engine")
const { VARS } = require("./VARS")
const cors = require("cors")

// Configure middleware before starting the server
app.use(cors())

// VARS
const chessEngine = new ChessEngine()
let counter = 0
let latestRequestId = 0

// Start the server
try {
    app.listen(VARS.PORT, () => console.log(`Listening on port ${VARS.PORT}`))
} catch (error) {
    console.log("Server startup error:", error.message)
}

// Ping endpoint for connection testing
app.get("/ping", (req, res) => {
    res.send({ success: true, message: "pong", timestamp: Date.now() });
});

// Cancel endpoint to abort current analysis
app.get("/cancel", (req, res) => {
    try {
        if (chessEngine.stop) {
            chessEngine.stop();
        }
        res.send({ success: true, message: "Analysis cancelled" });
    } catch (e) {
        res.send({ success: false, message: e.message });
    }
});

app.get("/getBestMove", (req, res) => {
    const fen = req.query.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    let depth = parseInt(req.query.depth) || 10
    let movetime = parseInt(req.query.movetime) || 500
    const turn = req.query.turn || "w"
    const engine_name = req.query.engine_name || "stockfish.exe"
    const engine_mode = parseInt(req.query.engine_mode) || 0
    const bullet_mode = req.query.bullet_mode === 'true' || req.query.bullet_mode === '1'

    // Bullet mode optimizations
    if (bullet_mode) {
        depth = Math.min(depth, 8);
        movetime = Math.min(movetime, 200);
    }

    if (depth > 20) {
        depth = 20
    }

    // Track request for staleness checking
    latestRequestId++;
    const thisRequestId = latestRequestId;
    counter++;
    
    console.log(`\n#${counter} [Request ${thisRequestId}] ${bullet_mode ? '⚡BULLET' : ''} turn: ${turn === 'w' ? 'White' : 'Black'}, depth: ${depth}`)

    chessEngine.start(counter, engine_mode, turn, depth, movetime, engine_name, fen).then((result) => {
        // Check if request is stale
        if (thisRequestId !== latestRequestId) {
            console.log(`#${counter} [Request ${thisRequestId}] ⏭️ Skipped (superseded by request ${latestRequestId})`);
            return res.send({ success: false, data: "Request superseded", stale: true });
        }

        const parsedResult = {
            fen: result.fen,
            bestMove: result.bestMove,
            ponder: result.ponder,
            turn: result.turn,
            depth: depth,
            movetime: movetime,
            score: result.score || depth,
            provider: engine_name
        }

        console.log(`#${counter} [Request ${thisRequestId}] ✅ bestMove: ${parsedResult.bestMove}`)
        return res.send({ success: true, data: parsedResult })
    }).catch((error) => {
        console.log(`#${counter} [Request ${thisRequestId}] ❌ Error: ${error.message}`)
        return res.send({ success: false, data: error.message })
    })
})
