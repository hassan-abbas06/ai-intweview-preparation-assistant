export interface ProblemReference {
  slug: string;
  pythonRef: string;
  pythonBruteForce?: string;
  jsRef: string;
}

export const batch3References: Record<string, ProblemReference> = {
  // 1. contains-duplicate
  "contains-duplicate": {
    slug: "contains-duplicate",
    pythonRef: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("false")
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    print("true" if len(set(nums)) < len(nums) else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log('false');
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    const set = new Set(nums);
    console.log(set.size < nums.length ? 'true' : 'false');
}

main();
`,
  },

  // 2. single-number
  "single-number": {
    slug: "single-number",
    pythonRef: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    res = 0
    for x in nums:
        res ^= x
    print(res)

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    let res = 0;
    for (const x of nums) {
        res ^= x;
    }
    console.log(res);
}

main();
`,
  },

  // 3. number-of-1-bits
  "number-of-1-bits": {
    slug: "number-of-1-bits",
    pythonRef: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    print(bin(n).count("1"))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    let n = parseInt(tokens[0], 10);
    let count = 0;
    while (n > 0) {
        count += (n & 1);
        n = Math.floor(n / 2);
    }
    console.log(count);
}

main();
`,
  },

  // 4. roman-to-integer
  "roman-to-integer": {
    slug: "roman-to-integer",
    pythonRef: `import sys

def roman_to_int(s):
    val_map = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    total = 0
    n = len(s)
    for i in range(n):
        v = val_map.get(s[i], 0)
        if i + 1 < n and v < val_map.get(s[i + 1], 0):
            total -= v
        else:
            total += v
    return total

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    s = tokens[0]
    print(roman_to_int(s))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function romanToInt(s) {
    const map = { 'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000 };
    let total = 0;
    for (let i = 0; i < s.length; i++) {
        const curr = map[s[i]] || 0;
        const next = map[s[i + 1]] || 0;
        if (curr < next) {
            total -= curr;
        } else {
            total += curr;
        }
    }
    return total;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    console.log(romanToInt(tokens[0]));
}

main();
`,
  },

  // 5. longest-consecutive-sequence (Medium)
  "longest-consecutive-sequence": {
    slug: "longest-consecutive-sequence",
    pythonRef: `import sys

def longest_consecutive(nums):
    num_set = set(nums)
    longest = 0
    for x in num_set:
        if x - 1 not in num_set:
            curr = x
            streak = 1
            while curr + 1 in num_set:
                curr += 1
                streak += 1
            if streak > longest:
                longest = streak
    return longest

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    print(longest_consecutive(nums))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    if n == 0:
        print(0)
        return
    nums = sorted(list(set([int(x) for x in tokens[1:1+n]])))
    longest = 1
    curr = 1
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1] + 1:
            curr += 1
            if curr > longest:
                longest = curr
        else:
            curr = 1
    print(longest)

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function longestConsecutive(nums) {
    const set = new Set(nums);
    let longest = 0;
    for (const x of set) {
        if (!set.has(x - 1)) {
            let curr = x;
            let streak = 1;
            while (set.has(curr + 1)) {
                curr++;
                streak++;
            }
            if (streak > longest) {
                longest = streak;
            }
        }
    }
    return longest;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    console.log(longestConsecutive(nums));
}

main();
`,
  },

  // 6. number-of-provinces (Medium)
  "number-of-provinces": {
    slug: "number-of-provinces",
    pythonRef: `import sys

def find_circle_num(n, is_connected):
    visited = [False] * n
    count = 0
    for i in range(n):
        if not visited[i]:
            count += 1
            # BFS/DFS
            stack = [i]
            visited[i] = True
            while stack:
                curr = stack.pop()
                for neighbor in range(n):
                    if is_connected[curr][neighbor] == 1 and not visited[neighbor]:
                        visited[neighbor] = True
                        stack.append(neighbor)
    return count

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    idx = 1
    matrix = []
    for _ in range(n):
        matrix.append([int(x) for x in tokens[idx:idx+n]])
        idx += n
    print(find_circle_num(n, matrix))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys
from collections import deque

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    idx = 1
    matrix = []
    for _ in range(n):
        matrix.append([int(x) for x in tokens[idx:idx+n]])
        idx += n
    
    seen = set()
    provinces = 0
    for i in range(n):
        if i not in seen:
            provinces += 1
            q = deque([i])
            seen.add(i)
            while q:
                u = q.popleft()
                for v in range(n):
                    if matrix[u][v] == 1 and v not in seen:
                        seen.add(v)
                        q.append(v)
    print(provinces)

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function findCircleNum(n, isConnected) {
    const visited = new Array(n).fill(false);
    let count = 0;
    for (let i = 0; i < n; i++) {
        if (!visited[i]) {
            count++;
            const stack = [i];
            visited[i] = true;
            while (stack.length > 0) {
                const curr = stack.pop();
                for (let next = 0; next < n; next++) {
                    if (isConnected[curr][next] === 1 && !visited[next]) {
                        visited[next] = true;
                        stack.push(next);
                    }
                }
            }
        }
    }
    return count;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    let idx = 1;
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix.push(tokens.slice(idx, idx + n).map(Number));
        idx += n;
    }
    console.log(findCircleNum(n, matrix));
}

main();
`,
  },

  // 7. meeting-rooms-ii (Medium)
  "meeting-rooms-ii": {
    slug: "meeting-rooms-ii",
    pythonRef: `import sys

def min_meeting_rooms(intervals):
    if not intervals:
        return 0
    starts = sorted([x[0] for x in intervals])
    ends = sorted([x[1] for x in intervals])
    s = 0
    e = 0
    rooms = 0
    max_rooms = 0
    while s < len(intervals):
        if starts[s] < ends[e]:
            rooms += 1
            if rooms > max_rooms:
                max_rooms = rooms
            s += 1
        else:
            rooms -= 1
            e += 1
    return max_rooms

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    intervals = []
    idx = 1
    for _ in range(n):
        intervals.append([int(tokens[idx]), int(tokens[idx+1])])
        idx += 2
    print(min_meeting_rooms(intervals))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    if n == 0:
        print(0)
        return
    events = []
    idx = 1
    for _ in range(n):
        start = int(tokens[idx])
        end = int(tokens[idx+1])
        idx += 2
        events.append((start, 1))
        events.append((end, -1))
    events.sort(key=lambda x: (x[0], x[1]))
    curr = 0
    max_rooms = 0
    for time, delta in events:
        curr += delta
        if curr > max_rooms:
            max_rooms = curr
    print(max_rooms)

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function minMeetingRooms(intervals) {
    if (intervals.length === 0) return 0;
    const starts = intervals.map(x => x[0]).sort((a, b) => a - b);
    const ends = intervals.map(x => x[1]).sort((a, b) => a - b);
    let s = 0;
    let e = 0;
    let rooms = 0;
    let maxRooms = 0;
    while (s < intervals.length) {
        if (starts[s] < ends[e]) {
            rooms++;
            if (rooms > maxRooms) maxRooms = rooms;
            s++;
        } else {
            rooms--;
            e++;
        }
    }
    return maxRooms;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    const intervals = [];
    let idx = 1;
    for (let i = 0; i < n; i++) {
        intervals.push([parseInt(tokens[idx], 10), parseInt(tokens[idx + 1], 10)]);
        idx += 2;
    }
    console.log(minMeetingRooms(intervals));
}

main();
`,
  },

  // 8. word-break (Medium)
  "word-break": {
    slug: "word-break",
    pythonRef: `import sys

def word_break(s, word_dict):
    words = set(word_dict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for w in words:
            lw = len(w)
            if i >= lw and dp[i - lw] and s[i - lw:i] == w:
                dp[i] = True
                break
    return dp[n]

def main():
    lines = sys.stdin.read().splitlines()
    if not lines or not lines[0].strip():
        print("false")
        return
    s = lines[0].strip()
    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
    words = [lines[i].strip() for i in range(2, 2 + m) if i < len(lines)]
    print("true" if word_break(s, words) else "false")

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def can_break(s, words, memo):
    if not s:
        return True
    if s in memo:
        return memo[s]
    for w in words:
        if s.startswith(w):
            if can_break(s[len(w):], words, memo):
                memo[s] = True
                return True
    memo[s] = False
    return False

def main():
    lines = sys.stdin.read().splitlines()
    if not lines or not lines[0].strip():
        print("false")
        return
    s = lines[0].strip()
    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
    words = [lines[i].strip() for i in range(2, 2 + m) if i < len(lines)]
    memo = {}
    print("true" if can_break(s, words, memo) else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function wordBreak(s, wordDict) {
    const words = new Set(wordDict);
    const n = s.length;
    const dp = new Array(n + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= n; i++) {
        for (const w of words) {
            const lw = w.length;
            if (i >= lw && dp[i - lw] && s.slice(i - lw, i) === w) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[n];
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0] || lines[0].trim() === '') {
        console.log('false');
        return;
    }
    const s = lines[0].trim();
    const m = lines.length > 1 && lines[1].trim() ? parseInt(lines[1].trim(), 10) : 0;
    const words = [];
    for (let i = 2; i < 2 + m; i++) {
        if (lines[i] && lines[i].trim()) {
            words.push(lines[i].trim());
        }
    }
    console.log(wordBreak(s, words) ? 'true' : 'false');
}

main();
`,
  },

  // 9. sliding-window-maximum (Hard)
  "sliding-window-maximum": {
    slug: "sliding-window-maximum",
    pythonRef: `import sys
from collections import deque

def max_sliding_window(nums, k):
    if not nums or k <= 0:
        return []
    d = deque()
    res = []
    for i, x in enumerate(nums):
        while d and d[0] <= i - k:
            d.popleft()
        while d and nums[d[-1]] < x:
            d.pop()
        d.append(i)
        if i >= k - 1:
            res.append(str(nums[d[0]]))
    return res

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("")
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    k = int(tokens[1+n]) if len(tokens) > 1 + n else 1
    print(" ".join(max_sliding_window(nums, k)))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("")
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    k = int(tokens[1+n]) if len(tokens) > 1 + n else 1
    res = []
    for i in range(len(nums) - k + 1):
        res.append(str(max(nums[i:i+k])))
    print(" ".join(res))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function maxSlidingWindow(nums, k) {
    if (nums.length === 0 || k <= 0) return [];
    const d = [];
    const res = [];
    for (let i = 0; i < nums.length; i++) {
        while (d.length > 0 && d[0] <= i - k) {
            d.shift();
        }
        while (d.length > 0 && nums[d[d.length - 1]] < nums[i]) {
            d.pop();
        }
        d.push(i);
        if (i >= k - 1) {
            res.push(nums[d[0]]);
        }
    }
    return res;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log('');
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    const k = tokens.length > 1 + n ? parseInt(tokens[1 + n], 10) : 1;
    const res = maxSlidingWindow(nums, k);
    console.log(res.join(' '));
}

main();
`,
  },

  // 10. n-queens-count (Hard)
  "n-queens-count": {
    slug: "n-queens-count",
    pythonRef: `import sys

def total_n_queens(n):
    count = 0
    def backtrack(row, cols, diag1, diag2):
        nonlocal count
        if row == n:
            count += 1
            return
        available = ((1 << n) - 1) & ~(cols | diag1 | diag2)
        while available:
            pick = available & -available
            available &= available - 1
            backtrack(row + 1, cols | pick, (diag1 | pick) << 1, (diag2 | pick) >> 1)
    backtrack(0, 0, 0, 0)
    return count

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    print(total_n_queens(n))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def is_safe(queens, r, c):
    for qr, qc in enumerate(queens):
        if qc == c or abs(qr - r) == abs(qc - c):
            return False
    return True

def solve(row, n, queens):
    if row == n:
        return 1
    ans = 0
    for c in range(n):
        if is_safe(queens, row, c):
            queens.append(c)
            ans += solve(row + 1, n, queens)
            queens.pop()
    return ans

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    print(solve(0, n, []))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function totalNQueens(n) {
    let count = 0;
    function backtrack(row, cols, diag1, diag2) {
        if (row === n) {
            count++;
            return;
        }
        let available = ((1 << n) - 1) & ~(cols | diag1 | diag2);
        while (available > 0) {
            const pick = available & -available;
            available &= available - 1;
            backtrack(row + 1, cols | pick, (diag1 | pick) << 1, (diag2 | pick) >> 1);
        }
    }
    backtrack(0, 0, 0, 0);
    return count;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    console.log(totalNQueens(n));
}

main();
`,
  },
};
