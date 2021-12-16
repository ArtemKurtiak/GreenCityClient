import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Params } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UbsAdminCancelModalComponent } from '../ubs-admin-cancel-modal/ubs-admin-cancel-modal.component';
import { UbsAdminGoBackModalComponent } from '../ubs-admin-go-back-modal/ubs-admin-go-back-modal.component';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { take, takeUntil } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';
import { Subject } from 'rxjs';
import {
  IAddressExportDetails,
  IExportDetails,
  IGeneralOrderInfo,
  IOrderDetails,
  IOrderInfo,
  IOrderStatusInfo,
  IPaymentInfo,
  IResponsiblePersons,
  IUserInfo
} from '../../models/ubs-admin.interface';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-ubs-admin-order',
  templateUrl: './ubs-admin-order.component.html',
  styleUrls: ['./ubs-admin-order.component.scss']
})
export class UbsAdminOrderComponent implements OnInit, OnDestroy {
  currentLanguage: string;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  orderForm: FormGroup;
  isDataLoaded = false;
  orderId: number;
  orderInfo: IOrderInfo;
  generalOrderInfo: IGeneralOrderInfo;
  clientInfo: IUserInfo;
  addressInfo: IAddressExportDetails;
  paymentInfo: IPaymentInfo;
  exportInfo: IExportDetails;
  responsiblePersonInfo: IResponsiblePersons;
  orderDetails: IOrderDetails;
  orderStatusInfo: IOrderStatusInfo;
  currentOrderStatus: string;
  overpayment = 0;
  isMinOrder = true;
  timeFrom: string;
  timeTo: string;
  actualPrice: number;

  constructor(
    private translate: TranslateService,
    private orderService: OrderService,
    private localStorageService: LocalStorageService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.localStorageService.languageBehaviourSubject.pipe(takeUntil(this.destroy$)).subscribe((lang) => {
      this.currentLanguage = lang;
      this.translate.setDefaultLang(lang);
    });
    this.route.params.subscribe((params: Params) => {
      this.orderId = +params.id;
    });
    this.getOrderInfo(this.orderId, this.currentLanguage);
  }

  public getOrderInfo(orderId, lang): void {
    this.orderService
      .getOrderInfo(orderId, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.orderInfo = data;
        this.generalOrderInfo = data.generalOrderInfo;
        this.currentOrderStatus = this.generalOrderInfo.orderStatus;
        this.clientInfo = data.userInfoDto;
        this.addressInfo = data.addressExportDetailsDto;
        this.paymentInfo = data.paymentTableInfoDto;
        this.exportInfo = data.exportDetailsDto;
        this.responsiblePersonInfo = data.employeePositionDtoRequest;
        this.setOrderDetails();
        this.initForm();
      });
  }

  private setOrderDetails() {
    this.setPreviousBagsIfEmpty(this.currentOrderStatus);
    const bagsObj = this.orderInfo.bags.map((bag) => {
      bag.planned = this.orderInfo.amountOfBagsOrdered[bag.id] || 0;
      bag.confirmed = this.orderInfo.amountOfBagsConfirmed[bag.id] || 0;
      bag.actual = this.orderInfo.amountOfBagsExported[bag.id] || 0;
      return bag;
    });
    this.orderDetails = {
      bags: bagsObj,
      courierInfo: Object.assign({}, this.orderInfo.courierInfo),
      bonuses: this.orderInfo.orderBonusDiscount,
      certificateDiscount: this.orderInfo.orderCertificateTotalDiscount,
      orderFullPrice: this.orderInfo.orderFullPrice,
      courierPricePerPackage: this.orderInfo.courierPricePerPackage
    };
    this.orderStatusInfo = this.getOrderStatusInfo(this.currentOrderStatus);
  }

  private setPreviousBagsIfEmpty(status) {
    const actualStage = this.getOrderStatusInfo(status).ableActualChange;
    if (actualStage) {
      if (!Object.keys(this.orderInfo.amountOfBagsExported).length) {
        this.orderInfo.amountOfBagsExported = Object.assign({}, this.orderInfo.amountOfBagsConfirmed);
      }
    } else {
      if (!Object.keys(this.orderInfo.amountOfBagsConfirmed).length) {
        this.orderInfo.amountOfBagsConfirmed = Object.assign({}, this.orderInfo.amountOfBagsOrdered);
      }
    }
  }

  private getOrderStatusInfo(statusName: string) {
    return this.generalOrderInfo.orderStatusesDtos.find((status) => status.key === statusName);
  }

  initForm() {
    const currentEmployees = this.responsiblePersonInfo.currentPositionEmployees;
    this.overpayment = 0;
    this.orderForm = this.fb.group({
      orderStatusForm: this.fb.group({
        orderStatus: this.generalOrderInfo.orderStatus,
        adminComment: this.generalOrderInfo.adminComment,
        cancellationComment: '',
        cancellationReason: ''
      }),
      clientInfoForm: this.fb.group({
        senderName: [this.clientInfo.recipientName, [Validators.required, Validators.minLength(1), Validators.maxLength(30)]],
        senderSurname: [this.clientInfo.recipientSurName, [Validators.required, Validators.minLength(1), Validators.maxLength(30)]],
        senderPhone: [this.clientInfo.recipientPhoneNumber, [Validators.required, Validators.pattern('^\\+?3?8?(0\\d{9})$')]],
        senderEmail: [this.clientInfo.recipientEmail, [Validators.required, Validators.email]]
      }),
      addressDetailsForm: this.fb.group({
        region: this.addressInfo.addressRegion,
        settlement: this.addressInfo.addressCity,
        street: this.addressInfo.addressStreet,
        building: this.addressInfo.addressHouseNumber,
        corpus: this.addressInfo.addressHouseCorpus,
        entrance: this.addressInfo.addressEntranceNumber,
        district: this.addressInfo.addressDistrict
      }),
      exportDetailsForm: this.fb.group({
        exportedDate: this.exportInfo.dateExport ? formatDate(this.exportInfo.dateExport, 'yyyy-MM-dd', this.currentLanguage) : '',
        exportedTime: this.parseTimeRange(this.exportInfo.timeDeliveryFrom, this.exportInfo.timeDeliveryTo),
        receivingStation: this.exportInfo.receivingStation
      }),
      responsiblePersonsForm: this.fb.group({
        callManager: this.getEmployeeById(currentEmployees, 2),
        logistician: this.getEmployeeById(currentEmployees, 3),
        navigator: this.getEmployeeById(currentEmployees, 4),
        driver: this.getEmployeeById(currentEmployees, 5)
      }),
      orderDetailsForm: this.fb.group({
        storeOrderNumber: this.orderInfo.numbersFromShop.join(', '),
        certificate: 'TODO-TODO',
        customerComment: this.orderInfo.comment,
        orderFullPrice: this.orderInfo.orderFullPrice
      })
    });
    this.orderDetails.bags.forEach((bag) => {
      this.getFormGroup('orderDetailsForm').addControl(
        'plannedQuantity' + String(bag.id),
        new FormControl(bag.planned, [Validators.min(0), Validators.max(999)])
      );
      this.getFormGroup('orderDetailsForm').addControl(
        'confirmedQuantity' + String(bag.id),
        new FormControl(bag.confirmed, [Validators.min(0), Validators.max(999)])
      );
      this.getFormGroup('orderDetailsForm').addControl(
        'actualQuantity' + String(bag.id),
        new FormControl(bag.actual, [Validators.min(0), Validators.max(999)])
      );
    });
  }

  getEmployeeById(allCurrentEmployees: Map<string, string>, id: number) {
    if (!allCurrentEmployees) {
      return '';
    }
    const key = Object.keys(allCurrentEmployees).find((el) => el.includes(`id=${id},`));
    return key ? allCurrentEmployees[key] : '';
  }

  getFormGroup(name: string): FormGroup {
    return this.orderForm.get(name) as FormGroup;
  }

  openCancelModal() {
    this.dialog
      .open(UbsAdminCancelModalComponent, {
        hasBackdrop: true
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((discarded) => {
        if (discarded) {
          this.resetForm();
        }
      });
  }

  openGoBackModal() {
    this.dialog.open(UbsAdminGoBackModalComponent, {
      hasBackdrop: true
    });
  }

  onChangedOrderStatus(status: string) {
    this.currentOrderStatus = status;
    this.orderStatusInfo = this.getOrderStatusInfo(this.currentOrderStatus);
  }

  public changeOverpayment(sum) {
    this.overpayment = sum;
  }

  public setFinalPrice(price: number) {
    this.actualPrice = price;
  }

  public setMinOrder(flag) {
    this.isMinOrder = flag;
  }

  parseTimeRange(from: string, to: string) {
    this.timeFrom = this.parseTime(from);
    this.timeTo = this.parseTime(to);
    return `${this.timeFrom} - ${this.timeTo}`;
  }

  parseTime(dateStr: string) {
    return dateStr ? formatDate(dateStr, 'HH:mm', this.currentLanguage) : '';
  }

  resetForm() {
    this.orderForm.reset();
    this.initForm();
    this.currentOrderStatus = this.generalOrderInfo.orderStatus;
    this.orderStatusInfo = this.getOrderStatusInfo(this.currentOrderStatus);
  }

  onSubmit() {
    // let updatedData = {
    //   ecoNumberFromShop: [
    //     {
    //       newEcoNumber: '3245678765',
    //       oldEcoNumber: ''
    //     }
    //   ],
    //   exportDetailsDtoUpdate: {
    //     dateExport: this.orderForm.get(['exportDetailsForm', 'exportedDate']).dirty
    //       ? this.orderForm.get(['exportDetailsForm', 'exportedDate']).value
    //       : undefined,
    //     receivingStation: this.orderForm.get(['exportDetailsForm', 'receivingStation']).dirty
    //       ? this.orderForm.get(['exportDetailsForm', 'receivingStation']).value
    //       : undefined,
    //    timeDeliveryFrom: '2021-09-02T14:00:00',
    //    timeDeliveryTo: '2021-09-02T14:30:00'
    // },
    // orderAddressExportDetailsDtoUpdate: {
    //   orderId: this.orderId,
    //   addressCity: this.orderForm.get(['addressDetailsForm', 'settlement']).value,
    //   addressDistrict: this.orderForm.get(['addressDetailsForm', 'district']).value,
    //   addressEntranceNumber: this.orderForm.get(['addressDetailsForm', 'entrance']).value,
    //   addressHouseCorpus: this.orderForm.get(['addressDetailsForm', 'corpus']).value,
    //   addressHouseNumber: this.orderForm.get(['addressDetailsForm', 'building']).value,
    //   addressRegion: this.orderForm.get(['addressDetailsForm', 'region']).value,
    //   addressStreet: this.orderForm.get(['addressDetailsForm', 'street']).value,
    //   addressId: this.addressInfo.id
    // },
    // orderDetailStatusRequestDto: {
    //   orderComment: this.orderForm.get(['orderStatusForm', 'adminComment']).value,
    //   orderPaymentStatus: this.generalOrderInfo.orderPaymentStatus,
    //   orderStatus: this.orderForm.get(['orderStatusForm', 'orderStatus']).value
    // },
    // ubsCustomersDtoUpdate: {
    //   recipientEmail: this.orderForm.get(['clientInfoForm', 'senderEmail']).value,
    //   recipientId: this.clientInfo.recipientId,
    //   recipientName: this.orderForm.get(['clientInfoForm', 'senderName']).value,
    //   recipientPhoneNumber: this.orderForm.get(['clientInfoForm', 'senderPhone']).value,
    //   recipientSurName: this.orderForm.get(['clientInfoForm', 'senderSurname']).value
    // },
    // updateOrderDetailDto: [
    // {
    //   bagId: 1,
    //   confirmedQuantity: this.orderForm.get(['orderDetailsForm', 'confirmedQuantity1']).value,
    //   exportedQuantity: this.orderForm.get(['orderDetailsForm', 'exportedQuantity1']).value,
    //   orderId: this.orderId
    // },
    // {
    //   bagId: 2,
    //   confirmedQuantity: this.orderForm.get(['orderDetailsForm', 'confirmedQuantity2']).value,
    //   exportedQuantity: this.orderForm.get(['orderDetailsForm', 'exportedQuantity2']).value,
    //   orderId: this.orderId
    // },
    // {
    //   bagId: 3,
    //   confirmedQuantity: this.orderForm.get(['orderDetailsForm', 'confirmedQuantity3']).value,
    //   exportedQuantity: this.orderForm.get(['orderDetailsForm', 'exportedQuantity3']).value,
    //   orderId: this.orderId
    // }
    //   ]
    // };

    const updatedValues: any = {};
    this.getUpdates(this.orderForm, updatedValues);

    const updatedData: any = {};
    this.setUpdatedData(updatedData, updatedValues);
    console.log(updatedData);
    return;

    this.orderService
      .updateOrderInfo(this.orderId, this.currentLanguage, updatedValues)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.getOrderInfo(this.orderId, this.currentLanguage);
      });
  }

  private setUpdatedData(updatedData: any, updatedValues: any) {
    const clientInfoData = updatedValues.clientInfoForm;
    if (!clientInfoData) {
      return;
    }
    let ubsCustomerDTO: any = {};

    for (const key in clientInfoData) {
      switch (key) {
        case 'senderName':
          ubsCustomerDTO.recipientName = clientInfoData[key];
      }
    }

    updatedData.ubsCustomersDtoUpdate = ubsCustomerDTO;
  }

  private getUpdates(formItem: FormGroup | FormArray | FormControl, updatedValues: any, name?: string) {
    if (formItem instanceof FormControl) {
      if (name && formItem.dirty) {
        updatedValues[name] = formItem.value;
      }
    } else {
      for (const formControlName in formItem.controls) {
        if (formItem.controls.hasOwnProperty(formControlName)) {
          const formControl = formItem.controls[formControlName];

          if (formControl instanceof FormControl) {
            this.getUpdates(formControl, updatedValues, formControlName);
          } else if (formControl instanceof FormArray && formControl.dirty && formControl.controls.length > 0) {
            updatedValues[formControlName] = [];
            this.getUpdates(formControl, updatedValues[formControlName]);
          } else if (formControl instanceof FormGroup && formControl.dirty) {
            updatedValues[formControlName] = {};
            this.getUpdates(formControl, updatedValues[formControlName]);
          }
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
