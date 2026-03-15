import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErDiagram } from './er-diagram';

describe('ErDiagram', () => {
  let component: ErDiagram;
  let fixture: ComponentFixture<ErDiagram>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErDiagram],
    }).compileComponents();

    fixture = TestBed.createComponent(ErDiagram);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
