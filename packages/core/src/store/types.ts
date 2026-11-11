import type { ChatState } from '../types/chat';
import type { Message } from '../types/message';

export interface Store<State> {
	getSnapshot(): State;
	setState(update: (state: State) => State): void;
	subscribe(listener: () => void): () => void;
}

export type MessageList = readonly Message[];

export interface MessageEdit {
	text: string;
	version: number;
	editedAt: number | undefined;
}

export type Reducer = (state: ChatState) => ChatState;
