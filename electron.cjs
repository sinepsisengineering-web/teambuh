// electron.cjs
const { app, BrowserWindow, ipcMain, Notification, dialog, Tray, Menu, nativeImage, powerSaveBlocker } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// 1. БЛОКИРОВКА ЭНЕРГОСБЕРЕЖЕНИЯ
// Критически важно для таймеров: запрещаем системе "усыплять" процесс в фоне
powerSaveBlocker.start('prevent-app-suspension');

// 2. ПОЛИТИКА ЗВУКА
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const isDev = !app.isPackaged;
let win;
let tray = null;

// 3. ХРАНИЛИЩЕ УВЕДОМЛЕНИЙ
// Чтобы сборщик мусора (Garbage Collection) не удалял уведомления до их показа
const activeNotifications = new Set();

// 4. ID ПРИЛОЖЕНИЯ
if (process.platform === 'win32') {
  app.setAppUserModelId('com.teambuh.app');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
  log.transports.file.level = "info";
  autoUpdater.logger = log;

  // <<< ВАЖНОЕ ИСПРАВЛЕНИЕ ДЛЯ ОБНОВЛЕНИЙ >>>
  // Разрешаем обновление с самоподписанным сертификатом (без покупки дорогого Code Signing Certificate)
  autoUpdater.verifyUpdateCodeSignature = false;

  log.info('TeamBuh is starting...');

  // Обработка повторного запуска (клик по ярлыку, когда приложение уже работает)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  const sendUpdateMessage = (message) => {
    log.info(`Отправка сообщения в UI: ${JSON.stringify(message)}`);
    if (win) {
      win.webContents.send('update-message', message);
    }
  };

  function createTray() {
    const iconPath = path.join(__dirname, 'icon.ico');
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      log.error('ОШИБКА: Иконка не найдена или файл пустой!');
    }
    
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Открыть', 
        click: () => {
          if (win) win.show();
        } 
      },
      { 
        label: 'Выход', 
        click: () => {
          app.isQuitting = true;
          app.quit();
        } 
      }
    ]);

    tray.setToolTip('TeamBuh');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (win) win.show();
    });
  }

  function createWindow() {
    const startHidden = process.argv.includes('--hidden');

    win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      icon: path.join(__dirname, 'icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false // Таймеры не будут замедляться в фоне
      }
    });

    win.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        win.hide();
        return false;
      }
    });

    if (isDev) {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
      win.show(); 
    } else {
      win.loadFile(path.join(__dirname, 'dist', 'index.html'));
      if (!startHidden) {
        win.show();
      }
    }
  }

  app.whenReady().then(() => {
    createWindow();
    createTray(); 
    
    if (!isDev) {
      setTimeout(() => {
          log.info('Запуск автоматической проверки обновлений...');
          autoUpdater.checkForUpdates();
      }, 5000);
    }
  });

  /* --- Секция обработчиков IPC --- */
  ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (event, enable) => {
    if (!app.isPackaged) {
      log.info('Автозапуск работает только в упакованном приложении.');
      return;
    }
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true, 
      path: app.getPath('exe'),
      args: ['--hidden']
    });
    log.info(`Автозапуск установлен в значение: ${enable}`);
  });

  ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    if (!focusedWindow) { return false; }
    const result = await dialog.showMessageBox(focusedWindow, {
      type: 'question',
      buttons: ['Отмена', 'Удалить'],
      defaultId: 0,
      cancelId: 0,
      title: options.title || 'Подтверждение действия',
      message: options.message || 'Вы уверены?',
      detail: options.detail || 'Это действие нельзя будет отменить.',
    });
    return result.response === 1; 
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.on('check-for-updates', () => {
    if (!isDev) {
      autoUpdater.checkForUpdates();
    } else {
      sendUpdateMessage({ status: 'info', text: 'Проверка обновлений не работает в режиме разработки.' });
    }
  });

  ipcMain.on('restart_app', () => {
      app.isQuitting = true;
      autoUpdater.quitAndInstall();
  });

  // === ГЛАВНОЕ ИЗМЕНЕНИЕ: Умная система уведомлений ===
  ipcMain.on('show-notification', (event, { title, body }) => {
    
    // 1. ВИЗУАЛЬНАЯ ТРЕВОГА (Обход режима "Не беспокоить")
    if (win) {
      // Вытаскиваем иконку из-под стрелочки ^ на главную панель
      win.setSkipTaskbar(false);

      // Если окно скрыто - делаем его активным на панели задач (но свернутым)
      if (!win.isVisible()) {
        win.showInactive();
        win.minimize(); 
      }

      // Заставляем иконку мигать оранжевым
      win.flashFrame(true);
    }

    // 2. СТАНДАРТНОЕ УВЕДОМЛЕНИЕ
    if (Notification.isSupported()) {
      const notification = new Notification({ 
        title: title, 
        body: body,
        silent: false, 
        icon: path.join(__dirname, 'icon.ico'),
        urgency: 'critical'
      });
      
      // Сохраняем, чтобы GC не удалил
      activeNotifications.add(notification);
      
      notification.show();
      
      notification.on('click', () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          if (!win.isVisible()) win.show();
          win.focus();
          win.flashFrame(false); // Прекращаем мигать при клике
        }
        activeNotifications.delete(notification);
      });

      notification.on('close', () => activeNotifications.delete(notification));
      notification.on('failed', () => activeNotifications.delete(notification));
    }
  });
  // =============================================================


  /* --- Секция логики обновлений --- */
  autoUpdater.on('checking-for-update', () => sendUpdateMessage({ status: 'checking', text: 'Поиск обновлений...' }));
  autoUpdater.on('update-available', (info) => sendUpdateMessage({ status: 'available', text: `Найдено обновление v${info.version}. Начинается скачивание...` }));
  autoUpdater.on('update-not-available', () => sendUpdateMessage({ status: 'info', text: 'У вас установлена последняя версия.' }));
  autoUpdater.on('error', (err) => sendUpdateMessage({ status: 'error', text: `Ошибка обновления: ${err.message}` }));
  autoUpdater.on('download-progress', (progressInfo) => {
    if (win) {
      win.webContents.send('update-progress', progressInfo);
    }
  });
  autoUpdater.on('update-downloaded', () => sendUpdateMessage({ status: 'downloaded', text: 'Обновление скачано и готово к установке.' }));


  /* --- Стандартная секция для окон --- */
  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') {
      // Пусто (оставляем процесс живым)
    }
  });

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}