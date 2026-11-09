import type { WebWidgetClient } from '@webitel/web-widget-core';

export const WEBITEL_CHAT_TAG = 'webitel-chat';

export class WebitelChatElement extends HTMLElement {
	#client: WebWidgetClient | null = null;
	#unsubscribe: (() => void) | null = null;

	set client(client: WebWidgetClient | null) {
		this.#unsubscribe?.();
		this.#client = client;
		this.#unsubscribe = client?.on('connection', () => this.#render()) ?? null;
		this.#render();
	}

	get client(): WebWidgetClient | null {
		return this.#client;
	}

	connectedCallback(): void {
		if (!this.shadowRoot)
			this.attachShadow({
				mode: 'open',
			});
		this.#render();
	}

	disconnectedCallback(): void {
		this.#unsubscribe?.();
		this.#unsubscribe = null;
	}

	#render() {
		if (!this.shadowRoot) return;
		this.shadowRoot.textContent = `Webitel chat: ${
			this.#client?.connectionState ?? 'no client'
		}`;
	}
}

export function defineWebitelChat(tagName: string = WEBITEL_CHAT_TAG): void {
	if (!customElements.get(tagName)) {
		customElements.define(tagName, class extends WebitelChatElement {});
	}
}
