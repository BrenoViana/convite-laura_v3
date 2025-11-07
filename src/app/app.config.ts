// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http'; // Provavelmente você precisará disso, se HttpClientModule não for suficiente.

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient() // <-- Adicione isso para fornecer HttpClient
  ]
};
