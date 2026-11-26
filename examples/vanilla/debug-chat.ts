import {
	countUnread,
	type Message,
	type MessageButtons,
	type WebWidgetClient,
} from '@webitel/web-widget-core';

// [Claude] Bare chat window for testing core by hand: every core feature behind a plain button, no styling. It used to be the @webitel/web-widget-ui stub; it lives here now that the ui package is the real widget.
export const DEBUG_CHAT_TAG = 'webitel-debug-chat';

const template = `
	<style>
		:host { display: block; max-width: 360px; font: 14px sans-serif; border: 1px solid #ccc; }
		header, form { display: flex; gap: 8px; padding: 8px; }
		header { justify-content: space-between; border-bottom: 1px solid #ccc; }
		ul { list-style: none; margin: 0; padding: 8px; height: 320px; overflow: auto; }
		li { margin: 4px 0; }
		li.client { text-align: right; }
		small, blockquote { color: #888; }
		blockquote { margin: 0; padding-left: 6px; border-left: 2px solid #ccc; }
		li button { font-size: 11px; }
		input { flex: 1; }
	</style>
	<header><span id="state"></span><span id="typing"></span><span id="unread"></span></header>
	<button id="older" hidden>Load older</button>
	<ul></ul>
	<div id="reply" hidden></div>
	<form>
		<input placeholder="Message" />
		<button>Send</button>
		<button type="button" id="location">📍</button>
		<button type="button" id="contact">👤</button>
	</form>
`;

export class DebugChatElement extends HTMLElement {
	#client: WebWidgetClient | null = null;
	#cleanup: Array<() => void> = [];
	#typingTimer: ReturnType<typeof setTimeout> | undefined;
	#replyTo: Message | undefined;

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
			root
				.querySelector('input')
				?.addEventListener('input', () => this.#client?.typing.notify());
			root
				.querySelector('#location')
				?.addEventListener('click', () => this.#sendLocation());
			root
				.querySelector('#contact')
				?.addEventListener('click', () => this.#sendContact());
			root.querySelector('#reply')?.addEventListener('click', () => {
				this.#replyTo = undefined;
				this.#render();
			});
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
		this.#client.messages
			.send(input.value, {
				replyTo: this.#replyTo?.id,
			})
			.catch(() => {});
		input.value = '';
		this.#replyTo = undefined;
		this.#render();
	}

	#sendLocation() {
		navigator.geolocation.getCurrentPosition(({ coords }) => {
			this.#client?.messages
				.sendLocation(
					{
						latitude: coords.latitude,
						longitude: coords.longitude,
					},
					{
						replyTo: this.#takeReply(),
					},
				)
				.catch(() => {});
		});
	}

	#sendContact() {
		const name = prompt('Name');
		const phone = prompt('Phone');
		if (!name && !phone) return;
		this.#client?.messages
			.sendContact(
				{
					name: name ?? undefined,
					phone: phone ?? undefined,
				},
				{
					replyTo: this.#takeReply(),
				},
			)
			.catch(() => {});
	}

	#takeReply() {
		const id = this.#replyTo?.id;
		this.#replyTo = undefined;
		this.#render();
		return id;
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

		const reply = root.querySelector<HTMLElement>('#reply');
		if (reply) {
			reply.hidden = !this.#replyTo;
			reply.textContent = `Reply to: ${this.#replyTo?.text ?? ''} ✕`;
		}

		const list = root.querySelector('ul');
		list?.replaceChildren(
			...snapshot.messages.map((message) => this.#renderMessage(message)),
		);

		if (document.visibilityState === 'visible') client.messages.markRead();
	}

	#renderMessage(message: Message) {
		const item = document.createElement('li');
		item.className = message.author;

		if (message.replyTo) {
			const quote = document.createElement('blockquote');
			quote.textContent = message.replyTo.deleted
				? '(deleted)'
				: message.replyTo.text;
			item.append(quote);
		}

		item.append(message.deletedAt ? '(deleted)' : describe(message));
		if (message.buttons && !message.deletedAt) {
			item.append(...this.#renderButtons(message, message.buttons));
		}

		const meta = document.createElement('small');
		const edited = message.editedAt ? ' · edited' : '';
		const reactions = message.reactions
			.map((reaction) => `${reaction.emoji}${reaction.count}`)
			.join(' ');
		meta.textContent = ` ${message.senderName ?? message.author} · ${message.status}${edited} ${reactions}`;
		item.append(meta);

		if (!message.deletedAt) item.append(...this.#renderActions(message));
		return item;
	}

	#renderButtons(message: Message, buttons: MessageButtons) {
		const client = this.#client;
		const rows = [
			...buttons.rows,
			...(buttons.list?.sections.map((section) => section.buttons) ?? []),
		];
		return rows.map((row) => {
			const line = document.createElement('div');
			for (const { id, label, action } of row) {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = buttons.pressedId === id ? `✓ ${label}` : label;
				button.addEventListener('click', () => {
					if (action.type === 'url') window.open(action.url, '_blank');
					else if (action.type === 'request') {
						if (action.request === 'location') this.#sendLocation();
						if (action.request === 'contact') this.#sendContact();
					} else client?.interactive.press(message.id, id).catch(() => {});
				});
				line.append(button);
			}
			return line;
		});
	}

	#renderActions(message: Message) {
		const client = this.#client;
		if (!client) return [];

		const action = (label: string, run: () => Promise<void> | void) => {
			const button = document.createElement('button');
			button.textContent = label;
			button.addEventListener('click', () => {
				Promise.resolve(run()).catch(() => {});
			});
			return button;
		};

		if (message.status === 'failed') {
			return [
				action('Retry', () => client.messages.retry(message.id)),
				action('Delete', () => client.messages.delete(message.id)),
			];
		}

		const liked = message.reactions.some(
			(reaction) => reaction.emoji === '👍' && reaction.reactedByMe,
		);
		const actions = [
			action('Reply', () => {
				this.#replyTo = message;
				this.#render();
			}),
			action(liked ? 'Unlike' : '👍', () =>
				liked
					? client.reactions.clear(message.id)
					: client.reactions.set(message.id, '👍'),
			),
		];
		if (message.editedAt) {
			actions.push(
				action('History', async () => {
					const revisions = await client.messages.revisions(message.id);
					alert(
						revisions
							.map(
								({ version, action, text }) => `${version}. ${action}: ${text}`,
							)
							.join('\n'),
					);
				}),
			);
		}
		if (message.author === 'client' && message.type === 'text') {
			actions.push(
				action('Edit', () => {
					const text = prompt('Edit message', message.text);
					return text ? client.messages.edit(message.id, text) : undefined;
				}),
			);
		}
		if (message.author === 'client') {
			actions.push(action('Delete', () => client.messages.delete(message.id)));
		}
		return actions;
	}
}

function describe(message: Message): string {
	const { location, contact } = message;
	if (location) {
		return `📍 ${location.name ?? `${location.latitude}, ${location.longitude}`}`;
	}
	if (contact) {
		return `👤 ${[
			contact.name,
			contact.phone,
			contact.email,
		]
			.filter(Boolean)
			.join(' · ')}`;
	}
	return message.text;
}

export function defineDebugChat(tagName: string = DEBUG_CHAT_TAG): void {
	if (!customElements.get(tagName)) {
		customElements.define(tagName, class extends DebugChatElement {});
	}
}
