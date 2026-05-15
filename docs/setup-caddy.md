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
(defaults) {
	# NOTE this named matcher matches /.well-known/* as well
	@denied-root path /.* /wp-admin* /wp-content* /wp-includes*
	@denied-database path *.db *.dump *.sql *.sqlite *.sqlite3
	@denied-secrets path *.crt *.env *.env.* *.htpasswd *.key *.p12 *.p8 *.pem *.pfx
	@denied-misc path *.bak *.ico *.ini *.log *.map *.orig *.php *.swp *.tmp

	respond @denied-root 410
	respond @denied-database 410
	respond @denied-secrets 410
	respond @denied-misc 410

	encode
}

<your-domain.com> {
	import defaults
	reverse_proxy localhost:3000
}
```

```shell
caddy validate
systemctl enable --now caddy
systemctl restart caddy
```
