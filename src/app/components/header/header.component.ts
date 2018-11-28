import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService } from '../_services/data.service';
import { ElectronService } from '../../providers/electron.service';
import { MatDialog } from '@angular/material';
import { NoteComponent } from '../modals/note/note.component';
import { SettingModalComponent } from '../modals/setting-modal/setting-modal.component';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLogin: boolean; // user login flag
  isRunTimer: boolean; // run timer flag
  isProjectMenu: boolean; // project menu flag
  isAddNote: boolean; // add note flag
  isSelectedTask: boolean; // select task flag
  isShowTimer: boolean; // show timer flag
  isEngagement: boolean; // engagement flag
  projectCode: string; // project code
  projectTimer: string; // project time
  engagementDuring: string; // engagement during
  engagementPer: number; // engagement percentage
  engagementTickPer: number; // engagement tick percenage
  projectsMenu: Object; // project list menu

  sub: Subscription; // router navigation subscription
  trackingSub: Subscription; // tracking subscription
  projectsSub: Subscription; // projects subscription
  selectProjectSub: Subscription; // select project subscription
  acitivitySub: Subscription; // acitivity subscription
  settingSub: Subscription; // setting subscription
  selectTaskSub: Subscription; // select task subscription
  engagementSub: Subscription; // engagement subscription

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private _dataService: DataService,
    private _electronService: ElectronService
  ) {
    this.isRunTimer = false;
    this.isProjectMenu = false;
    this.isAddNote = false;
    this.isShowTimer = false;
    this.isSelectedTask = false;
    this.isEngagement = false;
    this.projectsMenu = {};
    this.projectCode = '';
    this.projectTimer = '';
    this.engagementPer = 0;
    this.engagementTickPer = 0;
    this.engagementDuring = '';
  }

  ngOnInit() {
    /** router navigation subscribe */
    this.sub = this.router.events.subscribe((s) => {
      if (s instanceof NavigationEnd) {
        this.initData();
      }
    });

    /**
     * tracking subscription listener
     */
    this.trackingSub = this._dataService.getTrackingSubscribe().subscribe(res => {
      console.log('--tracking:', res);
      this.isRunTimer = res['isTracking'];
    });

    /**
     * projects subscription listener
     */
    this.projectsSub = this._dataService.getProjectsSubscribe().subscribe(res => {
      this.isProjectMenu = false;
      this.projectsMenu = {};
      if (res['projects'].length > 0) {
        for (let index = 0; index < res['projects'].length; index ++) {
          this.projectsMenu[res['projects'][index]['id']] = {
            name: res['projects'][index]['name'],
            tasks: []
          };
        }

        this._dataService.getAllTasks().then((tasks) => {
          if (tasks.length > 0) {
            for (let taskIndex = 0; taskIndex < tasks.length; taskIndex ++) {
              const projectId = parseInt(tasks[taskIndex]['project_id'], 10);
              if (this.projectsMenu[projectId]) {
                this.projectsMenu[projectId]['tasks'].push(tasks[taskIndex]['description']);
              }
            }
          }

          this.isProjectMenu = true;
        });
      } else {
        this.isProjectMenu = true;
      }
    });

    /**
     * select project subscription listener
     */
    this.selectProjectSub = this._dataService.getSelectProjectSubject().subscribe(res => {
      this.projectCode = res['project']['code'] ? res['project']['code'] : '';
      const timeInMiniSecs = parseInt(res['time'], 10);
      this.projectTimer = this.convertSeconds(Math.floor(timeInMiniSecs / 1000));
    });

    /**
     * activity subscription listener
     */
    this.acitivitySub = this._dataService.getActivitySubject().subscribe(res => {
      if (res && res['activityId']) {
        this.isAddNote = true;
      } else {
        this.isAddNote = false;
      }
    });

    /**
     * seting subscription listener
     */
    this.settingSub = this._dataService.getSettingSubject().subscribe((setting: Object) => {
      if (setting && setting.constructor === Object && Object.keys(setting).length > 0) {
        this.isShowTimer = setting['show_timer'] ? true : false;
      } else {
        this.isShowTimer = false;
      }
    });

    /**
     * select task subscription listener
     */
    this.selectTaskSub = this._dataService.getSelectTaskSubject().subscribe(res => {
      if (res['selectedTaskId'] >= 0 && res['selectedProjectId'] >= 0) {
        this.isSelectedTask = true;
      } else {
        this.isSelectedTask = false;
      }
    });

    /**
     * engagement subscription listener
     */
    this.engagementSub = this._dataService.getEngagementSubject().subscribe(res => {
      const startHour = this.formatDayHour(res['currentEngagementHour'] - 1);
      const endHour = this.formatDayHour(res['currentEngagementHour']);
      this.engagementDuring = `(${startHour} - ${endHour})`;
      this.engagementPer = res['currentEngagementPer'];
      const lastEngagementPer = res['lastEngagementPer'];
      this.engagementTickPer = this.engagementPer - lastEngagementPer;
      this.isEngagement = true;
      this._dataService.setLastEngagementPer(this.engagementPer);
    });
  }

  ngOnDestroy() {
    // destroy subscriptions
    if (this.sub) {
      this.sub.unsubscribe();
    }

    if (this.trackingSub) {
      this.trackingSub.unsubscribe();
    }

    if (this.projectsSub) {
      this.projectsSub.unsubscribe();
    }

    if (this.selectProjectSub) {
      this.selectProjectSub.unsubscribe();
    }

    if (this.acitivitySub) {
      this.acitivitySub.unsubscribe();
    }

    if (this.settingSub) {
      this.settingSub.unsubscribe();
    }

    if (this.selectTaskSub) {
      this.selectTaskSub.unsubscribe();
    }

    if (this.engagementSub) {
      this.engagementSub.unsubscribe();
    }
  }

  /**
   * format day hour
   * @param hour: hour
   */
  formatDayHour(hour: number) {
    if (hour < 0) {
      return '11:00PM';
    }

    if (hour > 12) {
      return `${hour - 12}:00PM`;
    }

    return `${hour}:00AM`;
  }

  /**
   * convert seconds to hh:mm
   * @param secs: seconds
   */
  convertSeconds(secs: number) {
    const hours =  Math.floor(Math.floor(secs / 3600));
    const minutes = Math.floor(Math.floor((secs - (hours * 3600)) / 60));
    // const seconds = Math.floor((secs - ((secs * 3600) + (minutes * 60))) % 60);

    const dHours = (hours > 9 ? hours : '0' + hours);
    const dMins = (minutes > 9 ? minutes : '0' + minutes);
    return dHours + ':' + dMins;
  }

  /**
   * init data
   */
  initData() {
    if (localStorage.getItem('userInformation')) {
      this.isLogin = true;
    } else {
      this.isLogin = false;
    }
  }

  /**
   * logout the user
   */
  logout() {
    localStorage.removeItem('userInformation');
    if (this._dataService.isTracking) {
      this._dataService.stopTrack();
    }
    this.router.navigate(['/login']);
  }

  /**
   * quit app
   */
  quit() {
    if (this._electronService.isElectron) {
      this._electronService.ipcRenderer.send('quit-app');
    }
  }

  /**
   * Add a note
   */
  addNote() {
    const config = {
      width: '400px',
      disableClose: true
    };
    const dialogRef = this.dialog.open(NoteComponent, config);

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }

  /**
   * open settings modal
   * @param event: event
   */
  openSettings(event: any) {
    event.preventDefault();
    const config = {
      width: '400px',
      disableClose: true
    };
    const dialogRef = this.dialog.open(SettingModalComponent, config);

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }

  /**
   * timer handler
   */
  timerHandler() {
    if (!this.isRunTimer) { // run a timer
      if (this._electronService.isElectron) {
        this._electronService.ipcRenderer.send('start-track', {
          projectId: this._dataService.selectedProjectId,
          taskId: this._dataService.selectedTaskId
        });
      }
    } else {
      if (this._electronService.isElectron) {
        if (this._electronService.isElectron) {
          this._electronService.ipcRenderer.send('stop-track', {
            taskId: this._dataService.selectedTaskId,
            projectId: this._dataService.selectedProjectId
          });
        }
      }
    }
  }

  /**
   * go to dashboard
   * @param event: event
   */
  goToAppDashboard(event: any) {
    event.preventDefault();
    if (this._electronService.isElectron) {
      this._electronService.shell.openExternal('https://tracklyapp.appup.cloud/trackly/#/430/1587/dashboard');
    }
  }

}
