# WebSocket Engine Integration

## Overview

The Smart Chess Bot now supports remote WebSocket engines from the `bettermint-sockets` project, allowing users to access powerful chess engines without running a local server.

## Available Engines

### 1. Stockfish
- **Description**: World's strongest chess engine
- **Versions**: 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16
- **URL Format**: `wss://ProtonnDev-engine.hf.space/stockfish-{version}`
- **Example**: `wss://ProtonnDev-engine.hf.space/stockfish-16`
- **Best For**: Maximum strength analysis, all skill levels

### 2. Maia Bot
- **Description**: Neural network engine with human-like play
- **Elo Range**: 1100-1900
- **URL Format**: `wss://ProtonnDev-engine.hf.space/maia-{elo}`
- **Example**: `wss://ProtonnDev-engine.hf.space/maia-1500`
- **Recommended Depth**: 5-6 (max 7)
- **Best For**: Learning from human-like analysis, playing at specific skill levels

### 3. Rodent III
- **Description**: Engine with different playing personalities
- **Personalities**: 
  - Chess Legends: anand, anderssen, botvinnik, fischer, larsen, marshall, nimzowitsch, petrosian, reti, rubinstein, spassky, steinitz, tarrasch
  - Fun Personalities: drunk, henny, kinghunter, remy, tortoise
- **URL Format**: `wss://ProtonnDev-engine.hf.space/rodent3-{personality}`
- **Example**: `wss://ProtonnDev-engine.hf.space/rodent3-fischer`
- **Best For**: Exploring different playing styles, educational purposes

### 4. Patricia
- **Description**: Aggressive attacking engine
- **Elo Range**: 1100-3200
- **URL Format**: `wss://ProtonnDev-engine.hf.space/patricia-{elo}`
- **Example**: `wss://ProtonnDev-engine.hf.space/patricia-2250`
- **Best For**: Aggressive tactical play, attacking positions

## Configuration

### Quick Setup (Popup)

1. Click the extension icon to open the popup
2. Select "Remote WebSocket" from the Engine dropdown
3. Choose your engine type (Stockfish, Maia, Rodent III, or Patricia)
4. Select the appropriate version/elo/personality
5. Start analyzing!

### Advanced Configuration (Options Page)

1. Click "Open Full Settings" in the popup or right-click the extension icon → Options
2. Navigate to the "Engine" section
3. Select "Remote WebSocket Engine" from the dropdown
4. Configure:
   - **WebSocket Base URL**: Default is `wss://ProtonnDev-engine.hf.space` (can be changed for custom servers)
   - **Engine Type**: Choose from Stockfish, Maia, Rodent III, or Patricia
   - **Engine Configuration**: 
     - Stockfish: Select version (1-16)
     - Maia: Enter Elo rating (1100-1900, step 100)
     - Rodent III: Select personality from dropdown
     - Patricia: Enter Elo rating (1100-3200, step 50)

## Features

### Automatic Connection Management
- **Auto-connect**: WebSocket connects automatically when the engine is selected
- **Auto-reconnect**: If the connection is lost, the engine attempts to reconnect after 2 seconds
- **Connection status**: Check the browser console for connection status messages

### UCI Protocol Support
- Full UCI protocol implementation over WebSocket
- Supports depth-based and movetime-based analysis
- MultiPV support for showing alternative best moves
- Proper handling of mate scores and centipawn evaluations

### Settings Synchronization
- Settings are saved in Chrome storage and persist across sessions
- Changing WebSocket settings automatically reconnects to the new configuration
- Switching to/from WebSocket engine properly cleans up connections

## Usage Tips

### For Best Results

1. **Choose the Right Engine**:
   - Use Stockfish 16 for maximum accuracy
   - Use Maia at your opponent's Elo for human-like analysis
   - Use Rodent III personalities to study different playing styles
   - Use Patricia for tactical, aggressive positions

2. **Adjust Depth**:
   - Stockfish: Can handle high depths (15-20)
   - Maia: Keep depth at 5-6 for best human-like results
   - Rodent III: Normal depth (10-15)
   - Patricia: Normal depth (10-15)

3. **Bullet Mode**:
   - Enable for fast games to get quicker (but less accurate) analysis
   - WebSocket engines work well with bullet mode

### Troubleshooting

**Connection Issues**:
- Check browser console (F12) for error messages
- Verify the WebSocket URL is correct
- Ensure your network allows WebSocket connections
- Try reconnecting by switching to another engine and back

**Slow Analysis**:
- The remote server may be under heavy load
- Try a lower depth setting
- Consider using bullet mode for faster results

**No Moves Displayed**:
- Check that "Display Moves on Board" is enabled in settings
- Verify the engine has finished analyzing (check console logs)
- Try clicking "Get Best Move" button in the popup

## Technical Details

### WebSocket Protocol Flow

1. **Connection**: `new WebSocket(url)`
2. **Initialization**: 
   ```
   uci
   isready
   ```
3. **Position Setup**: 
   ```
   ucinewgame
   position fen <fen_string>
   setoption name MultiPV value <n>
   ```
4. **Analysis**: 
   ```
   go depth <depth>
   // or
   go movetime <milliseconds>
   ```
5. **Response Parsing**: Parse `info` lines for depth/score, `bestmove` for final move

### State Management

- **websocketEngine**: WebSocket connection object
- **websocketEngineReady**: Boolean flag indicating engine is ready for commands
- **websocketPendingRequest**: Stores the current analysis request
- **websocketResponseBuffer**: Accumulates UCI output for parsing

### Error Handling

- Connection errors are logged to console
- Failed connections trigger auto-reconnect (when still using WebSocket engine)
- Stale responses are filtered by request ID matching
- Position changes during analysis discard old results

## Backward Compatibility

The WebSocket engine integration maintains full backward compatibility:
- All existing engines (Lozza, Stockfish 5, Stockfish 2018, Node Server, Lichess Cloud) continue to work
- Settings for other engines are preserved
- Switching between engines works seamlessly

## Credits

- **bettermint-sockets**: https://github.com/ProtonDev-sys/bettermint-sockets
- **Server**: Hosted on Hugging Face Spaces
- **Engines**: Stockfish, Maia, Rodent III, Patricia development teams

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your configuration in the Options page
3. Report issues on the GitHub repository: https://github.com/reductionfear/smartchessws
