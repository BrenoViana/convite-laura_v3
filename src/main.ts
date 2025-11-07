import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config'; // <-- Adicione esta linha para importar a configuração

// Angular 17+ standalone
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
