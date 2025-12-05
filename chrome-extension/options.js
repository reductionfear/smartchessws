// Options page logic for Smart Chess Bot
// Uses chrome.storage.local for persistence

// Constants matching content.js
const MAX_DEPTH = 20;
const MIN_DEPTH = 1;
const MAX_MOVETIME = 2000;
const MIN_MOVETIME = 50;
const MAX_ELO = 3500;
const DEPTH_MODE = 0;
const MOVETIME_MODE = 1;
const rank = ["Beginner", "Intermediate", "Advanced", "Expert", "Master", "Grand Master"];

// Database keys matching content.js dbValues
const dbValues = {
  nightMode: 'nightMode',
  engineMode: 'engineMode',
  engineIndex: 'engineIndex',
  reload_every: 'reload_every',
  reload_engine: 'reload_engine',
  enableUserLog: 'enableUserLog',
  enableEngineLog: 'enableEngineLog',
  displayMovesOnSite: 'displayMovesOnSite',
  show_opposite_moves: 'show_opposite_moves',
  use_book_moves: 'use_book_moves',
  node_engine_url: 'node_engine_url',
  node_engine_name: 'node_engine_name',
  current_depth: 'current_depth',
  current_movetime: 'current_movetime',
  max_best_moves: 'max_best_moves',
  bestMoveColors: 'bestMoveColors',
  bullet_mode: 'bullet_mode',
  bullet_depth: 'bullet_depth',
  bullet_movetime: 'bullet_movetime'
};

// Default values
const defaults = {
  nightMode: false,
  engineMode: 0,
  engineIndex: 0,
  reload_every: 10,
  reload_engine: false,
  enableUserLog: true,
  enableEngineLog: true,
  displayMovesOnSite: false,
  show_opposite_moves: false,
  use_book_moves: false,
  node_engine_url: 'http://localhost:5000',
  node_engine_name: 'stockfish-15',
  current_depth: Math.round(MAX_DEPTH / 2),
  current_movetime: Math.round(MAX_MOVETIME / 3),
  max_best_moves: Math.floor(Math.round(MAX_DEPTH / 2) / 2),
  bestMoveColors: [],
  bullet_mode: false,
  bullet_depth: 4,
  bullet_movetime: 100
};

// Current settings state
let settings = { ...defaults };

// Helper function to generate random color
function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

// Calculate ELO based on current settings
function getElo() {
  let elo;
  if (settings.engineMode === DEPTH_MODE) {
    elo = (MAX_ELO / MAX_DEPTH) * settings.current_depth;
  } else {
    elo = (MAX_ELO / MAX_MOVETIME) * settings.current_movetime;
  }
  return Math.round(elo);
}

// Get rank based on current settings
function getRank() {
  let part;
  if (settings.engineMode === DEPTH_MODE) {
    part = settings.current_depth / (MAX_DEPTH / rank.length);
  } else {
    part = settings.current_movetime / (MAX_MOVETIME / rank.length);
  }
  part = Math.round(part);
  if (part >= rank.length) {
    part = rank.length - 1;
  }
  return rank[part];
}

// Update ELO display
function updateEloDisplay() {
  document.getElementById('elo-value').textContent = `Elo: ${getElo()}`;
  document.getElementById('elo-rank').textContent = `Rank: ${getRank()}`;
  if (settings.engineMode === DEPTH_MODE) {
    document.getElementById('elo-power').textContent = `Depth: ${settings.current_depth}`;
  } else {
    document.getElementById('elo-power').textContent = `Move Time: ${settings.current_movetime}`;
  }
}

// Update engine mode display (depth vs movetime)
function updateEngineModeDisplay() {
  const depthControl = document.getElementById('depth-control');
  const movetimeControl = document.getElementById('movetime-control');
  
  if (settings.engineMode === DEPTH_MODE) {
    depthControl.style.display = 'block';
    movetimeControl.style.display = 'none';
  } else {
    depthControl.style.display = 'none';
    movetimeControl.style.display = 'block';
  }
  
  updateEloDisplay();
}

// Update engine selection display
function updateEngineSelectionDisplay() {
  const nodeEngineDiv = document.getElementById('node-engine-div');
  const lichessCloudInfo = document.getElementById('lichess-cloud-info');
  const reloadEngineDiv = document.getElementById('reload-engine-div');
  const maxMovesDiv = document.getElementById('max-moves-div');
  
  const node_engine_id = 3;
  const lichess_cloud_engine_id = 4;
  
  if (settings.engineIndex === node_engine_id) {
    nodeEngineDiv.style.display = 'block';
    lichessCloudInfo.style.display = 'none';
    reloadEngineDiv.style.display = 'none';
    maxMovesDiv.style.display = 'none';
  } else if (settings.engineIndex === lichess_cloud_engine_id) {
    nodeEngineDiv.style.display = 'none';
    lichessCloudInfo.style.display = 'block';
    reloadEngineDiv.style.display = 'none';
    maxMovesDiv.style.display = 'block';
  } else {
    nodeEngineDiv.style.display = 'none';
    lichessCloudInfo.style.display = 'none';
    reloadEngineDiv.style.display = 'block';
    maxMovesDiv.style.display = 'block';
  }
}

// Update reload engine div visibility
function updateReloadEngineDisplay() {
  const reloadCountDiv = document.getElementById('reload-count-div');
  reloadCountDiv.style.display = settings.reload_engine ? 'block' : 'none';
}

// Update bullet settings visibility
function updateBulletSettingsDisplay() {
  const bulletSettings = document.getElementById('bullet-settings');
  bulletSettings.style.display = settings.bullet_mode ? 'block' : 'none';
}

// Update night mode
function updateNightMode() {
  const body = document.body;
  const nightModeBtn = document.getElementById('night-mode');
  
  if (settings.nightMode) {
    body.classList.add('night');
    nightModeBtn.textContent = 'Disable Night Mode';
  } else {
    body.classList.remove('night');
    nightModeBtn.textContent = 'Enable Night Mode';
  }
}

// Update best move colors display
async function updateBestMoveColors() {
  const container = document.getElementById('best-moves-colors');
  container.innerHTML = '';
  
  // Ensure we have enough colors
  while (settings.bestMoveColors.length < settings.max_best_moves) {
    settings.bestMoveColors.push(getRandomColor());
  }
  
  // Trim excess colors
  settings.bestMoveColors = settings.bestMoveColors.slice(0, settings.max_best_moves);
  
  // Save the updated colors array
  await chrome.storage.local.set({ [dbValues.bestMoveColors]: settings.bestMoveColors });
  
  settings.bestMoveColors.forEach((color, index) => {
    const div = document.createElement('div');
    div.className = 'color-input-group';
    div.innerHTML = `
      <label for="best-move-color-${index}">Best Move ${index + 1}:</label>
      <input type="color" id="best-move-color-${index}" value="${color}">
    `;
    container.appendChild(div);
    
    document.getElementById(`best-move-color-${index}`).addEventListener('change', async (e) => {
      settings.bestMoveColors[index] = e.target.value;
      await chrome.storage.local.set({ [dbValues.bestMoveColors]: settings.bestMoveColors });
    });
  });
}

// Save a setting
async function saveSetting(key, value) {
  settings[key] = value;
  await chrome.storage.local.set({ [dbValues[key]]: value });
}

// Load all settings from storage
async function loadSettings() {
  const keys = Object.values(dbValues);
  const stored = await chrome.storage.local.get(keys);
  
  // Map stored values to settings
  Object.keys(dbValues).forEach(key => {
    const storageKey = dbValues[key];
    if (stored[storageKey] !== undefined) {
      settings[key] = stored[storageKey];
    }
  });
  
  // Initialize colors if not set
  if (!settings.bestMoveColors || settings.bestMoveColors.length === 0) {
    settings.bestMoveColors = Array.from({ length: settings.max_best_moves }, () => getRandomColor());
    await chrome.storage.local.set({ [dbValues.bestMoveColors]: settings.bestMoveColors });
  }
}

// Apply all settings to UI
async function applySettingsToUI() {
  // Engine selection
  document.getElementById('select-engine').value = settings.engineIndex;
  
  // Engine mode
  document.getElementById('select-engine-mode').value = settings.engineMode;
  
  // Depth/Movetime
  document.getElementById('depth-range').value = settings.current_depth;
  document.getElementById('depth-range-number').value = settings.current_depth;
  document.getElementById('movetime-range').value = settings.current_movetime;
  document.getElementById('movetime-range-number').value = settings.current_movetime;
  
  // Max moves
  document.getElementById('max-moves').value = settings.max_best_moves;
  document.getElementById('max-moves').max = Math.floor(settings.current_depth / 2);
  
  // Node engine settings
  document.getElementById('engine-url').value = settings.node_engine_url;
  document.getElementById('engine-name').value = settings.node_engine_name;
  
  // Checkboxes
  document.getElementById('use-book-moves').checked = settings.use_book_moves;
  document.getElementById('reload-engine').checked = settings.reload_engine;
  document.getElementById('reload-count').value = settings.reload_every;
  document.getElementById('bullet-mode').checked = settings.bullet_mode;
  document.getElementById('bullet-depth').value = settings.bullet_depth;
  document.getElementById('bullet-movetime').value = settings.bullet_movetime;
  document.getElementById('display-moves-on-site').checked = settings.displayMovesOnSite;
  document.getElementById('show-opposite-moves').checked = settings.show_opposite_moves;
  document.getElementById('enable-user-log').checked = settings.enableUserLog;
  document.getElementById('enable-engine-log').checked = settings.enableEngineLog;
  
  // Update displays
  updateNightMode();
  updateEngineModeDisplay();
  updateEngineSelectionDisplay();
  updateReloadEngineDisplay();
  updateBulletSettingsDisplay();
  await updateBestMoveColors();
}

// Initialize event listeners
function initEventListeners() {
  // Night mode toggle
  document.getElementById('night-mode').addEventListener('click', async () => {
    settings.nightMode = !settings.nightMode;
    await saveSetting('nightMode', settings.nightMode);
    updateNightMode();
  });
  
  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await chrome.storage.local.clear();
      settings = { ...defaults };
      settings.bestMoveColors = Array.from({ length: settings.max_best_moves }, () => getRandomColor());
      await chrome.storage.local.set(
        Object.fromEntries(
          Object.entries(dbValues).map(([key, storageKey]) => [storageKey, settings[key]])
        )
      );
      await applySettingsToUI();
    }
  });
  
  // Tutorials button
  document.getElementById('tutorials').addEventListener('click', () => {
    window.open('https://www.youtube.com/watch?v=WaqI4l_hmIE&t=16s', '_blank');
  });
  
  // Engine selection
  document.getElementById('select-engine').addEventListener('change', async (e) => {
    settings.engineIndex = parseInt(e.target.value);
    await saveSetting('engineIndex', settings.engineIndex);
    updateEngineSelectionDisplay();
  });
  
  // Engine mode
  document.getElementById('select-engine-mode').addEventListener('change', async (e) => {
    settings.engineMode = parseInt(e.target.value);
    await saveSetting('engineMode', settings.engineMode);
    updateEngineModeDisplay();
  });
  
  // Depth range
  document.getElementById('depth-range').addEventListener('input', async (e) => {
    const value = parseInt(e.target.value);
    settings.current_depth = value;
    document.getElementById('depth-range-number').value = value;
    
    // Update max best moves
    const maxMoves = Math.floor(value / 2);
    document.getElementById('max-moves').max = maxMoves;
    if (settings.max_best_moves > maxMoves) {
      settings.max_best_moves = maxMoves;
      document.getElementById('max-moves').value = maxMoves;
      await saveSetting('max_best_moves', maxMoves);
      await updateBestMoveColors();
    }
    
    await saveSetting('current_depth', value);
    updateEloDisplay();
  });
  
  document.getElementById('depth-range-number').addEventListener('change', async (e) => {
    let value = parseInt(e.target.value);
    value = Math.max(MIN_DEPTH, Math.min(MAX_DEPTH, value));
    e.target.value = value;
    settings.current_depth = value;
    document.getElementById('depth-range').value = value;
    
    // Update max best moves
    const maxMoves = Math.floor(value / 2);
    document.getElementById('max-moves').max = maxMoves;
    if (settings.max_best_moves > maxMoves) {
      settings.max_best_moves = maxMoves;
      document.getElementById('max-moves').value = maxMoves;
      await saveSetting('max_best_moves', maxMoves);
      await updateBestMoveColors();
    }
    
    await saveSetting('current_depth', value);
    updateEloDisplay();
  });
  
  // Movetime range
  document.getElementById('movetime-range').addEventListener('input', async (e) => {
    const value = parseInt(e.target.value);
    settings.current_movetime = value;
    document.getElementById('movetime-range-number').value = value;
    await saveSetting('current_movetime', value);
    updateEloDisplay();
  });
  
  document.getElementById('movetime-range-number').addEventListener('change', async (e) => {
    let value = parseInt(e.target.value);
    value = Math.max(MIN_MOVETIME, Math.min(MAX_MOVETIME, value));
    e.target.value = value;
    settings.current_movetime = value;
    document.getElementById('movetime-range').value = value;
    await saveSetting('current_movetime', value);
    updateEloDisplay();
  });
  
  // Max moves
  document.getElementById('max-moves').addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    settings.max_best_moves = value;
    await saveSetting('max_best_moves', value);
    await updateBestMoveColors();
  });
  
  // Use book moves
  document.getElementById('use-book-moves').addEventListener('change', async (e) => {
    await saveSetting('use_book_moves', e.target.checked);
  });
  
  // Reload engine
  document.getElementById('reload-engine').addEventListener('change', async (e) => {
    settings.reload_engine = e.target.checked;
    await saveSetting('reload_engine', e.target.checked);
    updateReloadEngineDisplay();
  });
  
  document.getElementById('reload-count').addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    await saveSetting('reload_every', value);
  });
  
  // Node engine settings
  document.getElementById('engine-url').addEventListener('change', async (e) => {
    await saveSetting('node_engine_url', e.target.value);
  });
  
  document.getElementById('engine-name').addEventListener('change', async (e) => {
    await saveSetting('node_engine_name', e.target.value);
  });
  
  // Bullet mode
  document.getElementById('bullet-mode').addEventListener('change', async (e) => {
    settings.bullet_mode = e.target.checked;
    await saveSetting('bullet_mode', e.target.checked);
    updateBulletSettingsDisplay();
  });
  
  document.getElementById('bullet-depth').addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    await saveSetting('bullet_depth', value);
  });
  
  document.getElementById('bullet-movetime').addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    await saveSetting('bullet_movetime', value);
  });
  
  // Visual settings
  document.getElementById('display-moves-on-site').addEventListener('change', async (e) => {
    await saveSetting('displayMovesOnSite', e.target.checked);
  });
  
  document.getElementById('show-opposite-moves').addEventListener('change', async (e) => {
    await saveSetting('show_opposite_moves', e.target.checked);
  });
  
  // Log settings
  document.getElementById('enable-user-log').addEventListener('change', async (e) => {
    await saveSetting('enableUserLog', e.target.checked);
  });
  
  document.getElementById('enable-engine-log').addEventListener('change', async (e) => {
    await saveSetting('enableEngineLog', e.target.checked);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await applySettingsToUI();
  initEventListeners();
});
