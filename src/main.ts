import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { RsvpHostComponent } from "./app/rsvp-host.component";

bootstrapApplication(AppComponent).catch(err => console.error(err));
bootstrapApplication(RsvpHostComponent).catch(err => console.error(err));