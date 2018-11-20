import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService } from '../_services/data.service';
import { ElectronService } from '../../providers/electron.service';
import { MatDialog } from '@angular/material';
import { NoteComponent } from '../modals/note/note.component';


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
  projectCode: string; // project code
  projectsMenu: Object; // project list menu
  sub: Subscription; // router navigation subscription
  trackingSub: Subscription; // tracking subscription
  projectsSub: Subscription; // projects subscription
  selectProjectSub: Subscription; // select project subscription
  acitivitySub: Subscription; // acitivity subscription

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private _dataService: DataService,
    private _electronService: ElectronService
  ) {
    this.isRunTimer = false;
    this.isProjectMenu = false;
    this.isAddNote = false;
    this.projectsMenu = {};
    this.projectCode = '';
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

}
