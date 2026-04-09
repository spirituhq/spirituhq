# spirituhq Website

This is nginx config i use for [spirituhq Website](https://spirituhq-production-484c.up.railway.app/):

```js
server {
    server_name spirituhq.vercel.app;

    location / {
        proxy_pass https://kahoot.it;
        proxy_set_header Host kahoot.it;
        proxy_ssl_server_name on;
        proxy_set_header Accept-Encoding "";
        sub_filter_once off;
        sub_filter '</body>' '<script src=""></script></body>';
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate ***hidden***; # managed by Certbot
    ssl_certificate_key ***hidden***; # managed by Certbot
    include ***hidden***; # managed by Certbot
    ssl_dhparam ***hidden***; # managed by Certbot

}
server {
    if ($host = spirituhq.vercel.app) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name spirituhq.vercel.app;
    return 404; # managed by Certbot
}
```
