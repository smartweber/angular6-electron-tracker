import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss']
})
export class SettingComponent implements OnInit {
  isShowTimer: boolean;
  isNotify: boolean;
  trackInterval: number;
  timeSchedules: Object[];

  constructor(private router: Router) {
    this.isShowTimer = false;
    this.isNotify = true;
    this.timeSchedules = [
      {
        label: 'Sunday',
        value: 0
      },
      {
        label: 'Monday',
        value: 1
      }
    ];
    this.trackInterval = 10;
  }

  ngOnInit() {
  }

  /**
   * cancel to update
   */
  cancel() {
    this.router.navigate(['/dashboard']);
  }

}
