declare module "page-flip" {
  export type PageFlipEvent = { data: number };

  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>);
    loadFromHTML(elements: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on(event: "flip", callback: (event: PageFlipEvent) => void): this;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    destroy(): void;
  }
}
