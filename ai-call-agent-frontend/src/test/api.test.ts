import { getApiBaseUrl } from '@/lib/api';

describe('api configuration', () => {
    const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    afterEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
    });

    it('reads NEXT_PUBLIC_API_BASE_URL from the environment', () => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

        expect(getApiBaseUrl()).toBe('https://api.example.com');
    });

    it('returns undefined when NEXT_PUBLIC_API_BASE_URL is not set', () => {
        delete process.env.NEXT_PUBLIC_API_BASE_URL;

        expect(getApiBaseUrl()).toBeUndefined();
    });
});
