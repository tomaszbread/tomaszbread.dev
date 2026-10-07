import { Component, signal } from '@angular/core';

// rok rozpoczecia pracy komercyjnej - od niego liczy sie staz w sekcji "about me"
const CAREER_START_YEAR = 2016;

// Formularz kontaktowy wysyla wiadomosc przez Web3Forms - strona stoi na statycznym
// hostingu, wiec maila musi nadac usluga. Klucz jest publiczny z zalozenia: pozwala
// tylko dostarczyc wiadomosc na adres przypisany do konta, niczego nie odczytuje.
const CONTACT_ENDPOINT = 'https://api.web3forms.com/submit';
const CONTACT_ACCESS_KEY = '86e79b8f-9673-4e9c-a780-41967d83e418';

type ContactStatus = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly yearsOfExperience = new Date().getFullYear() - CAREER_START_YEAR;
  readonly contactStatus = signal<ContactStatus>('idle');

  async sendMessage(event: Event, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (this.contactStatus() === 'sending') {
      return;
    }

    const data = new FormData(form);
    // pole-pulapka jest niewidoczne dla ludzi; zaznacza je tylko automat
    if (data.get('botcheck')) {
      return;
    }

    const name = String(data.get('name') ?? '').trim();
    this.contactStatus.set('sending');
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: CONTACT_ACCESS_KEY,
          subject: `Message from ${name} via tomaszchlebek.dev`,
          from_name: 'tomaszchlebek.dev',
          name,
          email: String(data.get('email') ?? '').trim(),
          message: String(data.get('message') ?? '').trim()
        })
      });
      const result: { success?: boolean } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error('Web3Forms rejected the message');
      }
      form.reset();
      this.contactStatus.set('sent');
    } catch {
      this.contactStatus.set('error');
    }
  }
}
