import type { Message } from './message';

export interface ChatState {
	messages: readonly Message[];
	threadId: string | undefined;
	readUpToSeq: number;
	hasOlder: boolean;
}
