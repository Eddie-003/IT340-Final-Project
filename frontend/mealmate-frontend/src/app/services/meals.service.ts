import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Meal {
  id?: number;
  meal_text: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class MealsService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getMeals() {
    return this.http.get<Meal[]>(`${this.base}/meals`);
  }

  addMeal(meal: Meal) {
    return this.http.post(`${this.base}/meals`, meal);
  }
}
