# Setup VPS

## Prerequisites

- Custom Domain
- [Vultr](https://www.vultr.com/) Account
- [Tailscale](https://tailscale.com/) Account and [Client](https://tailscale.com/download)

## Vultr Dashboard

### Add a firewall group

https://my.vultr.com/firewall/add

| Type | Action | Protocol    | Port      | Source    |
| ---- | ------ | ----------- | --------- | --------- |
| IPv4 | accept | TCP (HTTP)  | 80        | 0.0.0.0/0 |
| IPv4 | accept | TCP (HTTPS) | 443       | 0.0.0.0/0 |
| IPv4 | drop   | any         | 0 - 65535 | 0.0.0.0/0 |

> [!NOTE]
> Inbound SSH rule is not needed for Tailscale SSH.

### Deploy a server

https://my.vultr.com/deploy

| Item             | Value                         |
| ---------------- | ----------------------------- |
| Type             | Shared CPU                    |
| Location         | Any                           |
| Plan             | `vhf-1c-1gb` (High Frequency) |
| Operating System | Rocky Linux 10 x64            |
| Server Settings  | Firewall Group: `HTTP(S)`     |
| Server Hostname  | e.g. `nodejs-host`            |

Additional Features:

- Instance Connectivity / Instance(s) with Public IP / Public IPv4
- [Cloud-Init User Data](./cloud-init.yml)

### Setup SSH

[Open the web console](https://docs.vultr.com/vultr-web-console-faq) and set up [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh):

- Log in after the cloud-init is completed (takes several minutes)
- If the setup hangs, restart the server and check `cloud-init status`

```shell
root
Password: # see server details page's overview section

cloud-init status # status: done

# Connect VPS to Tailscale and run a Tailscale SSH server
# See https://tailscale.com/docs/reference/tailscale-cli/up

tailscale up --ssh

# Disable key expiry in the admin console
# See https://tailscale.com/docs/features/access-control/key-expiry
```

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
