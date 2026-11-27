// The Tiptap editor exists only after the element connects, so strict consumers must check it (types C1).
import type { Editor } from '@tiptap/core';
import type { FocsdRichText } from '@focsd-dev/editor';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const exact = <A, B>(ok: Equal<A, B>): void => void ok;

declare const editor: FocsdRichText;

exact<typeof editor.editor, Editor | null>(true);
// @ts-expect-error: internal reactive state is not part of the public typings
void editor._linkOpen;
