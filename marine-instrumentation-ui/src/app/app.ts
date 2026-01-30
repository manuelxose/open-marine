import { Component } from '@angular/core';
import { AppShellComponent } from './ui/layout/app-shell/app-shell.component';
import { AppToastContainerComponent } from './shared/components/app-toast/app-toast-container/app-toast-container.component';
import { MOBAlertComponent } from './features/alarms/components/mob-alert/mob-alert.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent, AppToastContainerComponent, MOBAlertComponent],
  template: `
    <app-app-shell></app-app-shell>
    <app-mob-alert></app-mob-alert>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {}
