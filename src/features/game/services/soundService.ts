
class SoundService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    // Placeholder URLs - in a real app these would be local assets or reliable CDNs
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Arcade retro jump
      wrong: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3', // Arcade retro game over
      tick: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Clock tick
      finish: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Success fanfare
      item: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Bonus earned
      join: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Pop
    };

    Object.entries(soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  play(soundName: 'correct' | 'wrong' | 'tick' | 'finish' | 'item' | 'join') {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.warn('Audio play failed', e));
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const soundService = new SoundService();
