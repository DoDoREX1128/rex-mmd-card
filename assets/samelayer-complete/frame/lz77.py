# -*- coding: utf-8 -*-
"""lz77 —— 载荷压缩（构建侧）。

设计目标：**不依赖任何浏览器特性**。解压器是纯 JS，约 1.4KB，随 launcher 内联。

格式（与 _lzdecode.js 严格配对）：
    varint(N)                     原始字节数
    循环直到产出 N 字节：
        ctl 字节，bit0..bit7 依次对应 8 个操作，**bit=1 表示匹配，bit=0 表示字面量**
        字面量: 1 字节
        匹配  : varint(((dist-1) << 8) | (len-3))
                dist ∈ [1, 32768]，len ∈ [3, 258]

压缩器确定性：同样的输入永远产出同样的字节（无时间戳、无随机、dict 插入序）。
"""
import sys

WINDOW = 32768
MIN_LEN = 3
MAX_LEN = 258
MAX_CHAIN = 64


def _varint(out, v):
    while True:
        b = v & 0x7F
        v >>= 7
        if v:
            out.append(b | 0x80)
        else:
            out.append(b)
            return


def compress(src, window=WINDOW, max_len=MAX_LEN, max_chain=MAX_CHAIN):
    """返回压缩后的 bytes。src 必须支持切片与索引（bytes）。"""
    n = len(src)
    out = bytearray()
    _varint(out, n)
    head = {}          # key -> 最近一次出现位置
    prev = {}          # 位置 -> 同 key 的上一个位置
    i = 0
    while i < n:
        ctl_pos = len(out)
        out.append(0)
        ctl = 0
        for bit in range(8):
            if i >= n:
                break
            best_len = 0
            best_dist = 0
            if i + MIN_LEN <= n:
                key = src[i:i + 4] if i + 4 <= n else src[i:i + MIN_LEN]
                cand = head.get(key)
                tries = 0
                limit = min(max_len, n - i)
                while cand is not None and tries < max_chain:
                    dist = i - cand
                    if dist > window:
                        break
                    ln = 0
                    while ln < limit and src[cand + ln] == src[i + ln]:
                        ln += 1
                    if ln > best_len:
                        best_len, best_dist = ln, dist
                        if ln >= limit:
                            break
                    cand = prev.get(cand)
                    tries += 1
            if best_len >= MIN_LEN:
                ctl |= (1 << bit)
                _varint(out, ((best_dist - 1) << 8) | (best_len - MIN_LEN))
                end = i + best_len
                while i < end:
                    if i + MIN_LEN <= n:
                        k = src[i:i + 4] if i + 4 <= n else src[i:i + MIN_LEN]
                        prev[i] = head.get(k)
                        head[k] = i
                    i += 1
            else:
                out.append(src[i])
                if i + MIN_LEN <= n:
                    k = src[i:i + 4] if i + 4 <= n else src[i:i + MIN_LEN]
                    prev[i] = head.get(k)
                    head[k] = i
                i += 1
        out[ctl_pos] = ctl
    return bytes(out)


def decompress(data):
    """Python 侧参考实现，仅用于测试与校核（生产用 JS 版）。"""
    pos = 0

    def get_v():
        nonlocal pos
        v = 0
        sh = 0
        while True:
            b = data[pos]
            pos += 1
            v |= (b & 0x7F) << sh
            if not (b & 0x80):
                return v
            sh += 7

    n = get_v()
    out = bytearray()
    while len(out) < n:
        ctl = data[pos]
        pos += 1
        for bit in range(8):
            if len(out) >= n:
                break
            if not (ctl & (1 << bit)):
                out.append(data[pos])
                pos += 1
            else:
                v = get_v()
                dist = (v >> 8) + 1
                ln = (v & 0xFF) + MIN_LEN
                start = len(out) - dist
                for k in range(ln):
                    out.append(out[start + k])
    return bytes(out)


if __name__ == '__main__':
    src = open(sys.argv[1], 'rb').read()
    enc = compress(src)
    print('原始', len(src), '→', len(enc), '(%.1f%%)' % (len(enc) / len(src) * 100))
    print('往返', decompress(enc) == src)
