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
  isRunTimer: boolean;
  sub: Subscription; // router navigation subscription
  trackingSub: Subscription; // tracking subscription
  my_menu = {
    'main1': ['sub1', 'sub2'],
    'main2': ['sub1', 'sub2'],
  };

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private _dataService: DataService,
    private _electronService: ElectronService
  ) {
    this.isRunTimer = false;
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
  }

  ngOnDestroy() {
    // destroy subscriptions
    if (this.sub) {
      this.sub.unsubscribe();
    }

    if (this.trackingSub) {
      this.trackingSub.unsubscribe();
    }
  }

  /**
   * init data
   */
  initData() {
    if (localStorage.getItem('userToken')) {
      this.isLogin = true;
    } else {
      this.isLogin = false;
    }
  }

  /**
   * logout the user
   */
  logout() {
    localStorage.removeItem('userToken');
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
