import {
	countUnread,
	type Message,
	type WebWidgetClient,
} from '@webitel/web-widget-core';

export const WEBITEL_CHAT_TAG = 'webitel-chat';

const template = `
	<style>
		:host { display: block; max-width: 360px; font: 14px sans-serif; border: 1px solid #ccc; }
		header, form { display: flex; gap: 8px; padding: 8px; }
		header { justify-content: space-between; border-bottom: 1px solid #ccc; }
		ul { list-style: none; margin: 0; padding: 8px; height: 320px; overflow: auto; }
		li { margin: 4px 0; }
		li.client { text-align: right; }
		small { color: #888; }
		input { flex: 1; }
	</style>
	<header><span id="state"></span><span id="typing"></span><span id="unread"></span></header>
	<button id="older" hidden>Load older</button>
	<ul></ul>
	<form><input placeholder="Message" /><button>Send</button></form>
`;

export class WebitelChatElement extends HTMLElement {
	#client: WebWidgetClient | null = null;
	#cleanup: Array<() => void> = [];
	#typingTimer: ReturnType<typeof setTimeout> | undefined;

	set client(client: WebWidgetClient | null) {
		this.#unbind();
		this.#client = client;
		if (client) {
			this.#cleanup = [
				client.subscribe(() => this.#render()),
				client.on('connection', () => this.#render()),
				client.on('typing', ({ name, timeoutMs }) =>
					this.#showTyping(name, timeoutMs),
				),
			];
		}
		this.#render();
	}

	get client(): WebWidgetClient | null {
		return this.#client;
	}

	connectedCallback(): void {
		if (!this.shadowRoot) {
			const root = this.attachShadow({
				mode: 'open',
			});
			root.innerHTML = template;
			root
				.querySelector('form')
				?.addEventListener('submit', (event) => this.#send(event));
			root
				.querySelector('#older')
				?.addEventListener('click', () => this.#client?.messages.loadOlder());
		}
		this.#render();
	}

	disconnectedCallback(): void {
		this.#unbind();
	}

	#unbind() {
		for (const cleanup of this.#cleanup) cleanup();
		this.#cleanup = [];
	}

	#send(event: SubmitEvent) {
		event.preventDefault();
		const input = this.shadowRoot?.querySelector('input');
		if (!input || !this.#client) return;
		this.#client.messages.send(input.value).catch(() => {});
		input.value = '';
	}

	#showTyping(name: string | undefined, timeoutMs: number) {
		const typing = this.shadowRoot?.querySelector('#typing');
		if (!typing) return;
		typing.textContent = `${name ?? 'Operator'} is typing…`;
		clearTimeout(this.#typingTimer);
		this.#typingTimer = setTimeout(() => {
			typing.textContent = '';
		}, timeoutMs);
	}

	#render() {
		const root = this.shadowRoot;
		const client = this.#client;
		if (!root) return;

		const state = root.querySelector('#state');
		if (state) state.textContent = client?.connectionState ?? 'no client';
		if (!client) return;

		const snapshot = client.getSnapshot();
		const unread = root.querySelector('#unread');
		if (unread) unread.textContent = `unread: ${countUnread(snapshot)}`;

		const older = root.querySelector<HTMLButtonElement>('#older');
		if (older) older.hidden = !snapshot.hasOlder;

		const list = root.querySelector('ul');
		list?.replaceChildren(
			...snapshot.messages.map((message) => this.#renderMessage(message)),
		);

		if (document.visibilityState === 'visible') client.messages.markRead();
	}

	#renderMessage(message: Message) {
		const item = document.createElement('li');
		item.className = message.author;
		item.textContent = message.deletedAt ? '(deleted)' : message.text;

		const meta = document.createElement('small');
		meta.textContent = ` ${message.senderName ?? message.author} · ${message.status}`;
		item.append(meta);

		if (message.status === 'failed') {
			const retry = document.createElement('button');
			retry.textContent = 'Retry';
			retry.addEventListener('click', () => {
				this.#client?.messages.retry(message.id).catch(() => {});
			});
			item.append(retry);
		}
		return item;
	}
}

export function defineWebitelChat(tagName: string = WEBITEL_CHAT_TAG): void {
	if (!customElements.get(tagName)) {
		customElements.define(tagName, class extends WebitelChatElement {});
	}
}
