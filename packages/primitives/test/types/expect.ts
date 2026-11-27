/** `exact<A, B>(true)` compiles only when A and B are the same type (`Date` is not `Date | null`). */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const exact = <A, B>(ok: Equal<A, B>): void => void ok;
