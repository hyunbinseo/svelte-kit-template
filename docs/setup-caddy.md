# Setup Caddy

> [!CAUTION]
> This is a reference material, not a complete guide. See [Caddy documentation](https://caddyserver.com/docs/quick-starts/https).

1. Set the domain's A record to point to the VPS's public IPv4 address.
2. Point Caddy to that domain by updating the default [Caddyfile](https://caddyserver.com/docs/caddyfile):

```shell
ssh root@<tailscale-device-name>
```

```shell
cd /etc/caddy
rm -f Caddyfile
nano Caddyfile
```

> [!NOTE]
> Since the output directory changes with each build, Caddy's static file serving cannot be used. The generated `handler` function sets appropriate caching headers for Vite hashed assets instead.

```caddy
(deny) {
  # NOTE this matches /.well-known/* paths as well
  @denied-dir path /.* /wp-admin* /wp-content* /wp-includes*
  @denied-ext path *.bak *.env *.env.* *.ico *.php *.sql *.swp
  respond @denied-dir 404
  respond @denied-ext 404
}

<your-domain.com> {
  import deny
  reverse_proxy localhost:3000
}
```

```shell
systemctl enable --now caddy
# systemctl restart caddy
```
