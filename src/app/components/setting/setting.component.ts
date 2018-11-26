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
  isNotifyScreenshot: boolean;
  isNotifyTrack: boolean;
  trackInterval: number;
  startTime: string;
  endTime: string;
  errorAlert: string; // error alert
  timeSchedules: string[];
  tracks: string[];

  constructor(
    private router: Router,
    private _dataService: DataService
  ) {
    this.isShowTimer = false;
    this.isLoad = false;
    this.isNotifyScreenshot = true;
    this.isNotifyTrack = true;
    this.errorAlert = '';
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
      this.isNotifyScreenshot = res['notify_me_screenshot'] ? res['notify_me_screenshot'] : false;
      this.isNotifyTrack = res['notify_me_track_on'] ? res['notify_me_track_on'] : false;
      this.trackInterval = res['untracked_for_in_min'] ? res['untracked_for_in_min'] : 0;
      this.startTime = res['start_time'] ? this.formatToHoursMinutes(res['start_time']) : null;
      this.endTime = res['end_time'] ? this.formatToHoursMinutes(res['end_time']) : null;
      this.tracks = [];
      if (res['track_on']) {
        const trackOn = res['track_on'].trim();
        this.tracks = trackOn.split(',');
        if (this.tracks.length > 0) {
          for (let index = 0; index < this.tracks.length; index ++) {
            this.tracks[index] = this.capitalizeFirstLetter(this.tracks[index]);
          }
        }
      }
      this.isLoad = true;
    }).catch(() => {
      this.isLoad = true;
    });
  }

  /**
   * format to hh:mm
   * @param time: hh:mm:ss
   */
  formatToHoursMinutes(time: string) {
    const arr = time.split(':');
    if (arr.length >= 2) {
      return arr[0] + ':' + arr[1];
    }

    return null;
  }

  /**
   * make first letter uppercase
   * @param str: string
   */
  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    if (this.tracks.length === 0) {
      this.errorAlert = 'Track day is required.';
      return;
    }
    if (!this.startTime) {
      this.errorAlert = 'Start time is required.';
      return;
    }

    if (!this.endTime) {
      this.errorAlert = 'End time is required.';
      return;
    }

    if (this.startTime >= this.endTime) {
      this.errorAlert = 'The start time should be smaller than the end one.';
      return;
    }

    const settingData = {
      show_timer: this.isShowTimer ? 1 : 0,
      notify_me_screenshot: this.isNotifyScreenshot ? 1 : 0,
      notify_me_track_on: this.isNotifyTrack ? 1 : 0,
      track_on: this.tracks.join(','),
      start_time: this.startTime + ':00',
      end_time: this.endTime + ':00',
      untracked_for_in_min: this.trackInterval ? this.trackInterval : 0
    };

    this._dataService.updateSetting(settingData).then(() => {
      this.router.navigate(['/dashboard']);
    }).catch(() => {
      this.errorAlert = 'Fail to update the setting, please try again later.';
    });
  }

}
