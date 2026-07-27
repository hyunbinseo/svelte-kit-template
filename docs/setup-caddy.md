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
micro Caddyfile
```

> [!NOTE]
> Since the output directory changes with each build, Caddy's static file serving cannot be used. The generated `handler` function sets appropriate caching headers for Vite hashed assets instead.

> [!IMPORTANT]
> Remove any pattern that collides with a real route or file.

```caddy
(defaults) {
	encode zstd gzip

	@denied-database path *.db *.dump *.sql *.sqlite *.sqlite3
	@denied-dotpaths {
		path */.*
		not path /.well-known/*
	}
	@denied-misc path *.bak *.ico *.ini *.log *.map *.orig *.php *.phtml *.py *.rb *.swp *.tmp
	@denied-secrets path *.crt *.env *.env.* *.htpasswd *.key *.p12 *.p8 *.pem *.pfx *.tfstate *.tfvars
	@denied-system path /bin/* /etc/* /opt/* /proc/* /root/* /srv/* /sys/* /tmp/* /usr/* /var/* /www/*

	respond /wp-* 410
	respond @denied-database 410
	respond @denied-dotpaths 410
	respond @denied-misc 410
	respond @denied-secrets 410
	respond @denied-system 410
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
