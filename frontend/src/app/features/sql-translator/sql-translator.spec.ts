import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SqlTranslator } from './sql-translator';

describe('SqlTranslator', () => {
  let component: SqlTranslator;
  let fixture: ComponentFixture<SqlTranslator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlTranslator],
    }).compileComponents();

    fixture = TestBed.createComponent(SqlTranslator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
