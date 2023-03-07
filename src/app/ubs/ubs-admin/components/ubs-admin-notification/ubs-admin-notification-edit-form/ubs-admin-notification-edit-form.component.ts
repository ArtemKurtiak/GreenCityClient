import { Component, Inject, ViewChild, ElementRef, Input, HostListener, OnInit, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MentionModule } from 'angular-mentions';

@Component({
  selector: 'app-ubs-admin-notification-edit-form',
  templateUrl: './ubs-admin-notification-edit-form.component.html',
  styleUrls: ['./ubs-admin-notification-edit-form.component.scss']
})
export class UbsAdminNotificationEditFormComponent implements AfterViewChecked {
  form: FormGroup;
  platform = '';

  items = ['name', 'email', 'id'];

  config = {
    items: this.items,
    triggerChar: '$',
    mentionSelect: (e: any) => {
      return '$' + `{${e.label}}`;
    }
  };

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: { platform: string; text: { en: string; ua: string } },
    public dialogRef: MatDialogRef<UbsAdminNotificationEditFormComponent>
  ) {
    this.platform = data.platform;
    this.form = this.fb.group({
      textEn: [data.text.en],
      textUa: [data.text.ua]
    });
  }

  @ViewChild('textUa', { static: false }) textUa: ElementRef<HTMLInputElement>;
  @ViewChild('textEn', { static: false }) textEn: ElementRef<HTMLInputElement>;

  @ViewChild('selectEn', { static: false }) selectEn: ElementRef<HTMLSelectElement>;
  @ViewChild('selectUa', { static: false }) selectUa: ElementRef<HTMLSelectElement>;

  ngAfterViewChecked(): void {
    this.selectEn.nativeElement.selectedIndex = 0;
    this.selectUa.nativeElement.selectedIndex = 0;
  }

  addMention(selectElement: HTMLSelectElement, ref: string) {
    const textToAdd = selectElement.value;
    const el = this[ref].nativeElement;

    const selectionStart = el.selectionStart;
    const selectionEnd = el.selectionEnd;

    const hasSelection = selectionStart !== selectionEnd;
    const isFocused = !hasSelection;

    if (hasSelection) {
      el.value = el.value.substring(0, selectionStart) + textToAdd + el.value.substring(selectionEnd, el.value.length);
      el.selectionStart = el.selectionEnd = selectionStart + textToAdd.length;
    } else if (isFocused) {
      el.value = el.value.substring(0, selectionStart) + textToAdd + el.value.substring(selectionStart, el.value.length);
    } else {
      el.value += textToAdd;
    }

    const newSelectionStart = selectionStart + textToAdd.length;
    const newSelectionEnd = selectionEnd + textToAdd.length;
    el.setSelectionRange(newSelectionStart, newSelectionEnd);

    el.focus();

    this.form.patchValue({ [ref]: el.value });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    const { textEn, textUa } = this.form.value;
    this.dialogRef.close({
      text: {
        en: textEn,
        ua: textUa
      }
    });
  }

  textDecorator(text: string) {
    return '$' + `{${text}}`;
  }
}
