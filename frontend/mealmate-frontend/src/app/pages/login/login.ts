import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  mfaCode = '';

  mfaRequired = false;
  tempToken = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.error = '';
    this.loading = true;

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.mfa_required) {
          this.mfaRequired = true;
          this.tempToken = res.temp_token;
          return;
        }

        if (res?.token) {
          this.auth.setToken(res.token);
          this.router.navigateByUrl('/home');
          return;
        }

        this.error = 'Unexpected login response.';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Login failed.';
      },
    });
  }

  onVerifyMfa() {
    this.error = '';
    this.loading = true;

    this.auth.verifyMfa(this.tempToken, this.mfaCode.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.token) {
          this.auth.setToken(res.token);
          this.router.navigateByUrl('/home');
        } else {
          this.error = 'Invalid MFA response.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'MFA verify failed.';
      },
    });
  }
}
