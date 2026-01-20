/**
 * Sound Manager - Generates notification sounds using Web Audio API
 * No external audio files needed - sounds are synthesized
 */

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.5;
    
    // Load preferences from localStorage
    this.loadPreferences();
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  loadPreferences() {
    try {
      const prefs = localStorage.getItem('soundPreferences');
      if (prefs) {
        const { enabled, volume } = JSON.parse(prefs);
        this.enabled = enabled ?? true;
        this.volume = volume ?? 0.5;
      }
    } catch (e) {
      console.warn('Failed to load sound preferences:', e);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('soundPreferences', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume
      }));
    } catch (e) {
      console.warn('Failed to save sound preferences:', e);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.savePreferences();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  /**
   * Play a tone with the given frequency and duration
   */
  playTone(frequency, duration, type = 'sine', gainValue = null) {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      const volume = gainValue ?? this.volume;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play tone:', e);
    }
  }

  /**
   * Success chime - Pleasant ascending arpeggio
   * Used for: Order created successfully
   */
  playSuccess() {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const duration = 0.15;

      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

          gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);
        }, i * 100);
      });
    } catch (e) {
      console.warn('Failed to play success sound:', e);
    }
  }

  /**
   * Sync completed - Gentle double chime
   * Used for: Offline sync completed
   */
  playSync() {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const notes = [880, 1108.73]; // A5, C#6 - harmonious interval

      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

          gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        }, i * 150);
      });
    } catch (e) {
      console.warn('Failed to play sync sound:', e);
    }
  }

  /**
   * Error sound - Descending minor tone
   * Used for: Error occurred
   */
  playError() {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const notes = [440, 349.23]; // A4, F4 - minor feel

      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

          gainNode.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
        }, i * 180);
      });
    } catch (e) {
      console.warn('Failed to play error sound:', e);
    }
  }

  /**
   * Low stock alert - Attention-grabbing pulse
   * Used for: Low stock warning
   */
  playLowStockAlert() {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      
      // Play two quick beeps
      [0, 200].forEach((delay) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(587.33, ctx.currentTime); // D5

          gainNode.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
        }, delay);
      });
    } catch (e) {
      console.warn('Failed to play low stock alert:', e);
    }
  }

  /**
   * Notification sound - General notification chime
   */
  playNotification() {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(830.61, ctx.currentTime); // G#5

      gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Failed to play notification:', e);
    }
  }

  /**
   * Test all sounds - useful for settings page
   */
  async testAllSounds() {
    this.playSuccess();
    await new Promise(r => setTimeout(r, 800));
    this.playSync();
    await new Promise(r => setTimeout(r, 600));
    this.playError();
    await new Promise(r => setTimeout(r, 600));
    this.playLowStockAlert();
  }
}

// Export singleton instance
const soundManager = new SoundManager();
export default soundManager;
