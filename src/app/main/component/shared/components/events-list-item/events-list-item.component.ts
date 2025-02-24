import {
  AddAttenderEcoEventsByIdAction,
  DeleteEcoEventAction,
  RemoveAttenderEcoEventsByIdAction
} from 'src/app/store/actions/ecoEvents.actions';
import { IAppState } from 'src/app/store/state/app.state';
import { IEcoEventsState } from 'src/app/store/state/ecoEvents.state';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';
import { Component, Input, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { TagsArray } from '../../../events/models/event-consts';
import { EventPageResponceDto, TagDto, TagObj, EventDTO } from '../../../events/models/events.interface';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { EventsListItemModalComponent } from './events-list-item-modal/events-list-item-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogPopUpComponent } from 'src/app/shared/dialog-pop-up/dialog-pop-up.component';
import { TranslateService } from '@ngx-translate/core';
import { ReplaySubject, Subscription } from 'rxjs';
import { UserOwnAuthService } from '@auth-service/user-own-auth.service';
import { DatePipe } from '@angular/common';
import { EventsService } from '../../../events/services/events.service';
import { LanguageService } from 'src/app/main/i18n/language.service';
import { AuthModalComponent } from '@global-auth/auth-modal/auth-modal.component';
import { MatSnackBarComponent } from '@global-errors/mat-snack-bar/mat-snack-bar.component';
import { userAssignedCardsIcons } from 'src/app/main/image-pathes/profile-icons';
import { FriendModel } from '@global-user/models/friend.model';

@Component({
  selector: 'app-events-list-item',
  templateUrl: './events-list-item.component.html',
  styleUrls: ['./events-list-item.component.scss', './events-list-item-user.component.scss']
})
export class EventsListItemComponent implements OnChanges, OnInit, OnDestroy {
  @Input() event: EventPageResponceDto;
  @Input() userId: number;
  @Input() isUserAssignList: boolean;
  @Input() userFriends: FriendModel[];

  profileIcons = userAssignedCardsIcons;

  ecoEvents$ = this.store.select((state: IAppState): IEcoEventsState => state.ecoEventsState);
  private destroyed$: ReplaySubject<any> = new ReplaySubject<any>(1);
  public itemTags: Array<TagObj>;
  public activeTags: Array<TagObj>;

  public rate: number;
  public author: string;

  public isRated: boolean;

  public isRegistered: boolean;
  public isReadonly = false;
  public isPosting: boolean;
  public isEventFavorite = false;
  public btnStyle: string;
  public nameBtn: string;

  public max = 3;

  public bsModalRef: BsModalRef;

  public langChangeSub: Subscription;
  public currentLang: string;
  public datePipe;
  public newDate;
  bookmarkSelected = false;
  public address;
  public addAttenderError: string;
  public isOnline: string;
  isOwner: boolean;
  isActive: boolean;

  attendees = [];
  attendeesAvatars = [];
  deleteDialogData = {
    popupTitle: 'homepage.events.delete-title-admin',
    popupConfirm: 'homepage.events.delete-yes',
    popupCancel: 'homepage.events.delete-no',
    style: 'green'
  };
  public canUserJoinCloseEvent: boolean;

  @Output() public isLoggedIn: boolean;

  public styleBtn = {
    secondary: 'secondary-global-button',
    primary: 'primary-global-button',
    hiden: 'event-button-hiden'
  };

  public btnName = {
    edit: 'event.btn-edit',
    delete: 'event.btn-delete',
    rate: 'event.btn-rate',
    cancel: 'event.btn-cancel',
    join: 'event.btn-join'
  };

  constructor(
    public router: Router,
    private localStorageService: LocalStorageService,
    private langService: LanguageService,
    private userOwnAuthService: UserOwnAuthService,
    private modalService: BsModalService,
    private dialog: MatDialog,
    private store: Store,
    private eventService: EventsService,
    private translate: TranslateService,
    private snackBar: MatSnackBarComponent
  ) {}

  ngOnChanges() {
    this.canUserJoinCloseEvent = this.userFriends?.some((el) => el.id === this.event.organizer.id) || this.event.open;
  }

  ngOnInit(): void {
    this.itemTags = TagsArray.reduce((ac, cur) => [...ac, { ...cur }], []);
    this.filterTags(this.event.tags);
    this.rate = Math.round(this.event.organizer.organizerRating);
    this.userOwnAuthService.getDataFromLocalStorage();
    this.subscribeToLangChange();
    this.getAllAttendees();
    this.bindLang(this.localStorageService.getCurrentLanguage());
    this.initAllStatusesOfEvent();
    this.checkButtonStatus();
    this.address = this.event.dates[this.event.dates.length - 1].coordinates;
    this.isOnline = this.event.dates[this.event.dates.length - 1].onlineLink;
    this.ecoEvents$.subscribe((res: IEcoEventsState) => {
      this.addAttenderError = res.error;
    });
    this.getAddress();
  }

  public routeToEvent(): void {
    this.router.navigate(['/events', this.event.id, { isOwner: this.isOwner, isActive: this.isActive }]);
  }

  public filterTags(tags: Array<TagDto>) {
    this.itemTags.forEach((item) => (item.isActive = tags.some((name) => name.nameEn === item.nameEn)));
    this.activeTags = this.itemTags.filter((val) => val.isActive);
  }
  public initAllStatusesOfEvent(): void {
    this.isRegistered = !!this.userId;
    this.isRated = !!this.rate;
  }

  public checkIsActive(): boolean {
    const curentDate = new Date();
    const eventDates = this.event.dates.find((date) => curentDate <= new Date(date.finishDate));
    return !!eventDates;
  }

  public checkButtonStatus(): void {
    const isSubscribe = this.event.isSubscribed;
    this.isOwner = +this.userId === this.event.organizer.id;
    this.isActive = this.checkIsActive();
    if (this.isOwner && this.isActive && !isSubscribe) {
      this.btnStyle = this.styleBtn.secondary;
      this.nameBtn = this.btnName.edit;
      return;
    }
    if (this.isOwner && !this.isActive && !isSubscribe) {
      this.btnStyle = this.styleBtn.secondary;
      this.nameBtn = this.btnName.delete;
      return;
    }
    if (isSubscribe && this.isActive && !this.isOwner) {
      this.btnStyle = this.styleBtn.secondary;
      this.nameBtn = this.btnName.cancel;
      return;
    }
    if (!isSubscribe && this.isActive && !this.isOwner) {
      this.btnStyle = this.canUserJoinCloseEvent ? this.styleBtn.primary : this.styleBtn.hiden;
      this.nameBtn = this.btnName.join;
      return;
    }
    if (isSubscribe && !this.isActive && !this.isOwner) {
      this.btnStyle = this.styleBtn.primary;
      this.nameBtn = this.btnName.rate;
      return;
    }
    if (!isSubscribe && !this.isActive && !this.isOwner) {
      this.btnStyle = this.styleBtn.hiden;
      return;
    }
    if (!!this.userId) {
      this.btnStyle = this.styleBtn.primary;
      this.nameBtn = this.btnName.join;
    }
  }

  public buttonAction(buttonName: string): void {
    switch (buttonName) {
      case this.btnName.cancel:
        this.store.dispatch(RemoveAttenderEcoEventsByIdAction({ id: this.event.id }));
        break;
      case this.btnName.join:
        if (this.addAttenderError) {
          this.snackBar.openSnackBar('errorJoinEvent');
          this.addAttenderError = '';
        } else {
          this.snackBar.openSnackBar('joinedEvent');
          !!this.userId ? this.store.dispatch(AddAttenderEcoEventsByIdAction({ id: this.event.id })) : this.openAuthModalWindow('sign-in');
        }
        break;
      case this.btnName.rate:
        this.openModal();
        break;
      case this.btnName.delete:
        this.deleteEvent();
        break;
      case this.btnName.edit:
        this.localStorageService.setEditMode('canUserEdit', true);
        this.localStorageService.setEventForEdit('editEvent', this.event);
        this.router.navigate(['/events', 'create-event']);
        break;
      default:
        break;
    }
  }

  public openModal(): void {
    const initialState = {
      id: this.event.id,
      isRegistered: this.isRegistered,
      max: this.max,
      isReadonly: this.isReadonly
    };

    this.bsModalRef = this.modalService.show(EventsListItemModalComponent, { class: 'modal-dialog-centered', initialState });
    this.bsModalRef.content.closeBtnName = 'event.btn-close';
  }

  public deleteEvent(): void {
    const matDialogRef = this.dialog.open(DialogPopUpComponent, {
      data: this.deleteDialogData,
      hasBackdrop: true,
      closeOnNavigation: true,
      disableClose: true,
      panelClass: '',
      width: '300px'
    });

    matDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((res) => {
        if (res) {
          this.store.dispatch(DeleteEcoEventAction({ id: this.event.id }));
          this.isPosting = true;
        }
      });
  }

  public bindLang(lang: string): void {
    this.translate.setDefaultLang(lang);
    this.currentLang = this.localStorageService.getCurrentLanguage();
  }

  public subscribeToLangChange(): void {
    this.langChangeSub = this.localStorageService.languageSubject.subscribe(this.bindLang.bind(this));
    this.localStorageService.languageBehaviourSubject.subscribe((lang: string) => {
      this.currentLang = lang;
      this.datePipe = new DatePipe(this.currentLang);
      this.newDate = this.datePipe.transform(this.event.creationDate, 'MMM dd, yyyy');
    });
  }

  getAllAttendees(): void {
    this.eventService.getAllAttendees(this.event.id).subscribe((attendees) => {
      this.attendees = attendees;
      this.attendeesAvatars = attendees.filter((attendee) => attendee.imagePath).map((attendee) => attendee.imagePath);
    });
  }

  public getAddress(): string {
    if (this.address) {
      return this.eventService.getFormattedAddressEventsList(this.address);
    }
  }

  public getLangValue(uaValue: string, enValue: string): string {
    return this.langService.getLangValue(uaValue, enValue) as string;
  }

  public addToFavourite(event?: Event) {
    event.stopPropagation();
    if (!this.isRegistered) {
      this.openAuthModalWindow('sign-in');
    } else {
      this.bookmarkSelected = !this.bookmarkSelected;
      const sendEventDto = {
        isFavorite: this.bookmarkSelected
      };
      const formData: FormData = new FormData();
      const stringifiedDataToSend = JSON.stringify(sendEventDto);
      const dtoName = 'EventPageResponceDto';

      formData.append(dtoName, stringifiedDataToSend);

      this.eventService.editEvent(formData).subscribe((res) => {});
      this.eventService.addEventToFavourites(this.event.id).subscribe((res) => {});
    }
  }

  public openAuthModalWindow(page: string): void {
    this.dialog
      .open(AuthModalComponent, {
        hasBackdrop: true,
        closeOnNavigation: true,
        panelClass: ['custom-dialog-container'],
        data: {
          popUpName: page
        }
      })
      .afterClosed()
      .subscribe((result) => {
        this.isRegistered = !!result;
        if (this.isRegistered) {
          this.addToFavourite();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.destroyed$.unsubscribe();
    this.langChangeSub.unsubscribe();
  }
}
