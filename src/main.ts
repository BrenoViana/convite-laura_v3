import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { AppComponent } from "./app/app.component";

// Swiper Web Components
import { register } from "swiper/element/bundle";
try { register(); } catch {}

bootstrapApplication(AppComponent, {
  providers: [provideAnimations(), provideRouter([])]
}).catch(err => console.error(err));
