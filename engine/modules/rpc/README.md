# rpc module

## Framing

Every message is UTF-8 JSON preceded by LSP-style headers:

```text
Content-Length: <number of bytes of the JSON body>\r\n
\r\n
<JSON body>
```

`read_message` accepts the header name in any case, ignores other headers, returns `nullopt` on a clean end of stream and throws `PvError(-32700)` on a bad header or a truncated body. `write_message` writes the header and the body and flushes.

## Dispatch

`handle_request(table, request)` turns one JSON-RPC 2.0 request into one response. Errors are mapped as follows:

| Error | JSON-RPC code |
| --- | --- |
| request not an object, wrong `jsonrpc`, missing `method` | -32600 |
| unknown method | -32601 |
| `pv::core::PvError` | its own code |
| `nlohmann::json` exception (bad params) | -32602 |
| any other `std::exception` | -32603 |

Requests without an `id` are notifications: the handler runs, but nothing is returned.

## Notifications

`StdioServer::notify(method, params)` writes a framed notification. It is thread-safe and may be called from any thread (for example from a background project loader). Modules only see the `Notifier` interface.

## Adding a method

In your module's `src/register.cpp`:

```cpp
reg.methods.add("ns.name", [&reg](const Json& p) { /* read params, return a Json result */ });
```
