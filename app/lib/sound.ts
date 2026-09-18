/**
 * Sound feedback is intentionally disabled for Nova Paid.
 * The exported no-op functions keep existing interaction code simple while
 * guaranteeing that clicks never create audio or haptic side effects.
 */
export type SoundName =
  | "tap"
  | "pop"
  | "toggleOn"
  | "toggleOff"
  | "stepUp"
  | "stepDown"
  | "modalOpen"
  | "modalClose"
  | "success"
  | "failure"
  | "error";

const PREFERENCE_CHANGE_EVENT = "nova-pay-preference-change";

export function isSoundEnabled(): boolean {
  return false;
}

export function setSoundEnabled(_enabled: boolean): void {
  void _enabled;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
  }
}

export function toggleSound(): boolean {
  setSoundEnabled(false);
  return false;
}

export function playTap(): void {}
export function playPop(..._args: unknown[]): void { void _args; }
export function playToggle(..._args: unknown[]): void { void _args; }
export function playStep(..._args: unknown[]): void { void _args; }
export function playModalOpen(): void {}
export function playModalClose(): void {}
export function playSuccess(): void {}
export function playFailure(): void {}
export function playError(): void {}

export function getSoundWavDataUri(_name: SoundName): string {
  void _name;
  return "";
}
