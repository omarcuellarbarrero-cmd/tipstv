FROM php:8.4-fpm-alpine

RUN apk add --no-cache nginx curl

COPY . /usr/share/nginx/html

COPY nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]
