import axios from 'axios';
import MockAdapter from './mock';

const USE_MOCK = false; // Toggle this to switch between Real and Mock API

const api = axios.create({
    baseURL: 'https://wifirapidito.com/', // CORRECTO: Usamos el servidor real para la APK y el portal
});

// Interceptor Mágico para enrutar a los Proxies PHP
api.interceptors.request.use((config) => {
    // Si la petición va a /facturas/, la desviamos al proxy_invoices.php
    if (config.url.startsWith('/facturas/')) {
        // Extract ID from path if present (e.g., /facturas/5561/)
        const parts = config.url.split('?')[0].split('/');
        const pathId = parts[2]; // parts = ["", "facturas", "5561", ""] -> 5561

        const originalUrl = new URL(config.url, 'http://dummy.com');
        const params = originalUrl.searchParams;

        // If we have an ID in the path but no search/cliente param, inject it
        if (pathId && pathId !== '' && !params.has('search') && !params.has('cliente')) {
            params.set('search', pathId);
        }

        config.url = `proxy_invoices.php?${params.toString()}`;
    }

    // Si la petición va a /tickets/, la desviamos al proxy.php
    if (config.url.includes('/tickets/')) {
        const parts = config.url.split('?');
        const params = parts.length > 1 ? '?' + parts[1] : '';
        config.url = `proxy.php${params}`;
        console.log("Interceptor: Routing to proxy.php", config.url);
    }

    // Para promesas de pago, enviamos a proxy_promises.php
    if (config.url.startsWith('/promesas-de-pago/')) {
        const originalUrlP = new URL(config.url, 'http://dummy.com');
        const paramsP = originalUrlP.search;
        config.url = `proxy_promises.php${paramsP}`;
    }

    return config;
});

export default api;
