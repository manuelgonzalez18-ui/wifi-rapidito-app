export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { path } = req.query;
    if (!path) {
        return res.status(400).json({ error: 'Path parameter is missing' });
    }

    // Determine the full URL
    // Wisphub seems to need a trailing slash for some endpoints
    const baseUrl = 'https://api.wisphub.app/api';

    // Ensure path has leading slash? No, baseURL has /api.
    // If path is "clientes", url is .../api/clientes
    // If path is "clientes/", url is .../api/clientes/

    const url = `${baseUrl}/${path}`;
    const apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

    try {
        console.log(`Proxying request to: ${url}`);

        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Authorization': `Api-Key ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
            const text = await response.text();
            console.error(`Upstream Error: ${response.status}`, text);
            return res.status(response.status).send(text);
        }

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return res.status(200).json(data);
        } else {
            const text = await response.text();
            return res.status(200).send(text);
        }

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
