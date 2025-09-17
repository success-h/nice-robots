import { describe, it, expect } from 'vitest';
import { cn, parseApiResponse, parseStreamingResponse } from '../index';

describe('utils', () => {
  it('cn merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('parseApiResponse returns JSON when content-type is json', async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
    const data = await parseApiResponse(res);
    expect(data.ok).toBe(true);
  });

  it('parseApiResponse parses SSE stream and aggregates text', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\n'));
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Hello "}}]}\n' +
              'data: {"choices":[{"delta":{"content":"world"}}]}\n' +
              '\n'
          )
        );
        controller.close();
      },
    });
    const res = new Response(stream as any, {
      headers: { 'content-type': 'text/event-stream' },
    });
    const data = await parseApiResponse(res as any);
    expect(data.type).toBe('text');
    expect(data.data.text).toBe('Hello world');
  });

  it('parseStreamingResponse invokes onChunk for SSE content', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\n'));
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"A"}}]}\n' +
              'data: {"choices":[{"delta":{"content":"B"}}]}\n' +
              '\n'
          )
        );
        controller.close();
      },
    });
    const res = new Response(stream as any, {
      headers: { 'content-type': 'text/event-stream' },
    });
    const chunks: string[] = [];
    await parseStreamingResponse(
      res as any,
      (c) => chunks.push(c),
      () => {}
    );
    expect(chunks.join('')).toBe('AB');
  });
});


