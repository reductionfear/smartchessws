# WebSocket Engine Testing Guide

## Prerequisites

1. Chrome or Chromium-based browser
2. Developer mode enabled in Chrome Extensions
3. Access to Chess.com or Lichess.org

## Installation for Testing

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder from the repository

## Basic Functionality Tests

### Test 1: WebSocket Engine Selection

**Steps**:
1. Click the extension icon in Chrome toolbar
2. Open the Engine dropdown
3. Verify "Remote WebSocket" option is present (should be option 5)

**Expected**: Option appears in the list

### Test 2: WebSocket Settings UI - Popup

**Steps**:
1. Select "Remote WebSocket" from Engine dropdown
2. Verify WebSocket settings section appears
3. Check Engine Type dropdown has 4 options: Stockfish, Maia Bot, Rodent III, Patricia

**Expected**: Settings section shows with engine type selector

### Test 3: Dynamic Version Selector - Stockfish

**Steps**:
1. In popup, select "Remote WebSocket" engine
2. Select "Stockfish" from Engine Type dropdown
3. Verify version selector appears with versions 1-16

**Expected**: Dropdown shows Stockfish versions

### Test 4: Dynamic Version Selector - Maia

**Steps**:
1. Select "Maia Bot" from Engine Type dropdown
2. Verify Elo rating input appears
3. Check min=1100, max=1900, step=100

**Expected**: Number input with correct constraints

### Test 5: Dynamic Version Selector - Rodent III

**Steps**:
1. Select "Rodent III" from Engine Type dropdown
2. Verify personality selector appears
3. Check all personalities are present

**Expected**: Dropdown with 18 personality options

### Test 6: Dynamic Version Selector - Patricia

**Steps**:
1. Select "Patricia" from Engine Type dropdown
2. Verify Elo rating input appears
3. Check min=1100, max=3200, step=50

**Expected**: Number input with correct constraints

### Test 7: Settings Persistence

**Steps**:
1. Configure WebSocket engine with specific settings
2. Close and reopen the popup
3. Verify settings are retained

**Expected**: Settings persist after popup close

### Test 8: Options Page Configuration

**Steps**:
1. Open extension options (right-click icon → Options)
2. Select "Remote WebSocket Engine" from dropdown
3. Verify detailed configuration appears:
   - Base URL input
   - Engine Type dropdown
   - Dynamic version config
   - Info text about selected engine

**Expected**: Full configuration UI appears

### Test 9: WebSocket Connection

**Steps**:
1. Open Chess.com or Lichess
2. Start a game (or open analysis board)
3. Configure WebSocket engine (Stockfish 16 recommended for testing)
4. Open browser console (F12)
5. Make a move in the game
6. Watch console for WebSocket connection messages

**Expected Console Output**:
```
[SmartChessBot] Connecting to WebSocket engine: wss://ProtonnDev-engine.hf.space/stockfish-16
[SmartChessBot] WebSocket engine connected
[SmartChessBot] WebSocket engine ready
[SmartChessBot] Using WebSocket engine (depth: 10, movetime: 666)...
[Engine] uci
[Engine] uciok
[Engine] readyok
[Engine] info depth 1 ...
[Engine] bestmove e2e4
[SmartChessBot] WebSocket analysis complete: depth 10, move e2e4, score 25
```

### Test 10: Analysis Results

**Steps**:
1. With WebSocket engine configured
2. Make a move on the board
3. Wait for analysis
4. Verify best move is displayed (if "Display Moves on Board" is enabled)

**Expected**: Analysis completes and move is shown

### Test 11: Engine Switching

**Steps**:
1. Start with WebSocket engine
2. Make a move, wait for analysis
3. Switch to "Stockfish 2018" (local engine)
4. Make another move, wait for analysis
5. Switch back to WebSocket engine
6. Make another move, wait for analysis

**Expected**: All engines work correctly, no errors in console

### Test 12: Auto-Reconnect on Settings Change

**Steps**:
1. Configure WebSocket engine (Stockfish 16)
2. Open console
3. Make a move to trigger analysis
4. While analyzing, change to Stockfish 11
5. Watch console for reconnection

**Expected Console Output**:
```
[SmartChessBot] WebSocket engine disconnected
[SmartChessBot] Connecting to WebSocket engine: wss://ProtonnDev-engine.hf.space/stockfish-11
[SmartChessBot] WebSocket engine connected
```

### Test 13: Error Handling - Invalid URL

**Steps**:
1. In Options, set Base URL to invalid WebSocket address
2. Select WebSocket engine
3. Make a move
4. Check console for error handling

**Expected**: Graceful error message, no crash

### Test 14: Multiple Engine Types

**Steps**:
1. Test analysis with Stockfish 16
2. Switch to Maia 1500, test analysis
3. Switch to Rodent III (Fischer personality), test analysis
4. Switch to Patricia 2250, test analysis

**Expected**: All engines connect and provide analysis

### Test 15: Bullet Mode with WebSocket

**Steps**:
1. Enable "Bullet Mode" in popup
2. Select WebSocket engine
3. Make several moves rapidly
4. Verify quick analysis results

**Expected**: Fast analysis with reduced depth

## Advanced Tests

### Test 16: MultiPV Support

**Steps**:
1. In Options, set "Max Best Moves" to 3
2. Enable "Display moves on chessboard"
3. Configure WebSocket engine
4. Make a move in a position with multiple good options
5. Verify multiple moves are highlighted

**Expected**: Top 3 moves shown with different colors

### Test 17: Depth/Movetime Modes

**Steps**:
1. Test with Engine Mode = "Depth", depth = 15
2. Make a move, wait for analysis
3. Switch to Engine Mode = "Move time", movetime = 1000ms
4. Make a move, wait for analysis

**Expected**: Both modes work correctly with WebSocket engine

### Test 18: Concurrent Games

**Steps**:
1. Open two tabs with chess games
2. Configure WebSocket engine
3. Make moves in both games
4. Verify analysis works in both tabs

**Expected**: Both tabs get analysis (may be sequential due to connection sharing)

## Console Debugging

Useful console commands for debugging:

```javascript
// Check current settings
chrome.storage.local.get(null, console.log)

// Check WebSocket engine variables (in content script context)
// Note: Variables are in content script scope, not directly accessible from console
// Use browser DevTools to debug content.js
```

## Known Limitations

1. **Connection Sharing**: One WebSocket connection per engine type (not per tab)
2. **Server Load**: Remote server may be slow during peak usage
3. **Network**: Requires stable internet connection
4. **MultiPV**: Depends on engine support (Stockfish supports it, others may not)

## Reporting Issues

When reporting issues, include:
1. Browser version
2. Extension version
3. Console error messages (F12 → Console tab)
4. Steps to reproduce
5. WebSocket engine configuration used
6. Whether issue occurs with other engines

## Success Criteria

All tests should pass with:
- ✅ No JavaScript errors in console
- ✅ Settings saved and loaded correctly
- ✅ WebSocket connections established
- ✅ Analysis results displayed
- ✅ Smooth engine switching
- ✅ Proper cleanup on disconnect
- ✅ Auto-reconnect working

## Automated Testing Notes

The current implementation does not include automated tests. Future improvements could add:
- Unit tests for URL construction
- Integration tests for WebSocket communication
- Mock WebSocket server for testing
- E2E tests with Puppeteer

## Manual Test Checklist

Use this checklist when performing a full test:

- [ ] Extension loads without errors
- [ ] WebSocket option appears in UI
- [ ] All 4 engine types are selectable
- [ ] Version/elo/personality selectors work correctly
- [ ] Settings persist across sessions
- [ ] WebSocket connection establishes
- [ ] Analysis produces results
- [ ] Best moves are displayed
- [ ] Engine switching works
- [ ] Auto-reconnect functions
- [ ] Bullet mode works with WebSocket
- [ ] MultiPV displays alternative moves
- [ ] Depth and movetime modes both work
- [ ] Error handling is graceful
- [ ] Console logs are informative
- [ ] Backward compatibility maintained (other engines still work)
