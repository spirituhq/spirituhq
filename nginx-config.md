# Version HTTPS (celle que tu as sur vercel/railway)
server {
    server_name spirituhq.vercel.app;

    location / {
        proxy_pass https://kahoot.it;
        proxy_set_header Host kahoot.it;
        proxy_ssl_server_name on;
        proxy_set_header Accept-Encoding "";

        sub_filter_once off;
        sub_filter_types *;

        # INJECTION SANS CDN
        sub_filter '</body>' '<script src="https://raw.githubusercontent.com/spirituhq/spirituhq/main/spirituhq.user.js"></script></body>';
    }

    listen 443 ssl;
    ssl_certificate ***hidden***;
    ssl_certificate_key ***hidden***;
    include ***hidden***;
    ssl_dhparam ***hidden***;
}

server {
    if ($host = spirituhq.vercel.app) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name spirituhq.vercel.app;
    return 404;
}
