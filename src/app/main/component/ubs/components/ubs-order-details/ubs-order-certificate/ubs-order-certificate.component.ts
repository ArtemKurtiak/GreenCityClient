import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../../services/order.service';
import { Subject } from 'rxjs';
import { CertificateStatus } from '../../../certificate-status.enum';
import { Bag, FinalOrder, Locations, OrderDetails } from '../../../models/ubs.interface';
import { UBSOrderFormService } from '../../../services/ubs-order-form.service';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';

@Component({
  selector: 'app-ubs-order-certificate',
  templateUrl: './ubs-order-certificate.component.html',
  styleUrls: ['./ubs-order-certificate.component.scss']
})
export class UbsOrderCertificateComponent implements OnInit, OnDestroy {
  @Input() showTotal;
  @Input() bags: Bag[];
  orders: OrderDetails;
  orderDetailsForm: FormGroup;
  certStatuses = [];
  minOrderValue = 500;
  pointsUsed = 0;
  certificates = [];
  certificateSum = 0;
  total = 0;
  finalSum = 0;
  minAmountOfBigBags: number;
  totalOfBigBags: number;
  cancelCertBtn = false;
  points: number;
  defaultPoints: number;
  displayMinOrderMes = false;
  displayMinBigBagsMes = false;
  displayMes = false;
  displayCert = false;
  displayShop = false;
  addCert = false;
  onSubmit = true;
  order: {};
  certificateMask = '0000-0000';
  ecoStoreMask = '0000000000';
  servicesMask = '000';
  certificatePattern = /(?!0000)\d{4}-(?!0000)\d{4}/;
  commentPattern = /^[i\s]{0,255}(.){0,255}[i\s]{0,255}$/;
  additionalOrdersPattern = /^\d{10}$/;
  displayOrderBtn = false;
  certSize = false;
  showCertificateUsed = 0;
  certificateLeft = 0;
  certDate: string;
  certStatus: string;
  failedCert = false;
  userOrder: FinalOrder;
  object: {};
  private destroy: Subject<boolean> = new Subject<boolean>();
  public currentLanguage: string;
  public certificateError = false;
  bonusesRemaining: boolean;
  isDialogOpen = false;
  popupConfig = {
    hasBackdrop: true,
    closeOnNavigation: true,
    disableClose: true,
    panelClass: 'popup-dialog-container',
    data: {
      popupTitle: 'confirmation.title',
      popupSubtitle: 'confirmation.subTitle',
      popupConfirm: 'confirmation.cancel',
      popupCancel: 'confirmation.dismiss'
    }
  };
  public isFetching = false;
  public currentLocation: string;
  public locations: Locations[];
  public selectedLocationId: number;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private shareFormService: UBSOrderFormService,
    private localStorageService: LocalStorageService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    localStorage.removeItem('UBSorderData');
    this.orderService.locationSubject.pipe(takeUntil(this.destroy)).subscribe(() => {
      this.takeOrderData();
      this.subscribeToLangChange();
      if (this.localStorageService.getUbsOrderData()) {
        this.calculateTotal();
      }
    });
  }

  private subscribeToLangChange(): void {
    this.localStorageService.languageSubject.pipe(takeUntil(this.destroy)).subscribe(() => {
      this.currentLanguage = this.localStorageService.getCurrentLanguage();
      this.setCurrentLocation(this.currentLanguage);
      const inputsQuantity = [];
      this.bags.forEach((a) => {
        inputsQuantity.push(a.quantity === undefined || a.quantity === null ? null : a.quantity);
        a.quantity = null;
      });
      this.bags = this.orders.bags;
      this.filterBags();
      this.bags.forEach((b) => {
        b.quantity = inputsQuantity.shift();
      });
      this.calculateTotal();
    });
  }

  private setCurrentLocation(currentLanguage: string): void {
    this.currentLocation = this.locations.find((loc) => loc.id === this.selectedLocationId && loc.languageCode === currentLanguage).name;
  }

  disableAddCertificate() {
    return this.certificates.length === this.formArrayCertificates.length;
  }

  private filterBags(): void {
    this.bags = this.orders.bags.filter((value) => value.code === this.currentLanguage).sort((a, b) => b.price - a.price);
  }

  public takeOrderData() {
    this.isFetching = true;
    this.currentLanguage = this.localStorageService.getCurrentLanguage();
    this.orderService
      .getOrders()
      .pipe(takeUntil(this.destroy))
      .subscribe((orderData: OrderDetails) => {
        this.orders = this.shareFormService.orderDetails;
        this.minAmountOfBigBags = orderData.minAmountOfBigBags;
        this.bags = this.orders.bags;
        this.points = this.orders.points;
        this.defaultPoints = this.points;
        this.certificateLeft = orderData.points;
        this.bags.forEach((bag) => {
          bag.quantity = bag.quantity === undefined ? null : bag.quantity;
          this.orderDetailsForm.addControl('quantity' + String(bag.id), new FormControl('', [Validators.min(0), Validators.max(999)]));
          const quantity = bag.quantity === null ? '' : +bag.quantity;
          const valueName = 'quantity' + String(bag.id);
          this.orderDetailsForm.controls[valueName].setValue(quantity);
        });
        this.filterBags();
        this.isFetching = false;
      });
  }

  initForm() {
    this.orderDetailsForm = this.fb.group({
      orderComment: new FormControl(''),
      bonus: new FormControl('no'),
      shop: new FormControl('no'),
      formArrayCertificates: this.fb.array([new FormControl('', [Validators.minLength(8), Validators.pattern(this.certificatePattern)])]),
      additionalOrders: this.fb.array(['']),
      orderSum: new FormControl(0, [Validators.required, Validators.min(500)])
    });
  }

  get formArrayCertificates() {
    return this.orderDetailsForm.get('formArrayCertificates') as FormArray;
  }

  private certificateDateTreat(date: string) {
    return date.split('-').reverse().join('-');
  }

  certificateMatch(cert): void {
    if (cert.certificateStatus === CertificateStatus.ACTIVE || cert.certificateStatus === CertificateStatus.NEW) {
      this.certificateSum += cert.certificatePoints;
      this.displayCert = true;
      this.addCert = true;
    }
    this.failedCert = cert.certificateStatus === CertificateStatus.EXPIRED || cert.certificateStatus === CertificateStatus.USED;
    this.certificateSum = this.failedCert && this.formArrayCertificates.length === 1 ? 0 : this.certificateSum;
    this.certDate = this.certificateDateTreat(cert.certificateDate);
    this.certStatus = cert.certificateStatus;
  }

  changeForm() {
    this.orderDetailsForm.patchValue({
      orderSum: this.showTotal
    });
  }

  private calculateTotal(): void {
    this.total = 0;
    console.log(this.bags);
    this.bags.forEach((bag) => {
      this.total += bag.price * bag.quantity;
    });
    this.showTotal = this.total;
    this.changeForm();
    if (this.total < this.minOrderValue && this.orderDetailsForm.dirty) {
      this.displayMinOrderMes = true;
      this.onSubmit = true;
    } else {
      this.displayMinOrderMes = false;
      this.onSubmit = false;
    }

    this.finalSum = this.total - this.pointsUsed;
    if (this.certificateSum > 0) {
      if (this.total > this.certificateSum) {
        this.certificateLeft = 0;
        this.finalSum = this.total - this.certificateSum - this.pointsUsed;
        this.showCertificateUsed = this.certificateSum;
      } else {
        this.finalSum = 0;
        this.certificateLeft = this.certificateSum - this.total;
        this.showCertificateUsed = this.total;
        this.points = this.orders.points;
      }
      this.bonusesRemaining = this.certificateSum > 0;
    } else {
      this.certificateLeft = 0;
      this.finalSum = this.total - this.certificateSum - this.pointsUsed;
      this.showCertificateUsed = this.certificateSum;
    }
    this.changeOrderDetails();
  }

  get additionalOrders() {
    return this.orderDetailsForm.get('additionalOrders') as FormArray;
  }

  changeOrderDetails() {
    this.shareFormService.orderDetails.pointsToUse = this.pointsUsed;
    this.shareFormService.orderDetails.certificates = this.certificates;
    this.shareFormService.orderDetails.additionalOrders = this.additionalOrders.value;
    this.shareFormService.orderDetails.orderComment = this.orderDetailsForm.value.orderComment;
    this.shareFormService.orderDetails.certificatesSum = this.showCertificateUsed;
    this.shareFormService.orderDetails.pointsSum = this.pointsUsed;
    this.shareFormService.orderDetails.total = this.showTotal;
    this.shareFormService.orderDetails.finalSum = this.finalSum;
    this.shareFormService.changeOrderDetails();
  }

  calculateCertificates(arr): void {
    if (arr.length > 0) {
      this.cancelCertBtn = true;
      arr.forEach((certificate, index) => {
        this.orderService
          .processCertificate(certificate)
          .pipe(takeUntil(this.destroy))
          .subscribe(
            (cert) => {
              this.certificateMatch(cert);
              if (this.total < this.certificateSum) {
                this.certSize = true;
              }
              this.calculateTotal();
              this.cancelCertBtn = false;
            },
            (error) => {
              this.cancelCertBtn = false;
              if (error.status === 404) {
                arr.splice(index, 1);
                this.certificateError = true;
              }
            }
          );
      });
    } else {
      this.calculateTotal();
    }
    this.certificateSum = 0;
  }

  certificateReset(resetMessage: boolean): void {
    if (resetMessage) {
      this.certDate = '';
      this.certStatus = '';
      this.addCert = true;
    }

    this.bonusesRemaining = false;
    this.showCertificateUsed = null;
    this.addCert = false;
    this.displayCert = false;
    this.certificates = [];
    this.certSize = false;
    this.certificateLeft = 0;
    this.certificateSum = 0;
    this.formArrayCertificates.patchValue(['']);
    this.calculateCertificates(this.certificates);
  }

  deleteCertificate(index: number): void {
    this.certificates.splice(index, 1);
    this.clearAdditionalCertificate(index);
    this.certificateError = false;
  }

  private clearAdditionalCertificate(index: number) {
    if (this.formArrayCertificates.length > 1) {
      if (this.certificates.length === 0) {
        this.certificateReset(true);
      }
      this.formArrayCertificates.removeAt(index);
    } else {
      this.certificateReset(true);
      this.formArrayCertificates.patchValue(['']);
      this.formArrayCertificates.markAsUntouched();
    }
    this.certStatuses.splice(index, 1);
    this.calculateCertificates(this.certificates);
  }

  showCancelButton(i: number) {
    return (
      (this.certStatuses[i] && this.formArrayCertificates.controls[i].value) ||
      (this.formArrayCertificates.controls.length > 1 && !this.formArrayCertificates.controls[i].value.length)
    );
  }

  certificateSubmit(index: number): void {
    if (!this.certificates.includes(this.formArrayCertificates.value[index])) {
      this.certificates.push(this.formArrayCertificates.value[index]);
      this.certStatuses.push(true);
      this.calculateCertificates(this.certificates);
    }
  }

  showActivateButton(i: number) {
    return (
      (!this.certStatuses[i] && this.formArrayCertificates.controls[i].value && !this.disableAddCertificate()) ||
      (this.formArrayCertificates.controls.length === 1 && !this.formArrayCertificates.controls[i].value.length)
    );
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.unsubscribe();
  }
}
