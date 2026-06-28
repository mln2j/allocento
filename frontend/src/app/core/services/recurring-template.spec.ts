import { TestBed } from '@angular/core/testing';

import { RecurringTemplate } from './recurring-template';

describe('RecurringTemplate', () => {
  let service: RecurringTemplate;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecurringTemplate);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
