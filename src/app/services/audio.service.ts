import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { tap, catchError, EMPTY, Subject, switchAll, Observable, delayWhen, retryWhen, timer, of } from 'rxjs';
import { environment } from '../../environments/environment';
export const WS_ENDPOINT = environment.wsEndpoint;
export const RECONNECT_INTERVAL = environment.reconnectInterval;


@Injectable({
  providedIn: 'root',
})

export class AudioService {

  private audioContext: AudioContext;
  private audioBufferSourceNode: AudioBufferSourceNode | null = null;
  private audioStreamSubject: Subject<ArrayBuffer> = new Subject<ArrayBuffer>();

  constructor(private http: HttpClient) {
    this.audioContext = new AudioContext();
    this.audioBufferSourceNode = null;
  }

  getSongs(): Observable<string[]> {
    return this.http.get<string[]>(environment.endPoint + 'songs');
  }

  getAudioStream(songName: string) {
    return this.http.get(`${environment.endPoint}stream_audio/` + songName, {
      responseType: 'arraybuffer', // Specify response type as array buffer
    });
  }
}
