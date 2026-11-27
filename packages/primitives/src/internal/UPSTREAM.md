<!-- cspell:ignore qrcode Kazuhiko Arase kazuhikoarase DENSO QRRS SJIS Ünïcödé -->

# Vendored third-party code

## qrcode-generator 2.0.4 → `qr-upstream.js`

`qr-upstream.js` is a trimmed copy of the QR matrix encoder from `qrcode-generator`. `qr.js` wraps it
as `encodeQr(text, level)`. The package is never listed in any `package.json`; it is vendored source
(plan ruling R23).

| Item          | Value                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package       | `qrcode-generator` 2.0.4 (npm), MIT, author Kazuhiko Arase                                                                                             |
| Tarball       | `https://registry.npmjs.org/qrcode-generator/-/qrcode-generator-2.0.4.tgz`                                                                             |
| Integrity     | `sha512-mZSiP6RnbHl4xL2Ap5HfkjLnmxfKcPWpWe/c+5XxCuetEenqmNFf1FH/ftXPCtFG5/TDobjsjz6sSNL0Sr8Z9g==`                                                      |
| Shasum (SHA1) | `e8b3f30922577eba52078aa9c0d5a2a74fe1fd94`                                                                                                             |
| Source file   | `package/dist/qrcode.mjs`, 51,907 bytes, SHA-256 `ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0`                                    |
| Upstream repo | `https://github.com/kazuhikoarase/qrcode-generator`, tag `js2.0.4` (commit `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8`), file `js/dist/qrcode.mjs`      |
| License file  | `https://raw.githubusercontent.com/kazuhikoarase/qrcode-generator/master/LICENSE` (the npm tarball ships none; the file header says MIT)               |

### Verification (2026-11-13)

Fetched into an empty scratch directory outside the repo with `npm pack qrcode-generator@2.0.4 --ignore-scripts`
(no install, no scripts run).

- Tarball SHA1 and SHA-512 integrity recomputed locally: both match the table.
- `shasum -a 256 package/dist/qrcode.mjs` matches; size 51,907 bytes.
- `js/dist/qrcode.mjs` fetched from GitHub at tag `js2.0.4` and at commit `83b7e8f…`: `cmp` finds both
  byte-identical to the npm file.

### Review checklist

The whole upstream file (2,237 lines) was read before trimming.

| Check                                                                                                                                                            | Result |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| No `eval`, `new Function`, dynamic `import()`, `require`, network, storage, `document` or `window` access in the kept parts (grep of the trimmed file; the only hit, `getMaskFunction(`, is a method name) | pass   |
| No writes to globals or built-in prototypes. Upstream's only module-level write, `qrcode.stringToBytes = …` (a property on its own function), is dropped                                  | pass   |
| Inputs bounded: `encodeQr` compares the UTF-8 byte length with the version-40 byte capacity for the level (L 2953, M 2331, Q 1663, H 1273) and throws `RangeError('QR value too long')` before `addData`, so the work is bounded too (upstream `make()` would write the whole value once per version 1–39 first); a `code length overflow` from `make()` is still mapped to the same `RangeError` | pass   |
| Known issue 1: upstream `qrcode.stringToBytes` keeps only the low byte of each UTF-16 unit (Latin-1). Not vendored; `qr8BitByte` takes UTF-8 bytes from `TextEncoder`                    | pass   |
| Known issue 2: `toUTF8Array` in `qrcode_UTF8.mjs` reads past an unpaired surrogate. Not vendored; `TextEncoder` replaces unpaired surrogates with U+FFFD                                    | pass   |
| Writers, Kanji/SJIS and helpers dropped (list below); kept parts as listed below                                                                                                          | pass   |
| Original copyright header and the DENSO WAVE trademark note kept verbatim (below the vendoring header)                                                                                    | pass   |
| Equivalence: `packages/primitives/test/qr.test.mjs` pins SHA-256 hashes of four matrices (ASCII URL, non-ASCII with emoji/CJK, empty, version 40-H). The hashes come from the plan (computed from the untouched upstream with UTF-8 bytes at plan time) and are reproduced by the trimmed file, together with the first finder row and the version-40 boundary (1273 bytes at H fit, 1274 throw) | pass   |

Other observations (no action needed): upstream throws strings rather than `Error` objects (we wrap the one
that matters); `isDark` throws on out-of-range coordinates (`encodeQr` only reads inside the matrix); work is
bounded by version 40 (177×177 modules, eight mask passes).

### Kept

`qrcode` (with `addData`, `isDark`, `getModuleCount`, `make` and the private builders `makeImpl`,
`setupPositionProbePattern`, `getBestMaskPattern`, `setupTimingPattern`, `setupPositionAdjustPattern`,
`setupTypeNumber`, `setupTypeInfo`, `mapData`, `createBytes`, `createData`), `QRMode`,
`QRErrorCorrectionLevel`, `QRMaskPattern`, `QRUtil`, `QRMath`, `qrPolynomial`, `QRRSBlock`,
`qrBitBuffer`, `qrNumber`, `qrAlphaNum`, `qr8BitByte`. Only `qrcode` is exported.

### Removed

`createTableTag`, `createSvgTag`, `createDataURL` (method and module-scope function), `createImgTag`,
`createASCII`, `_createHalfASCII`, `escapeXml`, `renderTo2dContext`, `qrcode.stringToBytes`,
`qrcode.createStringToBytes`, `qrKanji`, `byteArrayOutputStream`, `base64EncodeOutputStream`,
`base64DecodeInputStream`, `gifImage`, and the trailing `export default qrcode` and
`export const stringToBytes`.

### Edits to the kept code

1. `qr8BitByte`: `const _bytes = qrcode.stringToBytes(data);` became
   `const _bytes = [...new TextEncoder().encode(data)];` (UTF-8).
2. `addData`: the `case 'Kanji'` branch (three lines) is removed with `qrKanji`; `'Kanji'` now reaches
   the existing `default: throw 'mode:' + mode`.
3. A vendoring header (source, hash, `@ts-nocheck`, `eslint-disable`, `cspell:disable`) sits above the
   original header, and the file is formatted with Prettier. No other change.

### License

```text
MIT License

Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Re-vendoring

1. In a new empty directory outside the repo: `npm pack qrcode-generator@<version> --ignore-scripts`,
   extract, record the tarball integrity and the SHA-256 of `package/dist/qrcode.mjs`, and `cmp` it
   against `js/dist/qrcode.mjs` at the matching GitHub tag. Stop if anything differs.
2. Read the whole file and repeat the review checklist above.
3. Recompute the four matrix hashes in `test/qr.test.mjs` from the untouched upstream file (with
   `qrcode.stringToBytes` replaced by a UTF-8 `TextEncoder` encoder), then update the test first.
4. Copy the kept parts into `qr-upstream.js` under the vendoring header, reapply the edits above, run
   Prettier, and run the test until it passes. Update this file.
