// Popup logic and settings management

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.local.get([
    'bullet_mode',
    'displayMovesOnSite',
    'engineIndex',
    'node_engine_url',
    'node_engine_name'
  ]);

  // Set checkbox states
  document.getElementById('bullet-mode').checked = settings.bullet_mode || false;
  document.getElementById('display-moves').checked = settings.displayMovesOnSite || false;
  
  // Set engine selection
  const engineSelect = document.getElementById('engine-select');
  engineSelect.value = settings.engineIndex !== undefined ? settings.engineIndex : 0;
  
  // Set node server settings
  document.getElementById('node-url').value = settings.node_engine_url || 'http://localhost:5000';
  document.getElementById('node-engine').value = settings.node_engine_name || 'stockfish-15'; // Platform-agnostic
  
  // Show/hide node settings based on engine selection
  toggleNodeSettings(parseInt(engineSelect.value));
  
  // Event listeners
  document.getElementById('bullet-mode').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ bullet_mode: e.target.checked });
    sendMessageToContentScript({ action: 'updateSetting', key: 'bullet_mode', value: e.target.checked });
  });
  
  document.getElementById('display-moves').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ displayMovesOnSite: e.target.checked });
    sendMessageToContentScript({ action: 'updateSetting', key: 'displayMovesOnSite', value: e.target.checked });
  });
  
  engineSelect.addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    await chrome.storage.local.set({ engineIndex: value });
    toggleNodeSettings(value);
    sendMessageToContentScript({ action: 'updateSetting', key: 'engineIndex', value: value });
  });
  
  document.getElementById('node-url').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ node_engine_url: e.target.value });
    sendMessageToContentScript({ action: 'updateSetting', key: 'node_engine_url', value: e.target.value });
  });
  
  document.getElementById('node-engine').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ node_engine_name: e.target.value });
    sendMessageToContentScript({ action: 'updateSetting', key: 'node_engine_name', value: e.target.value });
  });
  
  document.getElementById('open-gui').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  
  document.getElementById('get-best-move').addEventListener('click', () => {
    sendMessageToContentScript({ action: 'getBestMove' });
    updateStatus('Analyzing...');
  });
  
  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'statusUpdate') {
      updateStatus(request.status);
    } else if (request.type === 'analysisComplete') {
      updateStatus(`Best: ${request.move}`, 'success');
    }
  });
});

function toggleNodeSettings(engineIndex) {
  const nodeSettings = document.getElementById('node-settings');
  nodeSettings.style.display = engineIndex === 3 ? 'block' : 'none';
}

function updateStatus(text, className = '') {
  const statusElem = document.getElementById('status');
  statusElem.textContent = text;
  // Reset classes and apply new class if provided
  statusElem.className = 'status';
  if (className) {
    statusElem.classList.add(className);
  }
}

async function sendMessageToContentScript(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    console.error('Failed to send message to content script:', error);
  }
}
