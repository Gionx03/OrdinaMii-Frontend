import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const CART_TARGET_SELECTOR = '[data-cart-target]';

@Injectable({
  providedIn: 'root',
})
export class FlyToCart {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  animate(source: HTMLElement): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const window = this.document.defaultView;

    const target = this.document.querySelector<HTMLElement>(CART_TARGET_SELECTOR);

    if (!window || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    if (sourceRect.width === 0 || sourceRect.height === 0) {
      return;
    }

    const flyingElement = source.cloneNode(true) as HTMLElement;

    Object.assign(flyingElement.style, {
      position: 'fixed',
      zIndex: '1000',
      top: `${sourceRect.top}px`,
      left: `${sourceRect.left}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      margin: '0',
      overflow: 'hidden',
      border: '1px solid #e7ded2',
      borderRadius: '16px',
      backgroundColor: '#eee7dd',
      boxShadow: '0 14px 32px rgb(61 45 32 / 22%)',
      pointerEvents: 'none',
      transformOrigin: 'center center',
    });

    const clonedImage = flyingElement.querySelector<HTMLImageElement>('img');

    if (clonedImage) {
      Object.assign(clonedImage.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      });
    }

    flyingElement.setAttribute('aria-hidden', 'true');

    this.document.body.appendChild(flyingElement);

    const translateX =
      targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);

    const translateY =
      targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    const middleX = translateX * 0.55;
    const middleY = translateY * 0.42 - 80;

    const animation = flyingElement.animate(
      [
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1,
        },
        {
          transform: `translate(${middleX}px, ${middleY}px) scale(0.62)`,
          opacity: 0.9,
          offset: 0.55,
        },
        {
          transform: `translate(${translateX}px, ${translateY}px) scale(0.12)`,
          opacity: 0.15,
        },
      ],
      {
        duration: 720,
        easing: 'cubic-bezier(0.22, 0.8, 0.35, 1)',
        fill: 'forwards',
      },
    );

    animation.addEventListener(
      'finish',
      () => {
        flyingElement.remove();
        this.pulseTarget(target);
      },
      {
        once: true,
      },
    );

    animation.addEventListener('cancel', () => flyingElement.remove(), {
      once: true,
    });
  }

  private pulseTarget(target: HTMLElement): void {
    target.animate(
      [
        {
          transform: 'scale(1)',
        },
        {
          transform: 'scale(1.14)',
        },
        {
          transform: 'scale(1)',
        },
      ],
      {
        duration: 320,
        easing: 'ease-out',
      },
    );
  }
}
