/* tslint:disable */
/* eslint-disable */
/**
*/
export function init_panic_hook(): void;
/**
*/
export class Document {
  free(): void;
/**
*/
  readonly body_redacted: string;
/**
*/
  readonly date: string;
/**
*/
  readonly title_redacted: string;
}
/**
*/
export class Email {
  free(): void;
/**
*/
  readonly body: string;
/**
*/
  readonly subject: string;
}
/**
*/
export class GameState {
  free(): void;
/**
* @param {Array<any>} doc_strs
* @returns {GameState}
*/
  static new(doc_strs: Array<any>): GameState;
/**
* @returns {Array<any>}
*/
  drain_events(): Array<any>;
/**
* @param {string} input
* @param {number} year
* @returns {QueryResult}
*/
  submit_query(input: string, year: number): QueryResult;
}
/**
*/
export class GameStateEvent {
  free(): void;
/**
*/
  readonly emails: Array<any>;
}
/**
*/
export class QueryResult {
  free(): void;
/**
*/
  readonly docs: Array<any>;
/**
*/
  readonly email: Email;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_document_free: (a: number) => void;
  readonly document_title_redacted: (a: number, b: number) => void;
  readonly document_body_redacted: (a: number, b: number) => void;
  readonly document_date: (a: number, b: number) => void;
  readonly __wbg_email_free: (a: number) => void;
  readonly email_subject: (a: number, b: number) => void;
  readonly __wbg_gamestateevent_free: (a: number) => void;
  readonly gamestateevent_emails: (a: number) => number;
  readonly __wbg_queryresult_free: (a: number) => void;
  readonly queryresult_email: (a: number) => number;
  readonly queryresult_docs: (a: number) => number;
  readonly __wbg_gamestate_free: (a: number) => void;
  readonly gamestate_new: (a: number, b: number) => void;
  readonly gamestate_drain_events: (a: number) => number;
  readonly gamestate_submit_query: (a: number, b: number, c: number, d: number) => number;
  readonly init_panic_hook: () => void;
  readonly email_body: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
