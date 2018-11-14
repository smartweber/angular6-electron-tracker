import {
  Component,
  OnInit,
  Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent implements OnInit {
  title: string;
  note: string;

  constructor(public dialgoRef: MatDialogRef<NoteComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.title = 'Add Work Notes';
  }

  ngOnInit() {
  }

  cancel() {
    this.dialgoRef.close(false);
  }

  addNote() {
    console.log(this.note);
  }

}
