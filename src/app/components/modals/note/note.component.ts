import {
  Component,
  OnInit,
  Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material';
import { DataService } from '../../_services/data.service';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent implements OnInit {
  title: string;
  error: string;
  note: string;

  constructor(
    public dialgoRef: MatDialogRef<NoteComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
    private  _dateService: DataService
  ) {
    this.title = 'Add Work Notes';
    this.error = '';
  }

  ngOnInit() {
  }

  cancel() {
    this.dialgoRef.close(false);
  }

  addNote() {
    if (!this.note) {
      this.error = 'Empty note';
      return;
    }
    this._dateService.addNote(this.note).then(() => {
      this.error = '';
      this.dialgoRef.close(true);
    }).catch((err) => {
      if (err) {
        this.error = 'Fail to add a note, please try again later.';
      } else {
        this.error = 'Blank activity.';
      }
    });
  }

}
