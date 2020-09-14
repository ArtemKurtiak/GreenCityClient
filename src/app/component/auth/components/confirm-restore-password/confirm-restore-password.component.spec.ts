import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SignInIcons } from 'src/app/image-pathes/sign-in-icons';
import { ChangePasswordService } from '@auth-service/change-password.service';
import { authImages} from '../../../../image-pathes/auth-images';
import { ConfirmRestorePasswordComponent } from './confirm-restore-password.component';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';


describe('ConfirmRestorePasswordComponent', () => {
  let component: ConfirmRestorePasswordComponent;
  let fixture: ComponentFixture<ConfirmRestorePasswordComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ ConfirmRestorePasswordComponent ],
      imports: [
        authImages,
        SignInIcons,
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
        ],
      providers: [
        ChangePasswordService
        ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmRestorePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create ConfirmRestorePasswordComponent', () => {
    expect(component).toBeTruthy();
  });
});
