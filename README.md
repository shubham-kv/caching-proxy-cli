
CLI tool to locally cache API responses with file based caching strategy.

## Installation

Install the package globally with a node package manager.

```bash
npm i --global @shubhamkv/caching-proxy-cli
```

## How to use

### Starting the server

Use the `start` command to start the proxy caching server, it requires the `url`
of the origin server and a `port` number for the proxy server:

```bash
caching-proxy start https://example.com -p 4000
```

This will start the caching proxy server on the specified port & cache the
responses.

### Stopping the server

Closing the terminal should stop the running proxy server.

### Clearing the proxy cache

Use the `clear-cache` command to clear the entire cache of the proxy server:

```bash
caching-proxy clear-cache
```

## Credits

Thanks to [Roadmap.sh | Caching Proxy CLI](https://roadmap.sh/projects/caching-server).
