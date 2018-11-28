import { app, BrowserWindow, screen, ipcMain, Tray, Menu, shell } from 'electron';
import * as ioHook from 'iohook';
import * as path from 'path';
import * as url from 'url';
import * as moment from 'moment';
import { CronJob } from 'cron';
import { notify } from 'node-notifier';
let win, serve, size, isTrack, keyboardCount, mouseCount, timerHandlers, settingData;
let takeScreenshotEvent, createNewActivityEvent, trayControlEvent, tray, engagementEvent, selectProjectEvent, controlEvent;
let engagementCronjobHandler, trackingCronjobHandler, checkTrackOnHandler;
let contextMenu, currentTaskId, currentProjectId, selectedTaskId, selectedProjectId, previousTimestamp;
let idleSettingTime, lastTrackTimestamp, totalIdleTime, lastProjectTime, timeIntervalMins;
let projectsDetail, selectedProject;
lastTrackTimestamp = 0;
lastProjectTime = 0;
totalIdleTime = 0;
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
timeIntervalMins = 0;
serve = args.some(val => val === '--serve');
timerHandlers = [];
settingData = {};
projectsDetail = {};
selectedProject = {};

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
      label: 'Engagement(09:00AM - 10:00AM)',
      sublabel: '34% 2%'
    },
    {
      label: 'Timer is running',
      click: () => {
        if (selectedTaskId >= 0 && selectedProjectId >= 0 && trayControlEvent) {
          trayControlEvent.sender.send('tray-icon-control-reply', {
            status: 'start',
            taskId: selectedTaskId,
            projectId: selectedProjectId
          });
        }
      },
      icon: path.join(__dirname, 'src/assets/images/pause.png')
    },
    {
      label: 'Timer is paused',
      click: () => {
        if (currentTaskId >= 0 && currentProjectId >= 0 && trayControlEvent) {
          trayControlEvent.sender.send('tray-icon-control-reply', {
            status: 'stop',
            taskId: currentTaskId,
            projectId: currentProjectId
          });
        }
      },
      icon: path.join(__dirname, 'src/assets/images/play.png')
    },
    {
      label: 'Switch Projects',
      submenu: [
        {
          label: 'Project1'
        },
        {
          label: 'Project2'
        }
      ]
    },
    {
      label: 'Add a note',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'note'});
      }
    },
    {
      label: 'Open Dashboard',
      click: () => {
        shell.openExternal('https://tracklyapp.appup.cloud/trackly/#/430/1587/dashboard');
      }
    },
    {
      label: 'Settings',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'setting'});
      }
    },
    {
      label: 'About Track.ly',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'about'});
      }
    },
    {
      label: 'Help',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'help'});
      }
    },
    {
      label: 'Check for updates',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'check'});
      }
    },
    {
      label: 'Sign out',
      click: () => {
        controlEvent.sender.send('control-event-reply', {type: 'signout'});
      }
    },
    {
      label: 'Quit tracker',
      click: () => {
        win = null;
        app.quit();
      }
    }
  ]);

  if (contextMenu) {
    contextMenu.items[1].enabled = false;
    contextMenu.items[2].enabled = false;
  }

  tray.setToolTip('Time Tracker');
  tray.setContextMenu(contextMenu);
  initData();

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

function initData() {
  totalIdleTime = 0;
  projectsDetail = {};
  customNotify('Test', 'Test');
}

/**
 * calculate idle time
 */
function calcuateIdleTime() {
  if (lastTrackTimestamp !== 0) {
    const diffInMin = Math.abs(lastTrackTimestamp - Date.now());
    if (diffInMin > idleSettingTime * 60 * 1000) { // idle setting time is as a minute format
      totalIdleTime += diffInMin;
    }
  }

  lastTrackTimestamp = Date.now();
}

/**
 * calculate engagement percentage
 */
function calculateEngagementPer() {
  const hourInSeconds = 60 * 60 * 1000;
  return Math.abs((hourInSeconds - totalIdleTime) / hourInSeconds * 100);
}

/**
 * notification function
 * @param title: notification title
 * @param message: notification message
 */
function customNotify(title, message) {
  notify({
    title: title,
    message: message
  }, (err, res) => {
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
  if (settingData['notify_me_screenshot']) {
    customNotify('Time Tracker', 'Screenshot taken');
  }
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
 * check if current weekday is inside target ones
 * @param weekDayString: weekdays string
 */
function checkWeekday(weekDayString) {
  const currentWeekday = moment().isoWeekday();
  const defaultWeekDays = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekDays = weekDayString.trim().toLowerCase().split(',');
  return (weekDays.indexOf(defaultWeekDays[currentWeekday]) > -1);
}

/**
 * check if current time is in track on time
 * @param startTime: start time
 * @param endTime: end time
 */
function checkTrackOnTime(startTime, endTime) {
  if (moment(new Date()).format('HH:mm:ss') >= startTime && moment(new Date()).format('HH:mm:ss') <= endTime) {
    return true;
  }

  return false;
}

/**
 * check track on status
 */
function checkTrackOnStatus() {
  if (settingData['untracked_for_in_min']) {
    if (checkTrackOnHandler) {
      clearInterval(checkTrackOnHandler);
    }

    const interval = parseInt(settingData['untracked_for_in_min'], 10) * 60 * 1000;
    checkTrackOnHandler = setInterval(() => {
      if (
        settingData['notify_me_track_on'] &&
        checkWeekday(settingData['track_on']) &&
        checkTrackOnTime(settingData['start_time'], settingData['end_time'])
      ) {
        if (!isTrack) {
          customNotify('Time Tracker', 'Rimnider: You\'re not tracking time.');
        }
      }
    }, interval);
  }
}

function createTrackingCronJob() {
  if (timeIntervalMins >= 60) {
    console.log('Tracking interval is greater than 60');
    return;
  }

  if (trackingCronjobHandler) {
    trackingCronjobHandler.stop();
  }
  console.log('timeIntervalMins: ', timeIntervalMins)

  trackingCronjobHandler = new CronJob('0 */' + timeIntervalMins + ' * * * *', () => {
    console.log('tracking cronjob running:');
    // increase timer
    if (projectsDetail.hasOwnProperty(selectedProject['id'])) {
      const current = Date.now();
      const diffInMiniSecs = current - lastProjectTime;
      projectsDetail[selectedProject['id']]['time'] += diffInMiniSecs;
      lastProjectTime = current;
      selectProjectEvent.sender.send('select-project-reply', {
        projectId: selectedProject['id'],
        during: projectsDetail[selectedProject['id']]['time']
      });
      updateTrayTitle();
    }

    if (isTrack) {
      updateTracks(currentProjectId, currentTaskId, Date.now());
    }
  }, null, true);
}

/**
 * convert seconds to hh:mm
 * @param secs: seconds
 */
function makeTrayTime(secs) {
  const hours =  Math.floor(Math.floor(secs / 3600));
  const minutes = Math.floor(Math.floor((secs - (hours * 3600)) / 60));
  // const seconds = Math.floor((secs - ((secs * 3600) + (minutes * 60))) % 60);

  const dHours = (hours > 9 ? hours : '0' + hours);
  const dMins = (minutes > 9 ? minutes : '0' + minutes);
  return dHours + ':' + dMins;
}

/**
 * update tray title
 */
function updateTrayTitle() {
  const timeInMiniSecs = parseInt(projectsDetail[selectedProject['id']]['time'], 10);
  const projectTimer = makeTrayTime(Math.floor(timeInMiniSecs / 1000));
  tray.setTitle(`${selectedProject['code']} ${projectTimer}`);
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
    ipcMain.removeAllListeners('get-engagement');
    ipcMain.removeAllListeners('select-project');
    ipcMain.removeAllListeners('control-event');
  }

  if (trackingCronjobHandler) {
    trackingCronjobHandler.stop();
  }

  if (engagementCronjobHandler) {
    engagementCronjobHandler.stop();
  }

  if (checkTrackOnHandler) {
    clearInterval(checkTrackOnHandler);
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

  app.on('before-quit', (evt) => {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    ioHook.stop();
    ioHook.unload();
    destroyListners();
  });

  /**
   * Cron Job for Engagement
   */
  engagementCronjobHandler = new CronJob('0 0 */1 * * *', () => {
    console.log('engagement cronjob running:');
    const engagementPer = calculateEngagementPer();

    engagementEvent.sender.send('get-engagement-reply', {
      engagementPer: engagementPer,
      currentEngageTime: moment().format('H')
    });
    totalIdleTime = 0;

    // check the reset time
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();

    if (currentHours === 0 && currentMinutes === 0) {
      for (const key in projectsDetail) {
        if (projectsDetail.hasOwnProperty(key)) {
          projectsDetail[key]['time'] = 0;
        }
      }
    }
  }, null, true);

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
   * ipcMain lisner to get control event
   */
  ipcMain.on('control-event', (event, arg) => {
    controlEvent = event;
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
        contextMenu.items[1].enabled = true;
        contextMenu.items[2].enabled = false;
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
          contextMenu.items[1].enabled = true;
          contextMenu.items[2].enabled = false;
          tray.setContextMenu(contextMenu);
        }
        const newActivity = createNewActivity(currentProjectId, currentTaskId, Date.now());
        event.sender.send('stop-track-reply', newActivity);
        clearData();
      }
    }

    isTrack = true;
    lastTrackTimestamp = Date.now();

    if (contextMenu) {
      contextMenu.items[1].enabled = false;
      contextMenu.items[2].enabled = true;
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
      contextMenu.items[1].enabled = false;
      contextMenu.items[2].enabled = false;
      tray.setContextMenu(contextMenu);
    }
  });

  /**
   * ipcMain lisner to update setting
   */
  ipcMain.on('update-setting', (event, arg) => {
    settingData = arg['setting'];
    checkTrackOnStatus();
  });

  /**
   * ipcMain lisner to select project
   */
  ipcMain.on('select-project', (event, arg) => {console.log('--seelect-project:', arg)
    const current = Date.now();
    selectProjectEvent = event;
    selectedProject = arg['project'];

    if (selectedProject['id']) { // if project is selected
      idleSettingTime = selectedProject['ideal_time_interval_mins'] ? parseInt(selectedProject['ideal_time_interval_mins'], 10) : 0;
      timeIntervalMins = selectedProject['time_interval_mins'] ? parseInt(selectedProject['time_interval_mins'], 10) : 0;
      createTrackingCronJob();
      lastProjectTime = current;
      selectProjectEvent.sender.send('select-project-reply', {
        projectId: selectedProject['id'],
        during: projectsDetail[selectedProject['id']]['time']
      });

      updateTrayTitle();
    } else { // if any project is not selected
      if (
        Object.keys(selectedProject).length !== 0 &&
        selectedProject['id'] &&
        projectsDetail.hasOwnProperty(selectedProject['id'])
      ) { // if there is previous selected project
        const diffInMiniSecs = current - lastProjectTime;
        projectsDetail[selectedProject['id']]['time'] += diffInMiniSecs;
        selectProjectEvent.sender.send('select-project-reply', {
          projectId: selectedProject['id'],
          during: projectsDetail[selectedProject['id']]['time']
        });
      }

      selectedProject = {};
      tray.setTitle('');
    }
  });

  /**
   * ipcMain lisner to get all projects
   */
  ipcMain.on('get-all-projects', (event, arg) => {
    if (arg['projects'] && arg['projects'].length > 0) {
      for (let index = 0; index < arg['projects'].length; index ++) {
        if (arg['projects'][index] && arg['projects'][index]['id']) {
          if (!projectsDetail.hasOwnProperty(arg['projects'][index]['id'])) {
            projectsDetail[arg['projects'][index]['id']] = {
              time: 0
            };
          }
        }
      }
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
   * ipcMain lisner to get event of engagement
   */
  ipcMain.on('get-engagement', (event, arg) => {
    engagementEvent = event;

    engagementEvent.sender.send('get-engagement-reply', {
      engagementPer: 0,
      currentEngageTime: moment().format('H')
    });
    totalIdleTime = 0;
  });

  /**
   * ioHook listener to get key down event
   */
  ioHook.on('keydown', event => {
    if (isTrack) {
      keyboardCount ++;
      calcuateIdleTime();
    }
  });

  /**
   * ioHook listener to get mouse down event
   */
  ioHook.on('mousedown', event => {
    if (isTrack) {
      mouseCount ++;
      calcuateIdleTime();
    }
  });

  // Register and start hook
  ioHook.start(false);

} catch (e) {
  console.log('error: ', e);
  // Catch Error
  // throw e;
}
