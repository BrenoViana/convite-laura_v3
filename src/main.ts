import { bootstrapApplication } from "@angular/platform-browser";
import { provideServiceWorker } from "@angular/service-worker";
import { provideHttpClient } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { environment } from "./environments/environment";

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideServiceWorker("ngsw-worker.js", {
      enabled: environment.production,
      registrationStrategy: "registerWhenStable:30000"
    })
  ]
}).catch(err => console.error(err));
