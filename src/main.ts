import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// Angular 17+ standalone
bootstrapApplication(AppComponent).catch(err => console.error(err));
