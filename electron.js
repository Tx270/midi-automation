const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

// Wczytaj serwer bez spawn – działa też po spakowaniu
require(path.join(__dirname, 'src', 'main.js'));

function waitForServer(url, tries = 0) {
  const maxTries = 50;
  const delay = 200;

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      http.get(url, () => resolve())
        .on('error', () => {
          if (tries < maxTries) {
            setTimeout(() => tryConnect(), delay);
          } else {
            reject(new Error('Server did not start in time'));
          }
        });
    };
    tryConnect();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.removeMenu();
  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  waitForServer('http://localhost:3000')
    .then(() => {
      createWindow();
    })
    .catch(err => {
      console.error('Server start failed:', err);
      app.quit();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
