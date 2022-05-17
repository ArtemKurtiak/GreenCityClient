import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VerifyEmailService } from '@auth-service/verify-email/verify-email.service';
import { MatSnackBarComponent } from '@global-errors/mat-snack-bar/mat-snack-bar.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthModalComponent } from '@global-auth/auth-modal/auth-modal.component';
@Injectable({
  providedIn: 'root'
})
export class CheckTokenService {
  constructor(
    private activatedRoute: ActivatedRoute,
    private verifyEmailService: VerifyEmailService,
    private snackBar: MatSnackBarComponent,
    public dialog: MatDialog
  ) {}

  public onCheckToken(subs: Subscription): void {
    subs.add(
      this.activatedRoute.queryParams
        .pipe(
          switchMap((params) => {
            const { token, user_id } = params;
            if (token && user_id) {
              return this.verifyEmailService.onCheckToken(token, user_id);
            } else {
              return EMPTY;
            }
          })
        )
        .subscribe((res) => {
          if (res) {
            this.snackBar.openSnackBar('successConfirmEmail');
            this.openAuthModalWindow();
          }
        })
    );
  }
  public openAuthModalWindow(): void {
    this.dialog.open(AuthModalComponent, {
      hasBackdrop: true,
      closeOnNavigation: true,
      panelClass: ['custom-dialog-container', 'transparent'],
      data: {
        popUpName: 'sign-in'
      }
    });
  }
}
