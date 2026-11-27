# Security policy

## Reporting a vulnerability

Please report security issues privately through [GitHub security advisories](https://github.com/SunTribe1/focsd/security/advisories/new), not in public issues.

Include the affected package and version, how to reproduce the issue, and its impact. We aim to acknowledge reports within three working days and to ship a fix, with credit if you want it, as soon as one is ready.

## Supported versions

Security fixes go into the latest minor release. All Focsd packages share one version number.

## Scope

Focsd is a client-side component library. Of most interest: cross-site scripting through component inputs (icons, the rich text editor, markup rendering), unsafe links, Trusted Types bypasses, and the MCP and WebMCP packages exposing data or actions they should not.
