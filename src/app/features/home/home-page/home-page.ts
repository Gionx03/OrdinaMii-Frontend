import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly heroImageUrl =
    `${environment.apiBaseUrl.replace(/\/+$/, '')}` + '/images/dishes/tagliata-di-manzo.jpg';
}
