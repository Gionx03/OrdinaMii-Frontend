import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-page',
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {}
