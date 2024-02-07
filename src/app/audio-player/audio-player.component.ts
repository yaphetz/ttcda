import { Component } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { Observable, Subject, bufferTime, delay, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { AudioStreamingService } from '../services/streaming.service';


@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.component.html',
  imports: [CommonModule, MatListModule, MatSliderModule, FormsModule],
  standalone: true,
  styleUrls: ['./audio-player.component.scss'],
})

export class AudioPlayerComponent {
  constructor(public audioStreamingService: AudioStreamingService, private songsService: AudioService) { }
  private audioContext: AudioContext | null = null;
  public songs$ = this.songsService.getSongs();
  public currentSong: string | null = 'Billie-Eilish-khalid-lovely.mp3';

  audioDataQueue = new Subject();

  ngOnInit(): void {
    this.audioStreamingService.connect().subscribe((res) => {

      if (res instanceof ArrayBuffer) {
        this.audioStreamingService.playAudioChunk(res);
      }
    });

  }

  ngOnDestroy(): void {
    // Make sure to close the WebSocket and audio resources when the component is destroyed
    this.audioStreamingService.close();
  }

  public play(song: string) {
    this.audioStreamingService.initAudioContext();
    this.audioStreamingService.sendStartMessage(song);
  }

}
