import { Component, ElementRef, EventEmitter, Input, OnInit, OnChanges, Output, ViewChild } from '@angular/core';
import { MatSnackBarComponent } from '@global-errors/mat-snack-bar/mat-snack-bar.component';
import { LocalStorageService } from '@global-service/localstorage/local-storage.service';
import { FileHandle } from 'src/app/ubs/ubs-admin/models/file-handle.model';
import { EventImage } from '../../models/events.interface';
import { EventsService } from '../../services/events.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-images-container',
  templateUrl: './images-container.component.html',
  styleUrls: ['./images-container.component.scss']
})
export class ImagesContainerComponent implements OnInit, OnChanges {
  private isImageTypeError = false;
  private dragAndDropLabel = '+';
  private imgArray: File[] = [];
  private maxImages = 5;

  public defImgs = [
    '/assets/img/events/illustration-earth.png',
    '/assets/img/events/illustration-money.png',
    '/assets/img/events/illustration-people.png',
    '/assets/img/events/illustration-recycle.png',
    '/assets/img/events/illustration-store.png'
  ];
  private defaultImage = '/assets/img/events/default-image.png';
  public images: EventImage[] = [];
  public editMode: boolean;
  private imagesTodelete: string[] = [];

  public imageCount = 0;

  isImageSizeError: boolean;

  @ViewChild('takeInput') InputVar: ElementRef;

  @Input() imagesEditArr: string[];
  @Input() isImagesArrayEmpty: boolean;
  @Output() imgArrayOutput = new EventEmitter<Array<File>>();
  @Output() deleteImagesOutput = new EventEmitter<Array<string>>();
  @Output() oldImagesOutput = new EventEmitter<Array<string>>();

  constructor(
    private localStorageService: LocalStorageService,
    private snackBar: MatSnackBarComponent,
    private eventService: EventsService
  ) {}

  ngOnInit(): void {
    this.editMode = this.localStorageService.getEditMode();

    this.initImages();
    if (this.editMode) {
      this.imageCount = this.imagesEditArr.length;
      this.images.forEach((el, ind) => {
        if (this.imagesEditArr[ind]) {
          el.src = this.imagesEditArr[ind];
        }
        if (el.src) {
          el.isLabel = false;
        }
        if (!el.src && this.images[ind - 1].src) {
          el.isLabel = true;
        }
      });
    }
  }

  ngOnChanges() {
    if (this.isImagesArrayEmpty) {
      this.chooseImage(this.defaultImage);
    }
  }

  private initImages(): void {
    this.images = Array.from({ length: this.maxImages }, (_, i) => ({ src: null, label: this.dragAndDropLabel, isLabel: i === 0 }));
  }

  public chooseImage(img: string) {
    const imageName = img.substring(img.lastIndexOf('/') + 1);
    this.eventService.getImageAsFile(img).subscribe((blob: Blob) => {
      const imageFile = new File([blob], imageName, { type: 'image/png' });
      this.checkFileExtension(imageFile);
      this.transferFile(imageFile);
    });
  }

  public dropImages(event: CdkDragDrop<string[]>): void {
    const prevIndex = event.previousIndex;
    const newIndex = event.currentIndex;

    moveItemInArray(this.images, prevIndex, newIndex);
    moveItemInArray(this.imagesEditArr, prevIndex, newIndex);
  }

  public filesDropped(files: FileHandle[]): void {
    const imageFile = files[0].file;
    this.checkFileExtension(imageFile);
    this.transferFile(imageFile);
  }

  public loadFile(event: Event): void {
    const imageFile: File = (event.target as HTMLInputElement).files[0];
    this.InputVar.nativeElement.value = '';
    this.checkFileExtension(imageFile);
    this.transferFile(imageFile);
  }

  private checkFileExtension(file: any): void {
    this.isImageSizeError = file.size >= 10000000;
    this.isImageTypeError = !(file.type === 'image/jpeg' || file.type === 'image/png');
  }

  private transferFile(imageFile: File): void {
    if (!this.isImageTypeError && !this.isImageSizeError) {
      const reader: FileReader = new FileReader();
      this.imgArray.push(imageFile);
      this.imgArrayOutput.emit(this.imgArray);
      if (this.editMode) {
        this.deleteImagesOutput.emit(this.imagesTodelete);
        this.oldImagesOutput.emit(this.imagesEditArr);
      }

      reader.readAsDataURL(imageFile);
      reader.onload = () => {
        this.assignImage(reader.result);
      };
    } else if (this.isImageTypeError && this.isImageSizeError) {
      this.snackBar.openSnackBar('user.photo-upload.error-img-type-and-size');
    } else if (this.isImageTypeError) {
      this.snackBar.openSnackBar('user.photo-upload.error-img-type');
    } else if (this.isImageSizeError) {
      this.snackBar.openSnackBar('user.photo-upload.error-img-size');
    }
  }

  private assignImage(result: any): void {
    const imageToAssign = this.images.find((img) => !img.src);
    if (imageToAssign) {
      imageToAssign.src = result;
      imageToAssign.isLabel = false;
      this.imageCount += 1;
    }
  }

  public deleteImage(i: number): void {
    this.images.splice(i, 1);
    this.imgArray.splice(i, 1);
    this.imgArrayOutput.emit(this.imgArray);

    const allowLabel = this.imageCount === 5;

    this.images.push({ src: null, label: this.dragAndDropLabel, isLabel: allowLabel });
    this.imageCount--;
    if (this.editMode && this.imagesEditArr[i]) {
      this.imagesTodelete.push(this.imagesEditArr[i]);
      this.imagesEditArr.splice(i, 1);
    }
    if (this.editMode) {
      this.deleteImagesOutput.emit(this.imagesTodelete);
      this.oldImagesOutput.emit(this.imagesEditArr);
    }
  }
}
