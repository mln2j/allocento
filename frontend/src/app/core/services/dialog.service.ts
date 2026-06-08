import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AlertDialogComponent, AlertDialogData } from '../../shared/alert-dialog/alert-dialog.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);

  alert(title: string, message: string, buttonText?: string): Observable<void> {
    const dialogRef = this.dialog.open<AlertDialogComponent, AlertDialogData, void>(AlertDialogComponent, {
      data: { title, message, buttonText },
      panelClass: 'custom-dialog-container',
      maxWidth: '400px'
    });
    return dialogRef.afterClosed();
  }

  confirm(title: string, message: string, confirmText?: string, cancelText?: string): Observable<boolean> {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: { title, message, confirmText, cancelText },
      panelClass: 'custom-dialog-container',
      maxWidth: '400px'
    });
    return dialogRef.afterClosed().pipe(
      map(result => !!result)
    );
  }
}
