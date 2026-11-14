export interface ProblemReference {
  slug: string;
  pythonRef: string;
  pythonBruteForce?: string;
  jsRef: string;
}

export const batch2References: Record<string, ProblemReference> = {
  // 1. reverse-linked-list
  "reverse-linked-list": {
    slug: "reverse-linked-list",
    pythonRef: `import sys

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("")
        return
    n = int(tokens[0])
    if n == 0 or len(tokens) < 1 + n:
        print("")
        return
    vals = [int(x) for x in tokens[1:1+n]]
    dummy = ListNode(0)
    curr = dummy
    for v in vals:
        curr.next = ListNode(v)
        curr = curr.next
    
    rev = reverse_list(dummy.next)
    out = []
    while rev:
        out.append(str(rev.val))
        rev = rev.next
    print(" ".join(out))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function ListNode(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}

function reverseList(head) {
    let prev = null;
    let curr = head;
    while (curr) {
        const nxt = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log('');
        return;
    }
    const n = parseInt(tokens[0], 10);
    if (n === 0 || tokens.length < 1 + n) {
        console.log('');
        return;
    }
    const vals = tokens.slice(1, 1 + n).map(Number);
    const dummy = new ListNode(0);
    let curr = dummy;
    for (const v of vals) {
        curr.next = new ListNode(v);
        curr = curr.next;
    }
    let rev = reverseList(dummy.next);
    const out = [];
    while (rev) {
        out.push(rev.val);
        rev = rev.next;
    }
    console.log(out.join(' '));
}

main();
`,
  },

  // 2. maximum-depth-of-binary-tree
  "maximum-depth-of-binary-tree": {
    slug: "maximum-depth-of-binary-tree",
    pythonRef: `import sys

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

def build_tree(tokens):
    if not tokens or tokens[0] == "null" or tokens[0] == "":
        return None
    root = TreeNode(int(tokens[0]))
    queue = [root]
    idx = 1
    while queue and idx < len(tokens):
        curr = queue.pop(0)
        if idx < len(tokens):
            if tokens[idx] != "null" and tokens[idx] != "":
                curr.left = TreeNode(int(tokens[idx]))
                queue.append(curr.left)
            idx += 1
        if idx < len(tokens):
            if tokens[idx] != "null" and tokens[idx] != "":
                curr.right = TreeNode(int(tokens[idx]))
                queue.append(curr.right)
            idx += 1
    return root

def main():
    lines = sys.stdin.read().splitlines()
    if not lines or not lines[0].strip():
        print(0)
        return
    tokens = lines[0].strip().split()
    root = build_tree(tokens)
    print(max_depth(root))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function TreeNode(val, left, right) {
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
}

function maxDepth(root) {
    if (!root) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

function buildTree(tokens) {
    if (!tokens || tokens.length === 0 || tokens[0] === 'null' || tokens[0] === '') return null;
    const root = new TreeNode(parseInt(tokens[0], 10));
    const queue = [root];
    let idx = 1;
    while (queue.length > 0 && idx < tokens.length) {
        const curr = queue.shift();
        if (idx < tokens.length) {
            if (tokens[idx] !== 'null' && tokens[idx] !== '') {
                curr.left = new TreeNode(parseInt(tokens[idx], 10));
                queue.push(curr.left);
            }
            idx++;
        }
        if (idx < tokens.length) {
            if (tokens[idx] !== 'null' && tokens[idx] !== '') {
                curr.right = new TreeNode(parseInt(tokens[idx], 10));
                queue.push(curr.right);
            }
            idx++;
        }
    }
    return root;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0] || lines[0].trim() === '') {
        console.log(0);
        return;
    }
    const tokens = lines[0].trim().split(/\\s+/);
    const root = buildTree(tokens);
    console.log(maxDepth(root));
}

main();
`,
  },

  // 3. valid-anagram
  "valid-anagram": {
    slug: "valid-anagram",
    pythonRef: `import sys
from collections import Counter

def is_anagram(s: str, t: str) -> bool:
    return Counter(s) == Counter(t)

def main():
    lines = sys.stdin.read().splitlines()
    if len(lines) < 2:
        print("false")
        return
    s = lines[0].strip()
    t = lines[1].strip()
    print("true" if is_anagram(s, t) else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    const count = {};
    for (const c of s) count[c] = (count[c] || 0) + 1;
    for (const c of t) {
        if (!count[c]) return false;
        count[c]--;
    }
    return true;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (lines.length < 2) {
        console.log('false');
        return;
    }
    const s = lines[0].trim();
    const t = lines[1].trim();
    console.log(isAnagram(s, t) ? 'true' : 'false');
}

main();
`,
  },

  // 4. group-anagrams-count
  "group-anagrams-count": {
    slug: "group-anagrams-count",
    pythonRef: `import sys
from collections import defaultdict

def group_anagrams_count(strs):
    groups = defaultdict(list)
    for s in strs:
        key = "".join(sorted(s))
        groups[key].append(s)
    return len(groups)

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print(0)
        return
    n = int(lines[0].strip()) if lines[0].strip() else 0
    if n == 0 or len(lines) < 2 or not lines[1].strip():
        print(0)
        return
    strs = lines[1].strip().split()
    print(group_anagrams_count(strs))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def group_anagrams_count_brute(strs):
    used = [False] * len(strs)
    count = 0
    for i in range(len(strs)):
        if not used[i]:
            count += 1
            used[i] = True
            for j in range(i + 1, len(strs)):
                if not used[j] and sorted(strs[i]) == sorted(strs[j]):
                    used[j] = True
    return count

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print(0)
        return
    n = int(lines[0].strip()) if lines[0].strip() else 0
    if n == 0 or len(lines) < 2 or not lines[1].strip():
        print(0)
        return
    strs = lines[1].strip().split()
    print(group_anagrams_count_brute(strs))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function groupAnagramsCount(strs) {
    const groups = new Set();
    for (const s of strs) {
        const key = s.split('').sort().join('');
        groups.add(key);
    }
    return groups.size;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) {
        console.log(0);
        return;
    }
    const n = parseInt(lines[0].trim(), 10);
    if (n === 0 || lines.length < 2 || !lines[1].trim()) {
        console.log(0);
        return;
    }
    const strs = lines[1].trim().split(/\\s+/);
    console.log(groupAnagramsCount(strs));
}

main();
`,
  },

  // 5. kth-largest-element
  "kth-largest-element": {
    slug: "kth-largest-element",
    pythonRef: `import sys
import heapq

def find_kth_largest(nums, k):
    return heapq.nlargest(k, nums)[-1]

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    k = int(lines[2].strip()) if len(lines) > 2 else 1
    print(find_kth_largest(nums, k))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def find_kth_largest_brute(nums, k):
    nums.sort(reverse=True)
    return nums[k - 1]

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    k = int(lines[2].strip()) if len(lines) > 2 else 1
    print(find_kth_largest_brute(nums, k))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function findKthLargest(nums, k) {
    nums.sort((a, b) => b - a);
    return nums[k - 1];
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    const k = lines.length > 2 ? parseInt(lines[2].trim(), 10) : 1;
    console.log(findKthLargest(nums, k));
}

main();
`,
  },

  // 6. course-schedule
  "course-schedule": {
    slug: "course-schedule",
    pythonRef: `import sys
from collections import deque, defaultdict

def can_finish(num_courses, prerequisites):
    indegree = [0] * num_courses
    adj = defaultdict(list)
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    
    queue = deque([i for i in range(num_courses) if indegree[i] == 0])
    visited_count = 0
    while queue:
        u = queue.popleft()
        visited_count += 1
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return visited_count == num_courses

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print("true")
        return
    num_courses = int(lines[0].strip())
    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
    prereqs = []
    for i in range(2, 2 + m):
        if i < len(lines) and lines[i].strip():
            parts = list(map(int, lines[i].strip().split()))
            prereqs.append((parts[0], parts[1]))
    print("true" if can_finish(num_courses, prereqs) else "false")

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def can_finish_brute(num_courses, prerequisites):
    adj = {i: [] for i in range(num_courses)}
    for a, b in prerequisites:
        adj[b].append(a)
    
    # 0 = unvisited, 1 = visiting, 2 = visited
    state = [0] * num_courses

    def has_cycle(u):
        state[u] = 1
        for v in adj[u]:
            if state[v] == 1:
                return True
            if state[v] == 0 and has_cycle(v):
                return True
        state[u] = 2
        return False

    for i in range(num_courses):
        if state[i] == 0:
            if has_cycle(i):
                return False
    return True

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print("true")
        return
    num_courses = int(lines[0].strip())
    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0
    prereqs = []
    for i in range(2, 2 + m):
        if i < len(lines) and lines[i].strip():
            parts = list(map(int, lines[i].strip().split()))
            prereqs.append((parts[0], parts[1]))
    print("true" if can_finish_brute(num_courses, prereqs) else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function canFinish(numCourses, prerequisites) {
    const indegree = new Array(numCourses).fill(0);
    const adj = Array.from({ length: numCourses }, () => []);
    for (const [a, b] of prerequisites) {
        adj[b].push(a);
        indegree[a]++;
    }
    const queue = [];
    for (let i = 0; i < numCourses; i++) {
        if (indegree[i] === 0) queue.push(i);
    }
    let count = 0;
    while (queue.length > 0) {
        const u = queue.shift();
        count++;
        for (const v of adj[u]) {
            indegree[v]--;
            if (indegree[v] === 0) queue.push(v);
        }
    }
    return count === numCourses;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) {
        console.log('true');
        return;
    }
    const numCourses = parseInt(lines[0].trim(), 10);
    const m = lines.length > 1 && lines[1].trim() ? parseInt(lines[1].trim(), 10) : 0;
    const prereqs = [];
    for (let i = 2; i < 2 + m; i++) {
        if (lines[i] && lines[i].trim()) {
            prereqs.push(lines[i].trim().split(/\\s+/).map(Number));
        }
    }
    console.log(canFinish(numCourses, prereqs) ? 'true' : 'false');
}

main();
`,
  },

  // 7. word-search
  "word-search": {
    slug: "word-search",
    pythonRef: `import sys

def exist(board, word):
    if not board or not board[0]:
        return False
    m, n = len(board), len(board[0])

    def dfs(r, c, k):
        if k == len(word):
            return True
        if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != word[k]:
            return False
        tmp = board[r][c]
        board[r][c] = "#"
        found = (dfs(r + 1, c, k + 1) or
                 dfs(r - 1, c, k + 1) or
                 dfs(r, c + 1, k + 1) or
                 dfs(r, c - 1, k + 1))
        board[r][c] = tmp
        return found

    for i in range(m):
        for j in range(n):
            if board[i][j] == word[0] and dfs(i, j, 0):
                return True
    return False

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print("false")
        return
    parts = lines[0].strip().split()
    m, n = int(parts[0]), int(parts[1])
    board = []
    for i in range(1, 1 + m):
        if i < len(lines):
            board.append(list(lines[i].strip()))
    word = lines[1 + m].strip() if 1 + m < len(lines) else ""
    print("true" if exist(board, word) else "false")

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def exist_brute(board, word):
    if not board or not board[0]:
        return False
    m, n = len(board), len(board[0])
    visited = set()

    def search(r, c, idx):
        if idx == len(word):
            return True
        if r < 0 or r >= m or c < 0 or c >= n or (r, c) in visited or board[r][c] != word[idx]:
            return False
        visited.add((r, c))
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            if search(r + dr, c + dc, idx + 1):
                visited.remove((r, c))
                return True
        visited.remove((r, c))
        return False

    for i in range(m):
        for j in range(n):
            if board[i][j] == word[0]:
                if search(i, j, 0):
                    return True
    return False

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print("false")
        return
    parts = lines[0].strip().split()
    m, n = int(parts[0]), int(parts[1])
    board = []
    for i in range(1, 1 + m):
        if i < len(lines):
            board.append(list(lines[i].strip()))
    word = lines[1 + m].strip() if 1 + m < len(lines) else ""
    print("true" if exist_brute(board, word) else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function exist(board, word) {
    if (!board.length || !board[0].length) return false;
    const m = board.length, n = board[0].length;

    function dfs(r, c, k) {
        if (k === word.length) return true;
        if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== word[k]) return false;
        const tmp = board[r][c];
        board[r][c] = '#';
        const found = dfs(r + 1, c, k + 1) ||
                      dfs(r - 1, c, k + 1) ||
                      dfs(r, c + 1, k + 1) ||
                      dfs(r, c - 1, k + 1);
        board[r][c] = tmp;
        return found;
    }

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (board[i][j] === word[0] && dfs(i, j, 0)) return true;
        }
    }
    return false;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) {
        console.log('false');
        return;
    }
    const [m, n] = lines[0].trim().split(/\\s+/).map(Number);
    const board = [];
    for (let i = 1; i <= m; i++) {
        if (lines[i]) {
            board.push(lines[i].trim().split(''));
        }
    }
    const word = lines[1 + m] ? lines[1 + m].trim() : '';
    console.log(exist(board, word) ? 'true' : 'false');
}

main();
`,
  },

  // 8. median-of-two-sorted-arrays
  "median-of-two-sorted-arrays": {
    slug: "median-of-two-sorted-arrays",
    pythonRef: `import sys

def find_median_sorted_arrays(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    low, high = 0, m

    while low <= high:
        i = (low + high) // 2
        j = (m + n + 1) // 2 - i

        max_left1 = float('-inf') if i == 0 else nums1[i - 1]
        min_right1 = float('inf') if i == m else nums1[i]

        max_left2 = float('-inf') if j == 0 else nums2[j - 1]
        min_right2 = float('inf') if j == n else nums2[j]

        if max_left1 <= min_right2 and max_left2 <= min_right1:
            if (m + n) % 2 == 1:
                return float(max(max_left1, max_left2))
            else:
                return (max(max_left1, max_left2) + min(min_right1, min_right2)) / 2.0
        elif max_left1 > min_right2:
            high = i - 1
        else:
            low = i + 1
    return 0.0

def format_median(val):
    if val == int(val):
        return str(int(val))
    return f"{val:.1f}"

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("0")
        return
    m = int(tokens[0])
    nums1 = [int(x) for x in tokens[1:1+m]]
    n = int(tokens[1+m])
    nums2 = [int(x) for x in tokens[2+m:2+m+n]]
    
    med = find_median_sorted_arrays(nums1, nums2)
    print(format_median(med))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def find_median_brute(nums1, nums2):
    merged = sorted(nums1 + nums2)
    tot = len(merged)
    if tot == 0:
        return 0.0
    if tot % 2 == 1:
        return float(merged[tot // 2])
    return (merged[tot // 2 - 1] + merged[tot // 2]) / 2.0

def format_median(val):
    if val == int(val):
        return str(int(val))
    return f"{val:.1f}"

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("0")
        return
    m = int(tokens[0])
    nums1 = [int(x) for x in tokens[1:1+m]]
    n = int(tokens[1+m])
    nums2 = [int(x) for x in tokens[2+m:2+m+n]]
    
    med = find_median_brute(nums1, nums2)
    print(format_median(med))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function findMedianSortedArrays(nums1, nums2) {
    if (nums1.length > nums2.length) {
        [nums1, nums2] = [nums2, nums1];
    }
    const m = nums1.length, n = nums2.length;
    let low = 0, high = m;

    while (low <= high) {
        const i = Math.floor((low + high) / 2);
        const j = Math.floor((m + n + 1) / 2) - i;

        const maxLeft1 = i === 0 ? -Infinity : nums1[i - 1];
        const minRight1 = i === m ? Infinity : nums1[i];

        const maxLeft2 = j === 0 ? -Infinity : nums2[j - 1];
        const minRight2 = j === n ? Infinity : nums2[j];

        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            if ((m + n) % 2 === 1) {
                return Math.max(maxLeft1, maxLeft2);
            } else {
                return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
            }
        } else if (maxLeft1 > minRight2) {
            high = i - 1;
        } else {
            low = i + 1;
        }
    }
    return 0;
}

function formatMedian(val) {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log('0');
        return;
    }
    const m = parseInt(tokens[0], 10);
    const nums1 = tokens.slice(1, 1 + m).map(Number);
    const n = parseInt(tokens[1 + m], 10);
    const nums2 = tokens.slice(2 + m, 2 + m + n).map(Number);

    const med = findMedianSortedArrays(nums1, nums2);
    console.log(formatMedian(med));
}

main();
`,
  },

  // 9. edit-distance
  "edit-distance": {
    slug: "edit-distance",
    pythonRef: `import sys

def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]

def main():
    lines = sys.stdin.read().splitlines()
    word1 = lines[0].strip() if len(lines) > 0 else ""
    word2 = lines[1].strip() if len(lines) > 1 else ""
    print(min_distance(word1, word2))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def min_distance_brute(word1: str, word2: str) -> int:
    memo = {}

    def helper(i, j):
        if (i, j) in memo:
            return memo[(i, j)]
        if i == len(word1):
            return len(word2) - j
        if j == len(word2):
            return len(word1) - i
        if word1[i] == word2[j]:
            res = helper(i + 1, j + 1)
        else:
            res = 1 + min(
                helper(i + 1, j),       # delete
                helper(i, j + 1),       # insert
                helper(i + 1, j + 1)    # replace
            )
        memo[(i, j)] = res
        return res

    return helper(0, 0)

def main():
    lines = sys.stdin.read().splitlines()
    word1 = lines[0].strip() if len(lines) > 0 else ""
    word2 = lines[1].strip() if len(lines) > 1 else ""
    print(min_distance_brute(word1, word2))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function minDistance(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i - 1] === word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const word1 = lines[0] ? lines[0].trim() : '';
    const word2 = lines[1] ? lines[1].trim() : '';
    console.log(minDistance(word1, word2));
}

main();
`,
  },

  // 10. largest-rectangle-in-histogram
  "largest-rectangle-in-histogram": {
    slug: "largest-rectangle-in-histogram",
    pythonRef: `import sys

def largest_rectangle_area(heights):
    stack = []
    max_area = 0
    heights.append(0)
    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, height = stack.pop()
            max_area = max(max_area, height * (i - idx))
            start = idx
        stack.append((start, h))
    return max_area

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print(0)
        return
    n = int(lines[0].strip()) if lines[0].strip() else 0
    heights = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 and lines[1].strip() else []
    print(largest_rectangle_area(heights))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def largest_rectangle_area_brute(heights):
    n = len(heights)
    max_area = 0
    for i in range(n):
        min_h = heights[i]
        for j in range(i, n):
            min_h = min(min_h, heights[j])
            max_area = max(max_area, min_h * (j - i + 1))
    return max_area

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        print(0)
        return
    n = int(lines[0].strip()) if lines[0].strip() else 0
    heights = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 and lines[1].strip() else []
    print(largest_rectangle_area_brute(heights))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function largestRectangleArea(heights) {
    const stack = [];
    let maxArea = 0;
    const h = [...heights, 0];
    for (let i = 0; i < h.length; i++) {
        let start = i;
        while (stack.length > 0 && stack[stack.length - 1][1] > h[i]) {
            const [idx, height] = stack.pop();
            maxArea = Math.max(maxArea, height * (i - idx));
            start = idx;
        }
        stack.push([start, h[i]]);
    }
    return maxArea;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) {
        console.log(0);
        return;
    }
    const n = parseInt(lines[0].trim(), 10);
    const heights = n > 0 && lines.length > 1 && lines[1].trim() ? lines[1].trim().split(/\\s+/).map(Number) : [];
    console.log(largestRectangleArea(heights));
}

main();
`,
  },
};
