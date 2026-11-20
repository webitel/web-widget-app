import type {
	ButtonAction,
	MessageButton,
	MessageButtons,
} from '../types/message';
import { field, readBoolean, readList, readString } from './read';

export function decodeButtons(source: unknown): MessageButtons | undefined {
	const interactive = field(source, 'interactive');
	if (!interactive) return undefined;

	const list = field(interactive, 'list_reply');
	return {
		rows: readList(field(interactive, 'markup'), 'rows')
			.map(decodeButtonList)
			.filter((row) => row.length),
		list: list
			? {
					title: readString(list, 'main_button_title'),
					sections: readList(list, 'sections').map((section) => ({
						title: readString(section, 'section'),
						buttons: decodeButtonList(section),
					})),
				}
			: undefined,
		singleUse: readBoolean(interactive, 'single_use'),
		pressedId: readString(field(source, 'reacted_metadata'), 'button_code'),
	};
}

export function allButtons(buttons: MessageButtons): MessageButton[] {
	return [
		...buttons.rows.flat(),
		...(buttons.list?.sections.flatMap((section) => section.buttons) ?? []),
	];
}

function decodeButtonList(source: unknown): MessageButton[] {
	return readList(source, 'buttons').flatMap((button) => {
		const id = readString(button, 'id');
		if (!id) return [];
		return {
			id,
			label: readString(button, 'label') ?? id,
			action: decodeAction(button),
		};
	});
}

function decodeAction(button: unknown): ButtonAction {
	const url = readString(field(button, 'url'), 'url');
	if (url) {
		return {
			type: 'url',
			url,
		};
	}
	const request = readString(field(button, 'request'), 'action');
	if (request) {
		return {
			type: 'request',
			request,
		};
	}
	return {
		type: 'callback',
		data: readString(field(button, 'callback'), 'data'),
	};
}
