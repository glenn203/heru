import { HeruOtpInput } from './otp-input.js';

if (!customElements.get('heru-otp-input'))
  customElements.define('heru-otp-input', HeruOtpInput);

declare global {
  interface HTMLElementTagNameMap {
    'heru-otp-input': HeruOtpInput;
  }
}
