import { PrismOtpInput } from './otp-input.js';

if (!customElements.get('prism-otp-input'))
  customElements.define('prism-otp-input', PrismOtpInput);

declare global {
  interface HTMLElementTagNameMap {
    'prism-otp-input': PrismOtpInput;
  }
}
