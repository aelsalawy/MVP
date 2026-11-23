/**
 * T3.2: Unit tests for OCR JSON parser (FR-2.2).
 *
 * Tests the parseReceipt function from functions/src/ocr.ts with mocked provider output.
 * No real API calls in tests.
 */

import { parseReceipt } from '../src/ocr';

describe('parseReceipt (T3.2, FR-2.2)', () => {
  const mockApiKey = 'test-api-key';
  const mockImageUrl = 'gs://test-bucket/receipts/test-uid/test-entry.jpg';

  describe('parseReceipt - successful parsing', () => {
    test('parses valid GPT-4o-mini JSON response with maintenance receipt', async () => {
      const mockResponse = {
        provider: 'AutoZone',
        date: '2024-03-15',
        total: 124.50,
        currency: 'USD',
        lineItems: [
          { desc: 'Oil Change', price: 49.99 },
          { desc: 'Filter', price: 34.50 },
          { desc: 'Transmission Fluid', price: 40.02 },
        ],
        serviceType: 'maintenance',
      };

      // Mock the OpenAI client
      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockResponse),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe('AutoZone');
      expect(result?.date).toBe('2024-03-15');
      expect(result?.total).toBe(124.50);
      expect(result?.currency).toBe('USD');
      expect(result?.lineItems).toHaveLength(3);
      expect(result?.lineItems[0].desc).toBe('Oil Change');
      expect(result?.lineItems[0].price).toBe(49.99);
      expect(result?.serviceType).toBe('maintenance');

      // Cleanup
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });

    test('parses fuel receipt with different currency', async () => {
      const mockResponse = {
        provider: 'Shell',
        date: '2024-03-16',
        total: 45.75,
        currency: 'EUR',
        lineItems: [
          { desc: 'Fuel', price: 45.75 },
        ],
        serviceType: 'fuel',
      };

      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockResponse),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);

      expect(result).not.toBeNull();
      expect(result?.currency).toBe('EUR');
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });

    test('parses receipt with no line items', async () => {
      const mockResponse = {
        provider: 'Service Station',
        date: '2024-03-17',
        total: 25.00,
        currency: 'USD',
        lineItems: [],
        serviceType: 'other',
      };

      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockResponse),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);

      expect(result).not.toBeNull();
      expect(result?.lineItems).toHaveLength(0);
      expect(result?.serviceType).toBe('other');
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });
  });

  describe('parseReceipt - error handling', () => {
    test('returns null when API key is not configured', async () => {
      await expect(parseReceipt(mockImageUrl, '')).resolves.toBeNull();
    });

    test('returns null when image URL is empty', async () => {
      await expect(parseReceipt('', mockApiKey)).resolves.toBeNull();
    });

    test('returns null when GPT-4o-mini returns no content', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: null,
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);
      expect(result).toBeNull();
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });

    test('returns null when GPT-4o-mini content is invalid JSON', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: 'This is not valid JSON',
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);
      expect(result).toBeNull();
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });

    test('returns null when GPT-4o-mini returns invalid structure (missing provider)', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      date: '2024-03-15',
                      total: 100,
                      currency: 'USD',
                      lineItems: [],
                    }),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);
      expect(result).toBeNull();
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });

    test('returns null when GPT-4o-mini returns invalid structure (missing total)', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      provider: 'Test',
                      date: '2024-03-15',
                      currency: 'USD',
                      lineItems: [],
                    }),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);
      expect(result).toBeNull();
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });
  });

  describe('parseReceipt - currency normalization', () => {
    test('normalizes currency to uppercase', async () => {
      const mockResponse = {
        provider: 'Test',
        date: '2024-03-15',
        total: 100,
        currency: 'usd', // lowercase
        lineItems: [],
      };

      const mockClient = {
        chat: {
          completions: {
            create: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockResponse),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as any;

      // @ts-ignore
      const originalCreate = (globalThis as unknown as { OpenAI: any }).OpenAI;
      // @ts-ignore
      (globalThis as unknown as { OpenAI: any }).OpenAI = jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockClient.chat.completions.create()),
          },
        },
      })) as any;

      const result = await parseReceipt(mockImageUrl, mockApiKey);
      expect(result?.currency).toBe('USD');
      // @ts-ignore
      delete (globalThis as unknown as { OpenAI: any }).OpenAI;
    });
  });

  // Cleanup mock after all tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
