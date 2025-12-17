import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>MealMate Frontend</h1>
    <button (click)="checkHealth()">Test API Health</button>
    <pre>{{ result | json }}</pre>
  `
})
export class AppComponent {
  result: any;

  constructor(private api: ApiService) {}

  checkHealth() {
    this.api.health().subscribe({
      next: res => this.result = res,
      error: err => this.result = err
    });
  }
}
