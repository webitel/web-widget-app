import type { WebWidgetClient } from '@webitel/web-widget-core';
import { defineCustomElement } from 'vue';
import { installUi } from './app/install-ui';
import TheApp from './app/the-app.vue';

export const WEBITEL_CHAT_TAG = 'webitel-chat';

export type WebitelChatProps = {
	client: WebWidgetClient | null;
};

// [Claude] Public types stay free of Vue's, because Vue is bundled and sites using the npm package don't have it installed.
export type WebitelChatElement = HTMLElement & WebitelChatProps;

// [Claude] Vue's custom element instead of a hand-written one: it adds every component's styles (compiled in custom-element mode, see vite.config.ts) into the shadow root, including components that load later.
export const WebitelChatElement: new () => WebitelChatElement =
	defineCustomElement(TheApp, {
		configureApp: installUi,
	});

export function defineWebitelChat(tagName: string = WEBITEL_CHAT_TAG): void {
	if (!customElements.get(tagName)) {
		customElements.define(tagName, class extends WebitelChatElement {});
	}
}
