import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimePickerPopupComponent } from './time-picker-popup.component';
import { TranslateModule } from '@ngx-translate/core';

describe('TimePickerPopUpComponent', () => {
  let component: TimePickerPopupComponent;
  let fixture: ComponentFixture<TimePickerPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [TimePickerPopupComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimePickerPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
