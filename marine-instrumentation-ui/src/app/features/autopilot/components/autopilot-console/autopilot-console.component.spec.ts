import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutopilotConsoleComponent } from './autopilot-console.component';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';

@Component({
  selector: 'app-button',
  standalone: true,
  template: '<ng-content></ng-content>',
  styles: []
})
class MockAppButtonComponent {
  @Input() variant: any;
}

describe('AutopilotConsoleComponent', () => {
  let component: AutopilotConsoleComponent;
  let fixture: ComponentFixture<AutopilotConsoleComponent>;
  let mockFacade: any;
  let stateSubject: BehaviorSubject<string>;
  let connectedSubject: BehaviorSubject<boolean>;
  let targetHeaderSubject: BehaviorSubject<number>;
  let targetWindSubject: BehaviorSubject<number>;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<string>('standby');
    connectedSubject = new BehaviorSubject<boolean>(true);
    targetHeaderSubject = new BehaviorSubject<number>(0);
    targetWindSubject = new BehaviorSubject<number>(0);

    mockFacade = {
      state$: stateSubject.asObservable(),
      isConnected$: connectedSubject.asObservable(),
      targetHeadingTrue$: targetHeaderSubject.asObservable(),
      targetHeadingMagnetic$: targetHeaderSubject.asObservable(),
      targetWindAngle$: targetWindSubject.asObservable(),
      fault$: new BehaviorSubject('none'),
      commandError$: new BehaviorSubject(null),
      windHazard$: new BehaviorSubject('none'),
      engageAuto: vi.fn(),
      engageWind: vi.fn(),
      engageRoute: vi.fn(),
      standby: vi.fn(),
      clearFault: vi.fn(),
      adjustTarget: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [], 
      providers: [
        { provide: AutopilotFacadeService, useValue: mockFacade },
        {
          provide: DatapointStoreService,
          useValue: { observe: () => new BehaviorSubject(null) },
        },
      ]
    })
    .overrideComponent(AutopilotConsoleComponent, {
      set: { imports: [CommonModule, DegreesPipe, TranslatePipe, MockAppButtonComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutopilotConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show disconnected overlay when not connected', async () => {
    connectedSubject.next(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const overlay = fixture.nativeElement.querySelector('.disconnected-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.textContent).toContain('DISCONNECTED');
  });

  it('should call engageAuto when AUTO is clicked', () => {
    // AUTO is the first button in .mode-selector
    // Template:
    // <button class="mode-btn" ... (click)="store.setState('auto')">AUTO</button>
    
    // Find button by text content to be safe
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.mode-btn')) as HTMLButtonElement[];
    const autoBtn = buttons.find(b => b.textContent?.trim().toUpperCase() === 'AUTO');
    
    expect(autoBtn).toBeTruthy();
    autoBtn?.click();
    expect(mockFacade.engageAuto).toHaveBeenCalled();
  });

  it('should show DISENGAGE button when engaged', async () => {
    stateSubject.next('auto');
    fixture.detectChanges();
    await fixture.whenStable();

    // Standby button only appears when state !== standby
    // selector: .engage-btn
    const standbyBtn = fixture.nativeElement.querySelector('.engage-btn');
    expect(standbyBtn).toBeTruthy();
    expect(standbyBtn.textContent).toContain('DISENGAGE');
    
    standbyBtn.click();
    expect(mockFacade.standby).toHaveBeenCalled();
  });

  it('should hide controls when disconnected', async () => {
      connectedSubject.next(false);
      fixture.detectChanges();
      await fixture.whenStable();
      
      const console = fixture.nativeElement.querySelector('.ap-console');
      expect(console.classList.contains('disabled')).toBe(true);
  });
});
