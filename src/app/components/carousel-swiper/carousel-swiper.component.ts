import {
  Component, Input, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit,
  ElementRef, ViewChild, OnChanges, SimpleChanges
} from "@angular/core";
import { CommonModule } from "@angular/common";

type Fit = "auto" | "cover" | "contain";

@Component({
  selector: "carousel-swiper",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./carousel-swiper.component.html",
  styleUrls: ["./carousel-swiper.component.scss"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CarouselSwiperComponent implements AfterViewInit, OnChanges {
  /** Imagens absolutas ou relativas a /assets */
  @Input() images: string[] = [];

  /**
   * Como a imagem ocupa o espaço:
   *  - "auto": decide por slide (retrato usa contain; paisagem usa cover)
   *  - "cover": sempre cobre todo o quadro (pode recortar)
   *  - "contain": sempre inteira (pode sobrar bordas)
   */
  @Input() fit: Fit = "auto";

  /** (Opcional) razão do quadro (ex.: 16/9 = 1.777..., 4/3 = 1.333...) */
  @Input() aspect = 16 / 9;

  @ViewChild("swc", { static: true }) swc!: ElementRef<any>;
  private perImageFit: ("cover" | "contain")[] = [];

  ngAfterViewInit() { this.initSwiper(); }
  ngOnChanges(ch: SimpleChanges) {
    if (ch["images"]) setTimeout(() => this.initSwiper());
  }

  private initSwiper() {
    const el = this.swc?.nativeElement;
    if (!el) return;
    if (el.swiper) { try { el.swiper.update(); } catch {} return; }
    if (typeof el.initialize === "function") el.initialize();
  }

  /** Decide o fit da imagem quando ela carrega (temos naturalWidth/Height) */
  onImgLoad(ev: Event, index: number) {
    const img = ev.target as HTMLImageElement;
    if (!img) return;

    let fit: "cover" | "contain" = "cover";
    if (this.fit === "auto") {
      const naturalRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = this.aspect || 16 / 9;
      // se a imagem é mais “alta/estreita” que o quadro, preferir contain
      fit = naturalRatio < containerRatio ? "contain" : "cover";
    } else {
      fit = this.fit;
    }
    this.perImageFit[index] = fit;
  }

  getFitClass(index: number) {
    return this.perImageFit[index] === "contain" ? "img-contain" : "img-cover";
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    if (!img) return;
    // fallback leve embutido
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#FFF7FA'/><stop offset='100%' stop-color='#FFB7C5'/>
      </linearGradient></defs>
      <rect fill='url(#g)' width='100%' height='100%'/>
      <text x='50%' y='52%' font-family='Inter,Arial' font-size='40' text-anchor='middle' fill='#6a2240'>
        Foto não encontrada
      </text>
    </svg>`;
    img.onerror = null;
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  // srcset opcional (caso tenha gerado 640/960/1280)
  buildSrcSet(src: string): string | null {
    if (!src || /\.svg$/i.test(src)) return null;
    const m = src.match(/^(.*)\.(\w+)$/);
    const base = m ? m[1] : src; // ex.: assets/photos/01
    return `${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1280.webp 1280w`;
  }
  toAvif(srcset: string | null) { return srcset ? srcset.replace(/\.webp/g, ".avif") : null; }
  sizes() { return "(max-width: 1000px) 100vw, 1000px"; }
}
