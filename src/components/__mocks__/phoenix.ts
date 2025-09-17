type Callback = (...args: any[]) => void;

export class Socket {
  private handlers: Record<string, Callback[]> = {};
  constructor(public url: string, public opts?: any) {}
  connect() { this.emit('open'); }
  disconnect() { this.emit('close'); }
  onOpen(cb: Callback) { this.on('open', cb); }
  onClose(cb: Callback) { this.on('close', cb); }
  onError(cb: Callback) { this.on('error', cb); }
  on(event: string, cb: Callback) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(cb);
  }
  emit(event: string, ...args: any[]) {
    (this.handlers[event] || []).forEach((cb) => cb(...args));
  }
  channel(topic: string) { return new Channel(topic, this); }
}

class Channel {
  private events: Record<string, Callback[]> = {};
  constructor(public topic: string, private socket: Socket) {}
  on(event: string, cb: Callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  }
  trigger(event: string, payload: any) {
    (this.events[event] || []).forEach((cb) => cb(payload));
  }
  join() {
    return {
      receive: (status: 'ok' | 'error', cb: Callback) => {
        if (status === 'ok') cb({});
        return this.join();
      },
    } as any;
  }
  leave() {}
}

export default { Socket } as any;


