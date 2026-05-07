import { Routes } from '@angular/router';

import { SurveyViewResultsComponent } from './survey-view-results/survey-view-results.component';
import { HomeComponent } from './home/home.component';
import { CreateSurveyComponent } from './create-survey/create-survey.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'create-survey', component: CreateSurveyComponent },
  { path: 'survey-view-results/:pollId', component: SurveyViewResultsComponent },
  { path: 'survey-view-results', component: SurveyViewResultsComponent },
];
