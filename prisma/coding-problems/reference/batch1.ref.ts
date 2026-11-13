export interface ProblemReference {
  slug: string;
  pythonRef: string;
  pythonBruteForce?: string;
  jsRef: string;
}

export const batch1References: Record<string, ProblemReference> = {
  "valid-palindrome": {
    slug: "valid-palindrome",
    pythonRef: `import sys

def is_palindrome(s: str) -> bool:
    filtered = [c.lower() for c in s if c.isalnum()]
    return filtered == filtered[::-1]

def main():
    lines = sys.stdin.read().splitlines()
    s = lines[0] if lines else ""
    result = is_palindrome(s)
    print("true" if result else "false")

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function isPalindrome(s) {
    const filtered = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    let l = 0, r = filtered.length - 1;
    while (l < r) {
        if (filtered[l] !== filtered[r]) return false;
        l++;
        r--;
    }
    return true;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const s = lines[0] || '';
    const result = isPalindrome(s);
    console.log(result ? 'true' : 'false');
}

main();
`,
  },

  "best-time-to-buy-and-sell-stock": {
    slug: "best-time-to-buy-and-sell-stock",
    pythonRef: `import sys

def max_profit(prices):
    min_price = float('inf')
    max_p = 0
    for p in prices:
        if p < min_price:
            min_price = p
        elif p - min_price > max_p:
            max_p = p - min_price
    return max_p

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    prices = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    print(max_profit(prices))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function maxProfit(prices) {
    let minPrice = Infinity;
    let maxP = 0;
    for (const p of prices) {
        if (p < minPrice) {
            minPrice = p;
        } else if (p - minPrice > maxP) {
            maxP = p - minPrice;
        }
    }
    return maxP;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const prices = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    console.log(maxProfit(prices));
}

main();
`,
  },

  "climbing-stairs": {
    slug: "climbing-stairs",
    pythonRef: `import sys

def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    print(climb_stairs(n))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function climbStairs(n) {
    if (n <= 2) return n;
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
        const next = a + b;
        a = b;
        b = next;
    }
    return b;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    console.log(climbStairs(n));
}

main();
`,
  },

  "binary-search": {
    slug: "binary-search",
    pythonRef: `import sys

def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    target = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())
    print(search(nums, target))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function search(nums, target) {
    let l = 0, r = nums.length - 1;
    while (l <= r) {
        const mid = Math.floor((l + r) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) l = mid + 1;
        else r = mid - 1;
    }
    return -1;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    const target = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);
    console.log(search(nums, target));
}

main();
`,
  },

  "product-of-array-except-self": {
    slug: "product-of-array-except-self",
    pythonRef: `import sys

def product_except_self(nums):
    n = len(nums)
    res = [1] * n
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    postfix = 1
    for i in range(n - 1, -1, -1):
        res[i] *= postfix
        postfix *= nums[i]
    return res

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    res = product_except_self(nums)
    print(" ".join(map(str, res)))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def product_except_self_brute(nums):
    n = len(nums)
    res = []
    for i in range(n):
        prod = 1
        for j in range(n):
            if i != j:
                prod *= nums[j]
        res.append(prod)
    return res

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    res = product_except_self_brute(nums)
    print(" ".join(map(str, res)))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function productExceptSelf(nums) {
    const n = nums.length;
    const res = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    let postfix = 1;
    for (let i = n - 1; i >= 0; i--) {
        res[i] *= postfix;
        postfix *= nums[i];
    }
    return res;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    const res = productExceptSelf(nums);
    console.log(res.join(' '));
}

main();
`,
  },

  "number-of-islands": {
    slug: "number-of-islands",
    pythonRef: `import sys
from collections import deque

def num_islands(grid):
    if not grid or not grid[0]:
        return 0
    m, n = len(grid), len(grid[0])
    visited = [[False] * n for _ in range(m)]
    islands = 0

    for i in range(m):
        for j in range(n):
            if grid[i][j] == '1' and not visited[i][j]:
                islands += 1
                queue = deque([(i, j)])
                visited[i][j] = True
                while queue:
                    r, c = queue.popleft()
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == '1' and not visited[nr][nc]:
                            visited[nr][nc] = True
                            queue.append((nr, nc))
    return islands

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    parts = lines[0].strip().split()
    if len(parts) < 2:
        return
    m, n = int(parts[0]), int(parts[1])
    grid = []
    for i in range(1, m + 1):
        if i < len(lines):
            row = lines[i].strip().split()
            grid.append(row)
    print(num_islands(grid))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def num_islands_brute(grid):
    if not grid or not grid[0]:
        return 0
    m, n = len(grid), len(grid[0])
    visited = set()
    count = 0

    def dfs(r, c):
        visited.add((r, c))
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == '1' and (nr, nc) not in visited:
                dfs(nr, nc)

    for i in range(m):
        for j in range(n):
            if grid[i][j] == '1' and (i, j) not in visited:
                count += 1
                dfs(i, j)
    return count

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    parts = lines[0].strip().split()
    if len(parts) < 2:
        return
    m, n = int(parts[0]), int(parts[1])
    grid = []
    for i in range(1, m + 1):
        if i < len(lines):
            row = lines[i].strip().split()
            grid.append(row)
    print(num_islands_brute(grid))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function numIslands(grid) {
    if (!grid.length || !grid[0].length) return 0;
    const m = grid.length, n = grid[0].length;
    let count = 0;

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (grid[i][j] === '1') {
                count++;
                const queue = [[i, j]];
                grid[i][j] = '0';
                while (queue.length > 0) {
                    const [r, c] = queue.shift();
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    for (const [dr, dc] of dirs) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === '1') {
                            grid[nr][nc] = '0';
                            queue.push([nr, nc]);
                        }
                    }
                }
            }
        }
    }
    return count;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const [m, n] = lines[0].trim().split(/\\s+/).map(Number);
    const grid = [];
    for (let i = 1; i <= m; i++) {
        if (lines[i]) {
            grid.push(lines[i].trim().split(/\\s+/));
        }
    }
    console.log(numIslands(grid));
}

main();
`,
  },

  "coin-change": {
    slug: "coin-change",
    pythonRef: `import sys

def coin_change(coins, amount):
    if amount == 0:
        return 0
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if a - c >= 0:
                dp[a] = min(dp[a], 1 + dp[a - c])
    return dp[amount] if dp[amount] != float('inf') else -1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    coins = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    amount = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())
    print(coin_change(coins, amount))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys
from collections import deque

def coin_change_brute(coins, amount):
    if amount == 0:
        return 0
    queue = deque([(0, 0)])
    visited = {0}
    coins = sorted([c for c in coins if c <= amount], reverse=True)
    while queue:
        curr, steps = queue.popleft()
        for c in coins:
            nxt = curr + c
            if nxt == amount:
                return steps + 1
            if nxt < amount and nxt not in visited:
                visited.add(nxt)
                queue.append((nxt, steps + 1))
    return -1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    coins = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    amount = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())
    print(coin_change_brute(coins, amount))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function coinChange(coins, amount) {
    if (amount === 0) return 0;
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let a = 1; a <= amount; a++) {
        for (const c of coins) {
            if (a - c >= 0) {
                dp[a] = Math.min(dp[a], 1 + dp[a - c]);
            }
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const coins = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    const amount = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);
    console.log(coinChange(coins, amount));
}

main();
`,
  },

  "search-in-rotated-sorted-array": {
    slug: "search-in-rotated-sorted-array",
    pythonRef: `import sys

def search_rotated(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        if nums[l] <= nums[mid]:
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        else:
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    return -1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    target = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())
    print(search_rotated(nums, target))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def search_rotated_brute(nums, target):
    for i, x in enumerate(nums):
        if x == target:
            return i
    return -1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    target = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())
    print(search_rotated_brute(nums, target))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function searchRotated(nums, target) {
    let l = 0, r = nums.length - 1;
    while (l <= r) {
        const mid = Math.floor((l + r) / 2);
        if (nums[mid] === target) return mid;
        if (nums[l] <= nums[mid]) {
            if (nums[l] <= target && target < nums[mid]) {
                r = mid - 1;
            } else {
                l = mid + 1;
            }
        } else {
            if (nums[mid] < target && target <= nums[r]) {
                l = mid + 1;
            } else {
                r = mid - 1;
            }
        }
    }
    return -1;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    const target = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);
    console.log(searchRotated(nums, target));
}

main();
`,
  },

  "trapping-rain-water": {
    slug: "trapping-rain-water",
    pythonRef: `import sys

def trap(height):
    if not height:
        return 0
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]
    water = 0
    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])
            water += left_max - height[l]
        else:
            r -= 1
            right_max = max(right_max, height[r])
            water += right_max - height[r]
    return water

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    height = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    print(trap(height))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def trap_brute(height):
    n = len(height)
    water = 0
    for i in range(n):
        left_max = max(height[:i+1])
        right_max = max(height[i:])
        water += min(left_max, right_max) - height[i]
    return water

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    height = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []
    print(trap_brute(height))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function trap(height) {
    if (!height.length) return 0;
    let l = 0, r = height.length - 1;
    let leftMax = height[l], rightMax = height[r];
    let water = 0;
    while (l < r) {
        if (leftMax < rightMax) {
            l++;
            leftMax = Math.max(leftMax, height[l]);
            water += leftMax - height[l];
        } else {
            r--;
            rightMax = Math.max(rightMax, height[r]);
            water += rightMax - height[r];
        }
    }
    return water;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const height = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];
    console.log(trap(height));
}

main();
`,
  },

  "longest-valid-parentheses": {
    slug: "longest-valid-parentheses",
    pythonRef: `import sys

def longest_valid_parentheses(s: str) -> int:
    stack = [-1]
    max_len = 0
    for i, ch in enumerate(s):
        if ch == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)
            else:
                max_len = max(max_len, i - stack[-1])
    return max_len

def main():
    lines = sys.stdin.read().splitlines()
    s = lines[0].strip() if lines else ""
    print(longest_valid_parentheses(s))

if __name__ == "__main__":
    main()
`,
    pythonBruteForce: `import sys

def longest_valid_parentheses_brute(s: str) -> int:
    n = len(s)
    dp = [0] * n
    max_len = 0
    for i in range(1, n):
        if s[i] == ')':
            if s[i - 1] == '(':
                dp[i] = (dp[i - 2] if i >= 2 else 0) + 2
            elif i - dp[i - 1] > 0 and s[i - dp[i - 1] - 1] == '(':
                prev = dp[i - dp[i - 1] - 2] if (i - dp[i - 1] >= 2) else 0
                dp[i] = dp[i - 1] + prev + 2
            max_len = max(max_len, dp[i])
    return max_len

def main():
    lines = sys.stdin.read().splitlines()
    s = lines[0].strip() if lines else ""
    print(longest_valid_parentheses_brute(s))

if __name__ == "__main__":
    main()
`,
    jsRef: `const fs = require('fs');

function longestValidParentheses(s) {
    const stack = [-1];
    let maxLen = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') {
            stack.push(i);
        } else {
            stack.pop();
            if (stack.length === 0) {
                stack.push(i);
            } else {
                maxLen = Math.max(maxLen, i - stack[stack.length - 1]);
            }
        }
    }
    return maxLen;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const s = lines[0] ? lines[0].trim() : '';
    console.log(longestValidParentheses(s));
}

main();
`,
  },
};
