# Setup VPS

## Prerequisites

- Custom Domain
- [Vultr](https://www.vultr.com/) Account
- [Tailscale](https://tailscale.com/) Account and [Client](https://tailscale.com/download)

## Vultr Console

### Create a firewall group

https://console.vultr.com/firewall

| Type | Action | Protocol    | Port      | Source    |
| ---- | ------ | ----------- | --------- | --------- |
| IPv4 | accept | TCP (HTTP)  | 80        | 0.0.0.0/0 |
| IPv4 | accept | TCP (HTTPS) | 443       | 0.0.0.0/0 |
| IPv4 | drop   | any         | 0 - 65535 | 0.0.0.0/0 |

> [!NOTE]
> Inbound SSH rule is not needed for Tailscale SSH.

### Deploy a server

https://console.vultr.com/deploy

| Item             | Value                         |
| ---------------- | ----------------------------- |
| Plan             | Shared CPU                    |
| Plan Selection   | `vhf-1c-1gb` (High Frequency) |
| Location         | Any                           |
| Operating System | Rocky Linux 10 x64            |
| Server Settings  | Firewall Group: `HTTP(S)`     |
| Server Hostname  | e.g. `nodejs-host`            |

> [!NOTE]
> 1 vCPU results in maximum 1 cluster instance, causing brief downtime during `pm2 reload` (build switch, etc.)

Additional Features:

- Instance Connectivity / Instance(s) with Public IP / Public IPv4
- [Cloud-Init User Data](./cloud-init.yml)

### Setup SSH

[Open the web console](https://docs.vultr.com/vultr-web-console-faq) and set up [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh):

- Log in after the cloud-init is completed (takes several minutes)
- If the setup hangs, restart the server and check `cloud-init status`

```shell
root
Password: # see instance page's overview section

cloud-init status # status: done

# Connect VPS to Tailscale and run a Tailscale SSH server
# See https://tailscale.com/docs/reference/tailscale-cli/up

tailscale up --ssh

# Disable key expiry in the admin console
# See https://tailscale.com/docs/features/access-control/key-expiry
```

> [!NOTE]
> Tailscale SSH is configured with a [default policy](https://tailscale.com/docs/features/tailscale-ssh). This lets any user connect to their own devices in check mode as a root or non-root user. This is why `root` and `nodejs` are both reachable without further configuration. If the tailnet has multiple members, narrow the `ssh` rule to restrict who can reach `root` on this server.

## Local Terminal

SSH into the server and clone the SvelteKit project.

> [!NOTE]
> Authenticate using [GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys#deploy-keys) to allow single repository readonly access.

```shell
ssh nodejs@<tailscale-ip>
ssh nodejs@<tailscale-device-name> # if MagicDNS is enabled
```

```shell
git clone <source> <name>
cd ~/<name>
```

[Continue Setup](./setup-node.md)
