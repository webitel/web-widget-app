# web-widget

Webitel chat widget for customer sites. Two npm packages in one repo:

| Package | What it is |
| --- | --- |
| `@webitel/web-widget-core` | Chat client without UI: auth, connection, messages, history, variables. No runtime dependencies |
| `@webitel/web-widget-ui` | `<webitel-chat>` chat window. Uses core only through its public API. Built by a separate developer; for now a stub for testing core |

A customer who builds their own UI takes only core.

## Usage

```ts
import { createClient } from '@webitel/web-widget-core';
import { defineWebitelChat } from '@webitel/web-widget-ui';

const client = createClient({
	baseUrl: 'https://example.webitel.com',
	channelId: 'your-widget-channel',
	auth: { getToken: () => fetchTokenFromYourBackend() },
});

await client.variables.set({ language: 'uk', cart: '3' });
await client.connect();

client.subscribe(() => render(client.getSnapshot()));
await client.messages.send('Hello');

// or the ready-made window
defineWebitelChat();
document.querySelector('webitel-chat').client = client;

// when the client logs out on the site
client.reset();
```

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
npm run lint
npm run dev:example
```

Both packages share one version. Build order follows `workspaces` in `package.json`: core first, then ui.

`npm run dev:example` opens a test page backed by [MSW](https://mswjs.io) mocks of the IM API and the `/ws/im` socket (`mocks/`). The same handlers work in Node through `msw/node`. From the console, `mockServer.operatorSays('text')` sends an operator message and `mockServer.dropConnection()` drops the socket to check reconnect and catch-up. MSW needs Service Worker support, so open the page in a regular browser.

A pre-commit hook (husky + lint-staged) runs `biome check --write` on staged files.

## CI

Every pull request runs lint, typecheck, tests and build with publint (`.github/workflows`).

Publishing is manual: run **Webitel web-widget pkg publish** and pick the bump (`patch`, `minor`, `major`) and the npm tag (`latest`, `next`). The workflow bumps both packages, builds them, publishes through npm trusted publishing (OIDC) and commits the new version back.