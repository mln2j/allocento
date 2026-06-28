import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecurringTemplates } from './recurring-templates';

describe('RecurringTemplates', () => {
  let component: RecurringTemplates;
  let fixture: ComponentFixture<RecurringTemplates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringTemplates]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecurringTemplates);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
