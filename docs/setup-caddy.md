# Setup Caddy

> [!CAUTION]
> This is a reference material, not a complete guide. See [Caddy documentation](https://caddyserver.com/docs/quick-starts/https).

1. Set the domain's A record to point to the VPS's public IPv4 address.
2. Point Caddy to that domain by updating the default [Caddyfile](https://caddyserver.com/docs/caddyfile):

```shell
ssh nodejs@<tailscale-device-name>
```

```shell
cd /etc/caddy
rm -f Caddyfile
nano Caddyfile
```

```caddy
<your-domain.com> {
  reverse_proxy localhost:3000
}
```

```shell
systemctl enable --now caddy
```
