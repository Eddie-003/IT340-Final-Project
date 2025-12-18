import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    this.error = '';
    this.success = '';

    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.http.post(`${environment.apiBaseUrl}/auth/register`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Account created! You can log in now.';
        setTimeout(() => this.router.navigate(['/login']), 600);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Registration failed.';
      }
    });
  }
}
