import { WidgetError } from '../../shared/errors';
import { withMessages } from '../../store/chat';
import { findMessage, updateMessage } from '../../store/messages';
import type { InteractiveApi } from '../../types/client';
import { allButtons } from '../../wire/buttons';
import type { FeatureContext } from '../types';

export function createInteractiveFeature({
	api,
	store,
}: FeatureContext): InteractiveApi {
	return {
		async press(messageId, buttonId) {
			const message = findMessage(store.getSnapshot().messages, messageId);
			const button =
				message?.buttons &&
				allButtons(message.buttons).find(({ id }) => id === buttonId);
			if (button?.action.type !== 'callback') {
				throw new WidgetError('bad_request', 'Button has no callback');
			}

			await api.messages.press(messageId, {
				code: button.id,
				data: button.action.data,
			});
			store.setState(
				withMessages((list) =>
					updateMessage(list, messageId, (current) =>
						current.buttons
							? {
									...current,
									buttons: {
										...current.buttons,
										pressedId: buttonId,
									},
								}
							: current,
					),
				),
			);
		},
	};
}
