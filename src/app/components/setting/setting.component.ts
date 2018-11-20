import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../_services/data.service';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss']
})
export class SettingComponent implements OnInit {
  isLoad: boolean;
  isShowTimer: boolean;
  isNotify: boolean;
  trackInterval: number;
  timeSchedules: string[];
  tracks: string[];

  constructor(
    private router: Router,
    private _dataService: DataService
  ) {
    this.isShowTimer = false;
    this.isLoad = false;
    this.isNotify = true;
    this.timeSchedules = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    this.trackInterval = 10;
    this.tracks = [];
  }

  ngOnInit() {
    this._dataService.getSetting().then((res) => {
      this.isShowTimer = res['show_timer'] ? res['show_timer'] : false;
      this.isNotify = res['notify_me'] ? res['notify_me'] : false;
      this.trackInterval = res['untracked_for_in_min'] ? res['untracked_for_in_min'] : 0;
      this.tracks = [];
      if (res['track_on']) {
        const trackOn = res['track_on'].trim();
        this.tracks = trackOn.split(',');
      }
      this.isLoad = true;
    }).catch(() => {

    });
  }

  /**
   * cancel to update
   */
  cancel() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * update the setting
   */
  update() {
    console.log(this.tracks);
  }

}
