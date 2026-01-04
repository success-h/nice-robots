import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseApiResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  console.log('Content-Type:', contentType);

  if (contentType?.includes('text/event-stream')) {
    console.log('Detected SSE stream');
    try {
      if (!response.body) {
        throw new Error('No response body available for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullMessage = '';
      let eventType = null;
      let errorData = null;
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Check for SSE event type
            if (trimmedLine.startsWith('event: ')) {
              eventType = trimmedLine.substring(7);
            } else if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.substring(6).trim();
              if (jsonStr && jsonStr !== '[DONE]' && jsonStr !== 'null') {
                try {
                  const parsed = JSON.parse(jsonStr);

                  // Check if this is an error event
                  if (eventType === 'error' || parsed.error) {
                    errorData = parsed;
                  } else {
                    // Regular message parsing
                    if (parsed.choices?.[0]?.delta?.content) {
                      fullMessage += parsed.choices[0].delta.content;
                    } else if (parsed.content) {
                      fullMessage += parsed.content;
                    } else if (parsed.text) {
                      fullMessage += parsed.text;
                    }
                  }
                } catch (parseError) {
                  console.log('Error parsing SSE chunk:', parseError);
                }
              }
            } else if (trimmedLine.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmedLine);
                if (parsed.choices?.[0]?.delta?.content) {
                  fullMessage += parsed.choices[0].delta.content;
                }
              } catch (parseError) {
                console.log('Error parsing direct JSON:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Return error state if we detected an error
      if (errorData) {
        return {
          data: errorData,
          type: 'error',
        };
      }

      // Return regular text response
      return {
        data: {
          text: fullMessage,
        },
        type: 'text',
      };
    } catch (error) {
      console.log('Error reading stream:', error);
      throw error;
    }
  } else {
    // Handle regular JSON response
    return await response.json();
  }
};

// Alternative streaming function for real-time processing
export const parseStreamingResponse = async (
  response: Response,
  onChunk: (chunk: string) => void,
  onError: (error: any) => void
) => {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('text/event-stream')) {
    return await response.json();
  }

  if (!response.body) {
    throw new Error('No response body available for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let eventType = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check for SSE event type
        if (trimmedLine.startsWith('event: ')) {
          eventType = trimmedLine.substring(7);
        } else if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.substring(6).trim();
          if (jsonStr && jsonStr !== '[DONE]' && jsonStr !== 'null') {
            try {
              const parsed = JSON.parse(jsonStr);

              // Check if this is an error event
              if (eventType === 'error' || parsed.error) {
                onError(parsed);
                return;
              } else {
                // Regular message parsing - call onChunk for each piece
                let content = '';
                if (parsed.choices?.[0]?.delta?.content) {
                  content = parsed.choices[0].delta.content;
                } else if (parsed.content) {
                  content = parsed.content;
                } else if (parsed.text) {
                  content = parsed.text;
                }

                if (content) {
                  onChunk(content);
                }
              }
            } catch (parseError) {
              console.log('Error parsing SSE chunk:', parseError);
            }
          }
        } else if (trimmedLine.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmedLine);
            if (parsed.choices?.[0]?.delta?.content) {
              onChunk(parsed.choices[0].delta.content);
            }
          } catch (parseError) {
            console.log('Error parsing direct JSON:', parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

/**
 * Inserts Cloudinary transformations into a Cloudinary URL.
 * If the URL is not a Cloudinary `image/upload` URL, returns the original URL.
 *
 * @param url  Original image URL
 * @param width Optional target width (px)
 * @param opts  Optional flags (e.g., { fill: true } to add c_fill,g_auto)
 */
export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  width?: number,
  opts: { fill?: boolean } = {}
): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return String(url);
  }

  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);

  const parts: string[] = ['f_auto', 'q_auto'];
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
    parts.push(`w_${Math.floor(width)}`);
  }
  if (opts?.fill) {
    parts.push('c_fill', 'g_auto');
  }

  // Avoid duplicating transforms if they already exist
  if (after.startsWith('f_auto') || after.startsWith('q_auto') || /\/[a-z]+_/.test(after)) {
    return url;
  }

  const out = `${before}${parts.join(',')}/${after}`;
  return out;
}
