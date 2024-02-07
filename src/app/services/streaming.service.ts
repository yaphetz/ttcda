import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, of, Subject, timer } from 'rxjs';
import { catchError, retryWhen, delayWhen, tap, switchAll, share } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { queueScheduler } from 'rxjs';


export const WS_ENDPOINT = environment.wsEndpoint;
export const RECONNECT_INTERVAL = environment.reconnectInterval;

@Injectable({
    providedIn: 'root',
})
export class AudioStreamingService {
    private audioContext!: AudioContext;
    private audioBufferSourceNode: AudioBufferSourceNode | null = null;
    private audioStreamSubject: Subject<ArrayBuffer> = new Subject<ArrayBuffer>();
    private socket$: WebSocketSubject<any> | undefined;
    private reconnecting$: Observable<any> | undefined;

    constructor() {
        this.audioBufferSourceNode = null;
    }

    public initAudioContext() {
        this.audioContext = new AudioContext();
    }

    public connect(): Observable<any> {
        if (!this.socket$ || this.socket$.closed) {
            this.socket$ = this.getNewWebSocket();
            this.reconnecting$ = this.reconnect(this.socket$);

            // Share the observable to avoid multiple subscriptions
            this.reconnecting$ = this.reconnecting$.pipe(share());

            this.reconnecting$.subscribe(
                (res) => {
                    console.log(res)
                    console.log('[AudioStreamingService]: Reconnecting...');
                },
                (error) => {
                    console.error('[AudioStreamingService]: WebSocket error:', error);
                }
            );

            return this.reconnecting$;
        }
        return this.reconnecting$ ?? of(null);
    }

    private getNewWebSocket(): WebSocketSubject<any> {
        return webSocket<ArrayBuffer>({
            deserializer: ({ data }) => data,
            binaryType: 'arraybuffer',
            url: WS_ENDPOINT,
            openObserver: {
                next: () => {
                    console.log('[AudioStreamingService]: WebSocket connection opened');
                },
            },
            closeObserver: {
                next: () => {
                    console.log('[AudioStreamingService]: WebSocket connection closed');
                },
            },
        });
    }

    private reconnect(observable: Observable<WebSocketSubject<any>>): Observable<WebSocketSubject<any>> {
        return observable.pipe(
            retryWhen((errors) =>
                errors.pipe(
                    tap((val) => console.log('[AudioStreamingService]: Try to reconnect', val)),
                    delayWhen(() => timer(RECONNECT_INTERVAL))
                )
            )
        );
    }

    private audioBufferQueue: ArrayBuffer[] = [];
    private isPlaying = false;


    

    playAudioChunk(audioChunk: ArrayBuffer): void {
        this.audioBufferQueue.push(audioChunk); // Queue the incoming audio chunk

        if (!this.isPlaying) {
            this.playNextChunk();
        }
    }

    private playNextChunk(): void {
        if (this.audioBufferQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const nextChunk = this.audioBufferQueue.shift(); // Remove the next chunk to play

        this.audioContext.decodeAudioData(nextChunk!, (buffer) => {
            if (this.audioBufferSourceNode) {
                this.audioBufferSourceNode.disconnect();
            }

            this.audioContext.currentTime;
            this.audioBufferSourceNode = this.audioContext.createBufferSource();
            this.audioBufferSourceNode.buffer = buffer;
            this.audioBufferSourceNode.connect(this.audioContext.destination);
            this.audioBufferSourceNode.onended = () => {
                this.playNextChunk(); // When one chunk ends, play the next
            };
            this.audioBufferSourceNode.start();
        }, (error) => {
            console.error('Error decoding audio data:', error);
            this.isPlaying = false; // In case of error, allow new chunks to attempt to play
        });
    }

    public close(): void {
        if (this.socket$) {
            this.socket$.complete();
        }
    }

    public sendStartMessage(song: string): void {
        if (this.socket$) {
            this.socket$.next(`start#${song}`);
        }
    }
}
