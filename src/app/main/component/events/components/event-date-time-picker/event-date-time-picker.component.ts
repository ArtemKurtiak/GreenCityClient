import { MapsAPILoader } from '@agm/core';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { DateEventResponceDto, DateFormObj, OfflineDto } from '../../models/events.interface';

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Patterns } from 'src/assets/patterns/patterns';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/main/i18n/language.service';
import { EventsService } from 'src/app/main/component/events/services/events.service';
import { takeUntil } from 'rxjs/operators';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';
import { Subject } from 'rxjs';
import { DateAdapter } from '@angular/material/core';
import { LanguageModel } from '../../../layout/components/models/languageModel';
import { Language, Locate } from 'src/app/main/i18n/Language';

@Component({
  selector: 'app-event-date-time-picker',
  templateUrl: './event-date-time-picker.component.html',
  styleUrls: ['./event-date-time-picker.component.scss']
})
export class EventDateTimePickerComponent implements OnInit, OnChanges {
  public minDate = new Date();
  public timeArrStart = [];
  public timeArrEnd = [];

  public timeArr: Array<string> = [];

  coordinates: OfflineDto = {
    latitude: 50.43353,
    longitude: 30.53789
  };
  public zoom = 8;
  address: string;

  public isOfline: boolean;
  public autocomplete: google.maps.places.Autocomplete;
  private pipe = new DatePipe('en-US');
  public checkTime = false;
  public checkOfflinePlace = false;
  public checkOnlinePlace = false;
  private regionOptions = {
    types: ['address'],
    componentRestrictions: { country: 'UA' }
  };

  @Input() check: boolean;
  @Input() editDate: DateEventResponceDto;
  @Input() isDateDuplicate: boolean;
  @Input() editDates: boolean;

  @Output() status = new EventEmitter<boolean>();
  @Output() datesForm = new EventEmitter<DateFormObj>();
  @Output() coordOffline = new EventEmitter<OfflineDto>();

  @ViewChild('placesRef') placesRef: ElementRef;

  public dateForm: FormGroup;
  public currentLang: string;
  private destroy: Subject<boolean> = new Subject<boolean>();
  isLocationSelected = false;

  constructor(
    private mapsAPILoader: MapsAPILoader,
    private langService: LanguageService,
    private translate: TranslateService,
    private localStorageService: LocalStorageService,
    private eventsService: EventsService,
    private adapter: DateAdapter<LanguageModel>
  ) {}

  ngOnInit(): void {
    const curDay = new Date().getDate();
    this.minDate.setDate(curDay);
    this.fillTimeArray();

    this.dateForm = new FormGroup({
      date: new FormControl('', [Validators.required]),
      startTime: new FormControl('', [Validators.required]),
      endTime: new FormControl('', [Validators.required])
    });

    this.dateForm.valueChanges.subscribe((value) => {
      this.updateTimeArrays(value.endTime, value.startTime);

      this.coordOffline.emit(this.coordinates);
      this.status.emit(this.dateForm.valid);

      this.datesForm.emit(value);
    });
    if (this.editDate && !this.editDates) {
      this.setEditData();
    }
    this.localStorageService.languageBehaviourSubject.pipe(takeUntil(this.destroy)).subscribe((lang: string) => {
      this.currentLang = lang;
      this.bindLang(this.currentLang);
      const locale = lang !== Language.UA ? Locate.EN : Locate.UA;
      this.adapter.setLocale(locale);
      if (this.editDate) {
        this.dateForm.patchValue({
          place:
            lang === Language.UA
              ? this.eventsService.createAdresses(this.editDate.coordinates, 'Ua')
              : this.eventsService.createAdresses(this.editDate.coordinates, 'En')
        });
      }
    });
    if (this.isDateDuplicate) {
      this.dateForm.get('date').markAsTouched();
    }
  }

  private bindLang(lang: string): void {
    this.translate.setDefaultLang(lang);
  }

  get isEditAdressDefault(): boolean {
    return (
      this.editDate.coordinates.latitude === this.coordinates.latitude && this.editDate.coordinates.longitude === this.coordinates.longitude
    );
  }

  private setEditData(): void {
    const startEditTime = this.pipe.transform(this.editDate.startDate, 'H:mm');
    const endEditTime = this.pipe.transform(this.editDate.finishDate, 'H:mm');
    if (endEditTime === '23:59') {
      this.checkTime = true;
      this.dateForm.get('startTime').disable();
      this.dateForm.get('endTime').disable();
    }
    this.dateForm.patchValue({
      date: new Date(this.editDate.startDate),
      startTime: startEditTime,
      endTime: endEditTime
    });

    if (this.editDate.coordinates.latitude) {
      if (!this.isEditAdressDefault) {
        this.checkOfflinePlace = true;
        this.dateForm.addControl('place', new FormControl('', [Validators.required]));
        setTimeout(() => this.setPlaceAutocomplete(), 0);
        this.coordinates.latitude = this.editDate.coordinates.latitude;
        this.coordinates.longitude = this.editDate.coordinates.longitude;
        this.zoom = 8;
        this.coordOffline.emit(this.coordinates);

        this.dateForm.patchValue({
          place: this.getLangValue(
            this.eventsService.createAdresses(this.editDate.coordinates, 'Ua'),
            this.eventsService.createAdresses(this.editDate.coordinates, 'En')
          )
        });

        this.coordinates.latitude = this.editDate.coordinates.latitude;
        this.coordinates.longitude = this.editDate.coordinates.longitude;
      }
    }

    if (this.editDate.onlineLink) {
      this.checkOnlinePlace = true;
      this.dateForm.addControl('onlineLink', new FormControl('', [Validators.required, Validators.pattern(Patterns.linkPattern)]));
      this.dateForm.patchValue({
        onlineLink: this.editDate.onlineLink
      });
    }
  }

  public checkIfAllDay(): void {
    this.checkTime = !this.checkTime;
    if (this.checkTime) {
      this.dateForm.get('startTime').disable();
      this.dateForm.get('endTime').disable();
      if (this.checkDay()) {
        this.dateForm.get('startTime').setValue(this.timeArrStart[0]);
        this.dateForm.get('endTime').setValue(this.timeArrEnd[this.timeArrEnd.length - 1]);
      } else {
        this.dateForm.get('startTime').setValue(this.timeArrStart[9]);
        this.dateForm.get('endTime').setValue(this.timeArr[21]);
      }
    } else {
      this.dateForm.get('startTime').enable();
      this.dateForm.get('endTime').enable();
    }
  }

  ngOnChanges(): void {
    if (this.check) {
      this.dateForm.markAllAsTouched();
    }
  }

  private setCurrentLocation(): void {
    if (this.editDate) {
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      if (position.coords) {
        this.coordinates.latitude = position.coords.latitude;
        this.coordinates.longitude = position.coords.longitude;
        this.zoom = 8;
        this.getAddress(position.coords.latitude, position.coords.longitude);
      }
    });
  }

  public checkIfOnline(): void {
    this.checkOnlinePlace = !this.checkOnlinePlace;
    this.checkOnlinePlace
      ? this.dateForm.addControl('onlineLink', new FormControl('', [Validators.required, Validators.pattern(Patterns.linkPattern)]))
      : this.dateForm.removeControl('onlineLink');
  }

  public checkIfOffline(): void {
    this.checkOfflinePlace = !this.checkOfflinePlace;
    if (this.checkOfflinePlace) {
      this.isOfline = true;
      this.dateForm.addControl('place', new FormControl('', [Validators.required]));
      setTimeout(() => this.setPlaceAutocomplete(), 0);
    } else {
      this.isOfline = false;
      this.coordinates.latitude = null;
      this.coordinates.longitude = null;
      this.coordOffline.emit(this.coordinates);
      this.autocomplete.unbindAll();
      this.dateForm.removeControl('place');
    }
  }

  private setPlaceAutocomplete(): void {
    this.mapsAPILoader.load().then(() => {
      this.setCurrentLocation();
      this.autocomplete = new google.maps.places.Autocomplete(this.placesRef.nativeElement, this.regionOptions);

      this.autocomplete.addListener('place_changed', () => {
        const locationName = this.autocomplete.getPlace();
        if (locationName.formatted_address) {
          this.coordinates.latitude = locationName.geometry.location.lat();
          this.coordinates.longitude = locationName.geometry.location.lng();
          this.coordOffline.emit(this.coordinates);
          this.dateForm.patchValue({
            place: locationName.formatted_address
          });

          this.isLocationSelected = false;
        } else {
          this.isLocationSelected = true;
        }
      });
    });
  }

  onChangePickerOnMap(event): void {
    this.coordinates.latitude = event.coords.lat;
    this.coordinates.longitude = event.coords.lng;
    this.isLocationSelected = false;
    this.getAddress(this.coordinates.latitude, this.coordinates.longitude);
  }

  getAddress(latitude, longitude) {
    const geoCoder = new google.maps.Geocoder();
    geoCoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        this.address = results[0].formatted_address;
        this.dateForm.get('place').setValue(this.address);
      } else {
        this.isLocationSelected = true;
      }
    });
  }

  private fillTimeArray(): void {
    for (let i = 0; i < 24; i++) {
      this.timeArr.push(`${i}:00`);
      this.timeArrStart.push(`${i}:00`);
      this.timeArrEnd.push(`${i}:00`);
    }
  }

  private checkEndTime(time: string, curTime?: number): void {
    if (!time) {
      return;
    }
    const checkTime = time.split(':');
    if (curTime) {
      this.timeArrStart = [...this.timeArr.slice(curTime + 1, +checkTime[0])];
    } else {
      this.timeArrStart = [...this.timeArr.slice(0, +checkTime[0])];
    }
  }

  private checkStartTime(time: string): void {
    if (time) {
      const checkTime = time.split(':');
      this.timeArrEnd = +checkTime[0] === 23 ? ['23 : 59'] : [...this.timeArr.slice(+checkTime[0] + 1)];
    }
  }

  private checkDay() {
    const curDay = new Date().toDateString();
    const selectDay = new Date(this.dateForm.get('date').value).toDateString();
    return curDay === selectDay;
  }

  private updateTimeArrays(endTime: string, startTime: string) {
    if (this.checkDay()) {
      const curTime = new Date().getHours();
      this.timeArrStart = [...this.timeArr.slice(curTime + 1)];
      this.timeArrEnd = [...this.timeArr.slice(curTime + 2)];
      this.checkStartTime(startTime);
      this.checkEndTime(endTime, curTime);
    } else {
      this.checkStartTime(startTime);
      this.checkEndTime(endTime);
    }
  }

  public getLangValue(uaValue, enValue): string {
    return this.langService.getLangValue(uaValue, enValue) as string;
  }
}
