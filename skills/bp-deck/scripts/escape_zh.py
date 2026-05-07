#!/usr/bin/env python3
"""Convert Chinese text (and other non-ASCII) to \\uXXXX JS escapes.

Usage:
    python3 escape_zh.py "你好世界"
    echo "你好" | python3 escape_zh.py
"""
import sys


def escape(s: str) -> str:
    out = []
    for c in s:
        if ord(c) > 127:
            out.append(f'\\u{ord(c):04X}')
        else:
            out.append(c)
    return ''.join(out)


def main() -> None:
    if len(sys.argv) > 1:
        text = ' '.join(sys.argv[1:])
    else:
        text = sys.stdin.read().rstrip('\n')
    print(escape(text))


if __name__ == '__main__':
    main()
