import { MatSnackBarComponent } from '@global-errors/mat-snack-bar/mat-snack-bar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AddNewHabitComponent } from './add-new-habit.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';
import { ShoppingListService } from './habit-edit-shopping-list/shopping-list.service';
import { HabitService } from '@global-service/habit/habit.service';
import { HabitAssignService } from '@global-service/habit-assign/habit-assign.service';
import { of, Subject, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

fdescribe('AddNewHabitComponent', () => {
  let component: AddNewHabitComponent;
  let fixture: ComponentFixture<AddNewHabitComponent>;
  let matSnackBarMock: MatSnackBarComponent;
  let fakeHabitAssignService: HabitAssignService;
  let fakeLocalStorageService: LocalStorageService;
  const mockActivatedRoute = {
    params: of({ habitId: 2 })
    // params: {
    //   subscribe: of({ habitId: 2 })
    // }
  };
  fakeHabitAssignService = jasmine.createSpyObj('fakeHabitAssignService', {
    // getAssignedHabits: of('mock'),
    getAssignedHabits: of([
      {
        habit: {
          id: 2
        }
      }
    ]),
    deleteHabitById: of('test'),
    getCustomHabit: of('test')
  });
  // fakeHabitAssignService = jasmine.createSpyObj('fakeHabitAssignService', [
  //   'getAssignedHabits',
  //   'deleteHabitById',
  //   'getCustomHabit',
  //   'assignCustomHabit',
  //   'updateHabit'
  // ]);
  fakeLocalStorageService = jasmine.createSpyObj('fakeLocalStorageService', {
    getCurrentLanguage: () => 'ua'
    // 'languageSubject': of('ua')
  });
  fakeLocalStorageService.languageSubject = new Subject();
  // fakeLocalStorageService.languageSubject = of({'ua'});
  matSnackBarMock = jasmine.createSpyObj('MatSnackBarComponent', ['openSnackBar']);
  matSnackBarMock.openSnackBar = (type: string) => {};

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddNewHabitComponent],
      imports: [RouterTestingModule, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatSnackBarComponent, useValue: matSnackBarMock },
        { provide: HabitService, useValue: {} },
        { provide: HabitAssignService, useValue: fakeHabitAssignService },
        { provide: ShoppingListService, useValue: {} },
        { provide: LocalStorageService, useValue: fakeLocalStorageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ],
      schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNewHabitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    // spyOn(component, 'ngOnInit').and.returnValue();
    expect(component).toBeTruthy();
  });

  it('method deleteHabbit should navigate and openSnackBar', (done) => {
    component.userId = '33';
    component.habitId = 33;
    fixture.detectChanges();
    // @ts-ignore
    spyOn(component.snackBar, 'openSnackBar');
    // // const spy = spyOn(component.snackBar, 'openSnackBar').and.returnValue();
    fakeHabitAssignService.deleteHabitById(component.habitId).subscribe(() => {
      console.log('DONE');
      // @ts-ignore
      expect(component.snackBar.openSnackBar).toHaveBeenCalledWith('habitDeleted2');
      done();
    });
    component.deleteHabit();
    // tick();

    // expect(spy).toHaveBeenCalledWith("habitDeleted222");
  });

  it('ngOnDestroy should unsubscribe from subscription', () => {
    // @ts-ignore
    spyOn(component.langChangeSub, 'unsubscribe');
    component.ngOnDestroy();
    // @ts-ignore
    expect(component.langChangeSub.unsubscribe).toHaveBeenCalled();
  });
});
