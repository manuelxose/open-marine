import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutopilotConsoleComponent } from './autopilot-console.component';
import { AutopilotStoreService } from '../../../../state/autopilot/autopilot-store.service';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';

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
  let mockStore: any;
  let stateSubject: BehaviorSubject<string>;
  let connectedSubject: BehaviorSubject<boolean>;
  let targetHeaderSubject: BehaviorSubject<number>;
  let targetWindSubject: BehaviorSubject<number>;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<string>('standby');
    connectedSubject = new BehaviorSubject<boolean>(true);
    targetHeaderSubject = new BehaviorSubject<number>(0);
    targetWindSubject = new BehaviorSubject<number>(0);

    mockStore = {
      state$: stateSubject.asObservable(),
      isConnected$: connectedSubject.asObservable(),
      targetHeadingTrue$: targetHeaderSubject.asObservable(),
      targetHeadingMagnetic$: targetHeaderSubject.asObservable(),
      targetWindAngle$: targetWindSubject.asObservable(),
      setState: vi.fn(),
      adjustTarget: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [], 
      providers: [
        { provide: AutopilotStoreService, useValue: mockStore }
      ]
    })
    .overrideComponent(AutopilotConsoleComponent, {
      set: { imports: [CommonModule, DegreesPipe, MockAppButtonComponent] }
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

  it('should call setState("auto") when AUTO is clicked', () => {
    // AUTO is the first button in .mode-selector
    // Template:
    // <button class="mode-btn" ... (click)="store.setState('auto')">AUTO</button>
    
    // Find button by text content to be safe
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.mode-btn')) as HTMLButtonElement[];
    const autoBtn = buttons.find(b => b.textContent?.trim() === 'AUTO');
    
    expect(autoBtn).toBeTruthy();
    autoBtn?.click();
    expect(mockStore.setState).toHaveBeenCalledWith('auto');
  });

  it('should show STANDBY button when engaged', async () => {
    stateSubject.next('auto');
    fixture.detectChanges();
    await fixture.whenStable();

    // Standby button only appears when state !== standby
    // selector: .engage-btn
    const standbyBtn = fixture.nativeElement.querySelector('.engage-btn');
    expect(standbyBtn).toBeTruthy();
    expect(standbyBtn.textContent).toContain('STANDBY');
    
    standbyBtn.click();
    expect(mockStore.setState).toHaveBeenCalledWith('standby');
  });

  it('should hide controls when disconnected', async () => {
      connectedSubject.next(false);
      fixture.detectChanges();
      await fixture.whenStable();
      
      const console = fixture.nativeElement.querySelector('.ap-console');
      expect(console.classList.contains('disabled')).toBe(true);
  });
});
