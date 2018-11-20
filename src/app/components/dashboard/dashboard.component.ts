import { Component, OnInit } from '@angular/core';
import { DataService } from '../_services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isLoad: boolean;

  projects: Object[];

  constructor(
    private _dataService: DataService,
    private _router: Router
  ) {
    this.projects = []; // project list
    this.isLoad = false; // page load flag
  }

  ngOnInit() {
    this._dataService.setProject({});
    /**
     * get project list
     */
    this._dataService.getAllProjects().then((projects) => {
      console.log('project list: ', projects);
      this.projects = projects;
      this.isLoad = true;
    });
  }

  /**
   * go to specific project page
   * @param project: project data
   */
  goToTaskPage(project: Object) {
    if (project && project['id']) {
      this._dataService.setProject(project);
      this._router.navigate(['/task/' + project['id']]);
    }
  }

}
