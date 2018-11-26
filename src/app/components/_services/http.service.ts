import { Injectable } from '@angular/core';
import * as axios from 'axios';
import { AppConfig } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable()
export class HttpService {

  constructor(
    private router: Router
  ) { }

  /**
   * post http call
   * @param url: url
   * @param data: post data
   */
  postCall(url: string, data: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      axios.default.post(
        `${AppConfig.apiUrl}/${url}`,
        data
      ).then((res) => {
        if (res.status === 200) {
          return resolve(res);
        } else {
          reject();
        }
      }).catch((err) => {
        console.log(err);
        let errorReject = false;
        if (err.response.status === 401) {
          this.handleUnAuthetication();
          errorReject = false;
        } else {
          errorReject = true;
        }

        reject(errorReject);
      });
    });
  }

  /**
   * get http call
   * @param url: url
   */
  getCall(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      axios.default.get(
        `${AppConfig.apiUrl}/${url}`
      ).then((res) => {
        if (res.status === 200) {
          return resolve(res);
        } else {
          reject();
        }
      }).catch((err) => {
        console.log(err);
        let errorReject = false;
        if (err.response.status === 401) {
          this.handleUnAuthetication();
          errorReject = false;
        } else {
          errorReject = true;
        }

        reject(errorReject);
      });
    });
  }

  /**
   * upload file
   * @param url: url
   * @param blob: blob file data
   * @param mime: mime type of the file
   */
  uploadFile(url: string, blob: any, mime: string): Promise<any> {
    return new Promise((resolve, reject) => {
      axios.default.put(
        url,
        blob,
        {
          headers: {
            'Content-Type': mime
          }
        }
      )
        .then((res) => {
          if (res.status === 200) {
            return resolve(res);
          } else {
            reject();
          }
        }).catch((err) => {
          console.log(err);
          let errorReject = false;
          if (err.response.status === 401) {
            this.handleUnAuthetication();
            errorReject = false;
          } else {
            errorReject = true;
          }

          reject(errorReject);
        });
    });
  }

  /**
   * handle un-authentication
   * @param statusCode: status code
   */
  handleUnAuthetication() {
    localStorage.removeItem('userInformation');
    this.router.navigate(['/login']);
  }
}
