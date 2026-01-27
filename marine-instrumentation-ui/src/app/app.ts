import { Component } from '@angular/core';
import { AppShellComponent } from './ui/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent],
  template: '<app-app-shell></app-app-shell>',
})
export class AppComponent {}
