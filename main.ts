import { app, BrowserWindow, screen, ipcMain, Tray, Menu } from 'electron';
import * as ioHook from 'iohook';
import * as path from 'path';
import * as url from 'url';
import { CronJob } from 'cron';
let win, serve, size, isTrack, keyboardCount, mouseCount, timerHandlers;
let takeScreenshotEvent, createNewActivityEvent, trayControlEvent, cronjobHandler, tray;
let contextMenu, currentTaskId, currentProjectId, selectedTaskId, selectedProjectId, previousTimestamp;
const spanSeconds = 60;
const args = process.argv.slice(1);
isTrack = false;
keyboardCount = 0;
mouseCount = 0;
currentTaskId = -1;
currentProjectId = -1;
selectedTaskId = -1;
selectedProjectId = -1;
previousTimestamp = 0;
serve = args.some(val => val === '--serve');
timerHandlers = [];

function createWindow() {

  const electronScreen = screen;
  size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    // x: 0,
    // y: 0,
    width: 1280,
    height: 720,
    // width: 472,
    // height: 667,
    center: true,
    minWidth: 472,
    minHeight: 667,
    // maxWidth: 472,
    // maxHeight: 667,
    maximizable: false,
    minimizable: false
    // width: size.width,
    // height: size.height
  });


  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  /**
   * Set tray icon
   */
  const iconPath = path.join(__dirname, 'tray.png');

  tray = new Tray(iconPath);
  contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start',
      click: function() {
        if (selectedTaskId >= 0 && selectedProjectId >= 0 && trayControlEvent) {
          trayControlEvent.sender.send('tray-icon-control-reply', {
            status: 'start',
            taskId: selectedTaskId,
            projectId: selectedProjectId
          });
        }
      }
    },
    {
      label: 'Stop',
      click: function() {
        if (currentTaskId >= 0 && currentProjectId >= 0 && trayControlEvent) {
          trayControlEvent.sender.send('tray-icon-control-reply', {
            status: 'stop',
            taskId: currentTaskId,
            projectId: currentProjectId
          });
        }
      }
    },
    // {
    //   label: 'Quit',
    //   accelerator: 'Command+Q',
    //   click: function() {
    //     app.quit();
    //   }
    // }
  ]);

  if (contextMenu) {
    contextMenu.items[0].enabled = false;
    contextMenu.items[1].enabled = false;
  }

  tray.setToolTip('Time Tracker');
  tray.setContextMenu(contextMenu);

  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    // win.close();
    win = null;
  });

}

/**
 * format date from standard Date type
 * @param date : Date type
 */
function formatDate(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;
  const strTime = hours + ':' + minutes + ':' + seconds;
  const years = date.getFullYear();
  const months = date.getMonth() + 1;
  const dates = date.getDate();
  return years + '-' + months + '-' + dates + ' ' + strTime;
}

/**
 * update track
 * @param projectId: project id
 * @param taskId: task id
 * @param timestamp: timestamp
 * @param isImmediate: immediate process flag
 */
function updateTracks(projectId, taskId, timestamp, isImmediate = false) {
  takeScreenShots(taskId, spanSeconds * 1000, isImmediate);
  const newActivity = createNewActivity(projectId, taskId, timestamp);
  console.log('---create activity---');
  console.log(newActivity);
  createNewActivityEvent.sender.send('create-new-activity-reply', newActivity);
}

/**
 * create new activity
 * @param projectId: project id
 * @param taskId: task id
 * @param timestamp: timestamp
 */
function createNewActivity(projectId, taskId, timestamp) {
  let duration = Math.floor((timestamp - previousTimestamp) / 1000);

  if (duration > 57) {
    duration = spanSeconds;
  }

  const newActivity = {
    project_id: projectId,
    task_id: taskId,
    duration: duration,
    mode: 'MANUAL',
    reason: 'task interval screenshot detail done',
    date: formatDate(new Date(timestamp)),
    from_time: formatDate(new Date(previousTimestamp)),
    to_time: formatDate(new Date(timestamp)),
    screenshot_urls: [],
    mouse_click_count: mouseCount,
    keyboard_count: keyboardCount
  };

  mouseCount = 0;
  keyboardCount = 0;
  previousTimestamp = timestamp;
  return newActivity;
}

/**
 * take screenshots of desktop from UI
 * @param during: interval between activities
 * @param isImmediate: immediate proecss flag
 */
function takeScreenShots(taskId, during, isImmediate = false) {
  if (isImmediate) {
    timerHandlers[0] = takeScreenshotEvent.sender.send('take-screenshot-reply', taskId);
    return;
  }

  // take a screenshot in random
  console.log('--- start random screenshot ---');
  for (let index = 0; index < 3; index ++) {
    const time = Math.random() * during;
    console.log('random time: ', time);
    timerHandlers[index] = setTimeout(() => {
      takeScreenshotEvent.sender.send('take-screenshot-reply', taskId);
    }, time);
  }
}

/**
 * stop interval
 */
function stopInterval() {
  for (let index = 0; index < 3; index ++) {
    if (timerHandlers[index]) {
      clearInterval(timerHandlers[index]);
    }
  }
}

/**
 * clear local data
 */
function clearData() {
  isTrack = false;
  mouseCount = 0;
  keyboardCount = 0;
  previousTimestamp = 0;
  currentTaskId = -1;
  currentProjectId = -1;
  selectedProjectId = -1;
  selectedTaskId = -1;
  stopInterval();
}

/**
 * destroy ipcMain listeners and cron job handler
 */
function destroyListners() {
  if (ipcMain) {
    ipcMain.removeAllListeners('get-current-ids');
    ipcMain.removeAllListeners('get-selected-ids');
    ipcMain.removeAllListeners('get-window-size');
    ipcMain.removeAllListeners('take-screenshot');
    ipcMain.removeAllListeners('select-task');
    ipcMain.removeAllListeners('start-track');
    ipcMain.removeAllListeners('stop-track');
    ipcMain.removeAllListeners('create-new-activity');
    ipcMain.removeAllListeners('tray-icon-control');
  }

  if (cronjobHandler) {
    cronjobHandler.stop();
  }
}

// function parseCookies (rc) {
//   var list = {};

//   rc && rc.split(';').forEach(function( cookie ) {
//     var parts = cookie.split('=');
//     list[parts.shift().trim()] = decodeURI(parts.join('='));
//   });

//   return list;
// }

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform !== 'darwin') {

    // }
    app.quit();
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  app.on('before-quit', function (evt) {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    ioHook.stop();
    ioHook.unload();
    destroyListners();
  });

  /**
   * Cron Job for interval event
   */
  cronjobHandler = new CronJob('0 */1 * * * *', function() {
    console.log('cronjob running:');
    if (isTrack) {
      updateTracks(currentProjectId, currentTaskId, Date.now());
    }
  }, null, true, 'America/Los_Angeles');

  /**
   * ipcMain lisner to get current task id and project id
   */
  ipcMain.on('get-current-ids', (event, arg) => {
    event.sender.send('get-current-ids-reply', {
      currentTaskId: currentTaskId,
      currentProjectId: currentProjectId
    });
  });

  /**
   * ipcMain lisner to get selected task id and project id
   */
  ipcMain.on('get-selected-ids', (event, arg) => {
    event.sender.send('get-selected-ids-reply', {
      selectedTaskId: selectedTaskId,
      selectedProjectId: selectedProjectId
    });
  });

  /**
   * ipcMain lisner to get current desktop window size
   */
  ipcMain.on('get-window-size', (event, arg) => {
    event.sender.send('get-window-size-reply', size);
  });

  /**
   * ipcMain lisner to get screenshot event
   */
  ipcMain.on('take-screenshot', (event, arg) => {
    takeScreenshotEvent = event;
  });

  /**
   * ipcMain lisner to get task id selected
   */
  ipcMain.on('select-task', (event, arg) => {
    if (currentProjectId < 0 && currentTaskId < 0) {
      selectedTaskId = parseInt(arg['taskId'], 10);
      selectedProjectId = parseInt(arg['projectId'], 10);
      event.sender.send('get-selected-ids-reply', {
        selectedTaskId: selectedTaskId,
        selectedProjectId: selectedProjectId
      });

      if (contextMenu) {
        contextMenu.items[0].enabled = true;
        contextMenu.items[1].enabled = false;
        tray.setContextMenu(contextMenu);
      }
    }
  });

  /**
   * ipcMain lisner to quit the app
   */
  ipcMain.on('quit-app', (event, arg) => {
    win = null;
    app.quit();
  });

  /**
   * ipcMain lisner to get start time tracking event
   */
  ipcMain.on('start-track', (event, arg) => {
    if (currentTaskId >= 0 && currentProjectId >= 0) {
      if (currentTaskId !== arg['taskId'] || currentProjectId !== arg['projectId']) {
        isTrack = false;
        if (contextMenu) {
          contextMenu.items[0].enabled = true;
          contextMenu.items[1].enabled = false;
          tray.setContextMenu(contextMenu);
        }
        const newActivity = createNewActivity(currentProjectId, currentTaskId, Date.now());
        event.sender.send('stop-track-reply', newActivity);
        clearData();
      }
    }

    isTrack = true;

    if (contextMenu) {
      contextMenu.items[0].enabled = false;
      contextMenu.items[1].enabled = true;
      tray.setContextMenu(contextMenu);
    }

    currentTaskId = arg['taskId'];
    selectedTaskId = arg['taskId'];
    currentProjectId = arg['projectId'];
    selectedProjectId = arg['projectId'];
    previousTimestamp = Date.now();
    takeScreenShots(currentTaskId, spanSeconds * 1000, true);
    event.sender.send('start-track-reply', {
      currentTaskId: currentTaskId,
      currentProjectId: currentProjectId,
      selectedTaskId: selectedTaskId,
      selectedProjectId: selectedProjectId
    });
  });

  /**
   * ipcMain lisner to get stop time tracking event
   */
  ipcMain.on('stop-track', (event, arg) => {
    isTrack = false;
    const newActivity = createNewActivity(arg['projectId'], arg['taskId'], Date.now());
    event.sender.send('stop-track-reply', newActivity);
    clearData();
    if (contextMenu) {
      contextMenu.items[0].enabled = false;
      contextMenu.items[1].enabled = false;
      tray.setContextMenu(contextMenu);
    }
  });

  /**
   * ipcMain lisner to get event of tray icon control
   */
  ipcMain.on('tray-icon-control', (event, arg) => {
    trayControlEvent = event;
  });

  /**
   * ipcMain lisner to get event of new activity creation
   */
  ipcMain.on('create-new-activity', (event, arg) => {
    createNewActivityEvent = event;
  });

  /**
   * ioHook listener to get key down event
   */
  ioHook.on('keydown', event => {
    if (isTrack) {
      keyboardCount ++;
    }
  });

  /**
   * ioHook listener to get mouse down event
   */
  ioHook.on('mousedown', event => {
    if (isTrack) {
      mouseCount ++;
    }
  });

  // Register and start hook
  ioHook.start(false);

} catch (e) {
  console.log('error: ', e);
  // Catch Error
  // throw e;
}
