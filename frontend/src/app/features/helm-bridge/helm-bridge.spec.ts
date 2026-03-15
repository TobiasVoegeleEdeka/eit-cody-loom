import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelmBridge } from './helm-bridge';

describe('HelmBridge', () => {
  let component: HelmBridge;
  let fixture: ComponentFixture<HelmBridge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelmBridge],
    }).compileComponents();

    fixture = TestBed.createComponent(HelmBridge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
