import { Routes } from '@angular/router';

import { CreateSurveyComponent } from './create-survey/create-survey.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'create', component: CreateSurveyComponent },
];
