import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Transaction } from '../models/transaction.model';

export interface TransactionModalState {
  isOpen: boolean;
  transaction: Transaction | null;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionModalService {
  state = signal<TransactionModalState>({
    isOpen: false,
    transaction: null
  });

  private savedSubject = new Subject<void>();
  saved$ = this.savedSubject.asObservable();

  openModal(transaction: Transaction | null = null) {
    this.state.set({
      isOpen: true,
      transaction
    });
  }

  closeModal() {
    this.state.set({
      isOpen: false,
      transaction: null
    });
  }

  notifySaved() {
    this.savedSubject.next();
  }
}
