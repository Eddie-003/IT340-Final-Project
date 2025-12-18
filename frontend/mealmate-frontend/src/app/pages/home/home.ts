import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MealsService, Meal } from '../../services/meals.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent implements OnInit {
  meals: Meal[] = [];
  loading = false;
  error = '';

  // form fields
  meal_text = '';
  calories: number | null = null;
  protein_g: number | null = null;
  carbs_g: number | null = null;
  fat_g: number | null = null;

  constructor(private mealsSvc: MealsService, private router: Router) {}

  ngOnInit(): void {
    this.loadMeals();
  }

  loadMeals() {
    this.error = '';
    this.loading = true;

    this.mealsSvc.getMeals().subscribe({
      next: (data) => {
        this.meals = data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load meals. Try logging in again.';
      },
    });
  }

  addMeal() {
    this.error = '';

    if (!this.meal_text || this.calories == null || this.protein_g == null || this.carbs_g == null || this.fat_g == null) {
      this.error = 'Fill out all fields.';
      return;
    }

    const payload: Meal = {
      meal_text: this.meal_text,
      calories: Number(this.calories),
      protein_g: Number(this.protein_g),
      carbs_g: Number(this.carbs_g),
      fat_g: Number(this.fat_g),
    };

    this.mealsSvc.addMeal(payload).subscribe({
      next: () => {
        // reset form
        this.meal_text = '';
        this.calories = this.protein_g = this.carbs_g = this.fat_g = null;
        this.loadMeals();
      },
      error: () => {
        this.error = 'Failed to add meal.';
      },
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
