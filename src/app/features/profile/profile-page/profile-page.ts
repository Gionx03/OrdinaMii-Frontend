import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { APP_ROLE } from '../../../core/auth/app-role';
import { USER_ROLE_LABELS, UserProfile } from '../profile';
import { ProfileApi } from '../profile-api';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly profileApi = inject(ProfileApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly roleLabels = USER_ROLE_LABELS;

  readonly profileForm = new FormGroup({
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly phoneControl = this.profileForm.controls.phone;

  readonly canEditPhone = computed(() => this.profile()?.role === APP_ROLE.CLIENTE);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.profile.set(null);

    this.profileApi
      .getProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);

          this.profileForm.reset({
            phone: profile.phone ?? '',
          });
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento del profilo.', error);

          this.loadError.set('Non è stato possibile caricare i dati del profilo.');
        },
      });
  }

  saveProfile(): void {
    if (!this.canEditPhone() || this.saving()) {
      return;
    }

    const phone = this.phoneControl.value.trim();

    if (!phone) {
      this.phoneControl.setErrors({
        required: true,
      });

      this.phoneControl.markAsTouched();
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.successMessage.set(null);

    this.profileApi
      .updateProfile({ phone })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (updatedProfile) => {
          this.profile.set(updatedProfile);

          this.profileForm.reset({
            phone: updatedProfile.phone ?? '',
          });

          this.successMessage.set('Numero di telefono aggiornato.');
        },
        error: (error: unknown) => {
          console.error('Errore durante il salvataggio del profilo.', error);

          this.saveError.set('Non è stato possibile aggiornare il numero di telefono.');
        },
      });
  }
}
