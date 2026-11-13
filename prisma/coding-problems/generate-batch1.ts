import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { batch1References } from "./reference/batch1.ref";

function getPythonCommand(): string {
  const candidates = [
    "C:\\Users\\abbas\\AppData\\Local\\Programs\\Python\\Python315\\python.exe",
    "python",
    "python3",
    "py",
  ];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ["--version"], { encoding: "utf-8" });
      if (res.status === 0) {
        return cmd;
      }
    } catch {}
  }
  throw new Error("No working Python executable found");
}

const pythonCmd = getPythonCommand();
console.log(`Using Python executable: ${pythonCmd}`);

function runPython(code: string, stdin: string): string {
  const res = spawnSync(pythonCmd, ["-c", code], {
    input: stdin,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(`Python execution failed (exit ${res.status}): ${res.stderr}`);
  }
  return res.stdout.trim();
}

interface RawProblemDef {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  description: string;
  starterCode: {
    python: string;
    javascript: string;
    java: string;
  };
  sampleInputs: string[];
  hiddenInputs: string[];
}

const rawProblems: RawProblemDef[] = [
  // 1. valid-palindrome
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "easy",
    tags: ["strings", "two-pointers"],
    description: `### Problem Statement
A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

### Input Format
- Line 1: A single line containing the string \`s\`.

### Output Format
- Print \`true\` if the string is a palindrome, or \`false\` otherwise.

### Constraints
- 1 <= s.length <= 2 * 10^5
- \`s\` consists only of printable ASCII characters.

### Examples

#### Example 1
**Input:**
\`\`\`
A man, a plan, a canal: Panama
\`\`\`
**Output:**
\`\`\`
true
\`\`\`
**Explanation:** \`"amanaplanacanalpanama"\` is a palindrome.

#### Example 2
**Input:**
\`\`\`
race a car
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
**Explanation:** \`"raceacar"\` is not a palindrome.
`,
    starterCode: {
      python: `import sys

def is_palindrome(s: str) -> bool:
    # TODO: Return True if s is a palindrome, False otherwise
    return False

def main():
    lines = sys.stdin.read().splitlines()
    s = lines[0] if lines else ""
    result = is_palindrome(s)
    print("true" if result else "false")

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function isPalindrome(s) {
    // TODO: Return true if s is a palindrome, false otherwise
    return false;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const s = lines[0] || '';
    const result = isPalindrome(s);
    console.log(result ? 'true' : 'false');
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static boolean isPalindrome(String s) {
        // TODO: Return true if s is a palindrome, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNextLine() ? scanner.nextLine() : "";
        boolean result = isPalindrome(s);
        System.out.println(result ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "A man, a plan, a canal: Panama\n",
      "race a car\n",
    ],
    hiddenInputs: [
      "a\n",
      " ,:;!? \n",
      "0P\n",
      "12321\n",
      "Was it a car or a cat I saw? No, it was a racecar in Panama, a canal, a plan!\n",
    ],
  },

  // 2. best-time-to-buy-and-sell-stock
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
    tags: ["arrays", "dynamic-programming"],
    description: `### Problem Statement
You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`-th day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.

### Input Format
- Line 1: An integer \`n\`, representing the number of days.
- Line 2: \`n\` space-separated integers representing the stock prices.

### Output Format
- Print a single integer representing the maximum profit achievable.

### Constraints
- 1 <= n <= 10^5
- 0 <= prices[i] <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
6
7 1 5 3 6 4
\`\`\`
**Output:**
\`\`\`
5
\`\`\`
**Explanation:** Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.

#### Example 2
**Input:**
\`\`\`
5
7 6 4 3 1
\`\`\`
**Output:**
\`\`\`
0
\`\`\`
**Explanation:** In this case, no transactions are done and the max profit is 0.
`,
    starterCode: {
      python: `import sys

def max_profit(prices):
    # TODO: Return maximum profit from buying and selling stock
    return 0

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
      javascript: `const fs = require('fs');

function maxProfit(prices) {
    // TODO: Return maximum profit from buying and selling stock
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int maxProfit(int[] prices) {
        // TODO: Return maximum profit from buying and selling stock
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] prices = new int[n];
        for (int i = 0; i < n; i++) {
            prices[i] = scanner.nextInt();
        }
        System.out.println(maxProfit(prices));
    }
}
`,
    },
    sampleInputs: [
      "6\n7 1 5 3 6 4\n",
      "5\n7 6 4 3 1\n",
    ],
    hiddenInputs: [
      "1\n5\n",
      "5\n3 3 3 3 3\n",
      "6\n1 2 4 7 11 16\n",
      "6\n2 10 1 3 4 1\n",
      "20\n30 29 28 25 24 20 19 15 14 12 11 10 9 7 5 3 2 1 100 0\n",
    ],
  },

  // 3. climbing-stairs
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "easy",
    tags: ["math", "dynamic-programming"],
    description: `### Problem Statement
You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?

### Input Format
- Line 1: An integer \`n\`.

### Output Format
- Print a single integer representing the number of distinct ways to climb to the top.

### Constraints
- 1 <= n <= 45

### Examples

#### Example 1
**Input:**
\`\`\`
2
\`\`\`
**Output:**
\`\`\`
2
\`\`\`
**Explanation:** There are two ways to climb to the top:
1. 1 step + 1 step
2. 2 steps

#### Example 2
**Input:**
\`\`\`
3
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:** There are three ways to climb to the top:
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step
`,
    starterCode: {
      python: `import sys

def climb_stairs(n: int) -> int:
    # TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps
    return 0

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    print(climb_stairs(n))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function climbStairs(n) {
    // TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps
    return 0;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    console.log(climbStairs(n));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int climbStairs(int n) {
        // TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        System.out.println(climbStairs(n));
    }
}
`,
    },
    sampleInputs: [
      "2\n",
      "3\n",
    ],
    hiddenInputs: [
      "1\n",
      "4\n",
      "5\n",
      "10\n",
      "45\n",
    ],
  },

  // 4. binary-search
  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "easy",
    tags: ["arrays", "binary-search"],
    description: `### Problem Statement
Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its 0-based index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.

### Input Format
- Line 1: An integer \`n\`, representing the number of elements in \`nums\`.
- Line 2: \`n\` space-separated integers representing the sorted array \`nums\`.
- Line 3: An integer \`target\`.

### Output Format
- Print a single integer representing the 0-based index of \`target\`, or \`-1\` if not found.

### Constraints
- 1 <= n <= 10^4
- -10^4 < nums[i], target < 10^4
- All integers in \`nums\` are unique.
- \`nums\` is sorted in ascending order.

### Examples

#### Example 1
**Input:**
\`\`\`
6
-1 0 3 5 9 12
9
\`\`\`
**Output:**
\`\`\`
4
\`\`\`
**Explanation:** 9 exists in \`nums\` and its index is 4.

#### Example 2
**Input:**
\`\`\`
6
-1 0 3 5 9 12
2
\`\`\`
**Output:**
\`\`\`
-1
\`\`\`
**Explanation:** 2 does not exist in \`nums\` so return -1.
`,
    starterCode: {
      python: `import sys

def search(nums, target):
    # TODO: Return index of target in sorted nums, or -1 if not found
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
      javascript: `const fs = require('fs');

function search(nums, target) {
    // TODO: Return index of target in sorted nums, or -1 if not found
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
      java: `import java.util.*;

public class Main {
    public static int search(int[] nums, int target) {
        // TODO: Return index of target in sorted nums, or -1 if not found
        return -1;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int target = scanner.nextInt();
        System.out.println(search(nums, target));
    }
}
`,
    },
    sampleInputs: [
      "6\n-1 0 3 5 9 12\n9\n",
      "6\n-1 0 3 5 9 12\n2\n",
    ],
    hiddenInputs: [
      "1\n5\n5\n",
      "1\n5\n2\n",
      "5\n-10 -5 0 5 10\n-10\n",
      "5\n-10 -5 0 5 10\n10\n",
      "15\n-50 -40 -30 -20 -10 -5 0 2 8 15 22 35 48 60 75\n35\n",
    ],
  },

  // 5. product-of-array-except-self
  {
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "medium",
    tags: ["arrays", "prefix-sum"],
    description: `### Problem Statement
Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

The product of any prefix or suffix of \`nums\` is guaranteed to fit in a **32-bit** integer.

You must write an algorithm that runs in \`O(n)\` time and without using the division operation.

### Input Format
- Line 1: An integer \`n\`, representing the number of elements in the array.
- Line 2: \`n\` space-separated integers representing \`nums\`.

### Output Format
- Print \`n\` space-separated integers representing the answer array.

### Constraints
- 2 <= n <= 10^5
- -30 <= nums[i] <= 30
- The product of any prefix or suffix of \`nums\` is guaranteed to fit in a 32-bit integer.

### Examples

#### Example 1
**Input:**
\`\`\`
4
1 2 3 4
\`\`\`
**Output:**
\`\`\`
24 12 8 6
\`\`\`

#### Example 2
**Input:**
\`\`\`
5
-1 1 0 -3 3
\`\`\`
**Output:**
\`\`\`
0 0 9 0 0
\`\`\`
`,
    starterCode: {
      python: `import sys

def product_except_self(nums):
    # TODO: Return array where output[i] is product of all elements except nums[i] without division
    return []

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
      javascript: `const fs = require('fs');

function productExceptSelf(nums) {
    // TODO: Return array where output[i] is product of all elements except nums[i] without division
    return [];
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
      java: `import java.util.*;

public class Main {
    public static int[] productExceptSelf(int[] nums) {
        // TODO: Return array where output[i] is product of all elements except nums[i] without division
        return new int[]{};
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int[] res = productExceptSelf(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < res.length; i++) {
            if (i > 0) sb.append(" ");
            sb.append(res[i]);
        }
        System.out.println(sb.toString());
    }
}
`,
    },
    sampleInputs: [
      "4\n1 2 3 4\n",
      "5\n-1 1 0 -3 3\n",
    ],
    hiddenInputs: [
      "2\n5 10\n",
      "4\n0 4 0 2\n",
      "4\n-1 -2 -3 -4\n",
      "5\n2 2 2 2 2\n",
      "12\n1 -1 2 -2 1 1 -1 2 1 -2 1 2\n",
    ],
  },

  // 6. number-of-islands
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "medium",
    tags: ["graphs", "bfs-dfs"],
    description: `### Problem Statement
Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

### Input Format
- Line 1: Two space-separated integers \`m\` and \`n\`, representing the number of rows and columns.
- Next \`m\` lines: Each line contains \`n\` space-separated characters (\`'1'\` or \`'0'\`) representing a row in the grid.

### Output Format
- Print a single integer representing the total number of islands.

### Constraints
- 1 <= m, n <= 300
- grid[i][j] is '0' or '1'.

### Examples

#### Example 1
**Input:**
\`\`\`
4 5
1 1 1 1 0
1 1 0 1 0
1 1 0 0 0
0 0 0 0 0
\`\`\`
**Output:**
\`\`\`
1
\`\`\`

#### Example 2
**Input:**
\`\`\`
4 5
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
`,
    starterCode: {
      python: `import sys

def num_islands(grid):
    # TODO: Return total number of connected land components
    return 0

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
      javascript: `const fs = require('fs');

function numIslands(grid) {
    // TODO: Return total number of connected land components
    return 0;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const [m, n] = lines[0].trim().split(/\s+/).map(Number);
    const grid = [];
    for (let i = 1; i <= m; i++) {
        if (lines[i]) {
            grid.push(lines[i].trim().split(/\s+/));
        }
    }
    console.log(numIslands(grid));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int numIslands(char[][] grid) {
        // TODO: Return total number of connected land components
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int m = scanner.nextInt();
        int n = scanner.nextInt();
        char[][] grid = new char[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                grid[i][j] = scanner.next().charAt(0);
            }
        }
        System.out.println(numIslands(grid));
    }
}
`,
    },
    sampleInputs: [
      "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0\n",
      "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1\n",
    ],
    hiddenInputs: [
      "1 1\n1\n",
      "1 1\n0\n",
      "3 3\n1 1 1\n1 1 1\n1 1 1\n",
      "3 3\n1 0 1\n0 1 0\n1 0 1\n",
      "6 6\n1 0 0 0 0 1\n0 1 1 1 1 0\n0 1 0 0 1 0\n0 1 0 0 1 0\n0 1 1 1 1 0\n1 0 0 0 0 1\n",
    ],
  },

  // 7. coin-change
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "medium",
    tags: ["dynamic-programming", "breadth-first-search"],
    description: `### Problem Statement
You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.

### Input Format
- Line 1: An integer \`n\`, the number of coin denominations.
- Line 2: \`n\` space-separated integers representing the coin denominations.
- Line 3: An integer \`amount\`.

### Output Format
- Print a single integer representing the minimum number of coins needed, or \`-1\` if impossible.

### Constraints
- 1 <= coins.length <= 12
- 1 <= coins[i] <= 2^31 - 1
- 0 <= amount <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
3
1 2 5
11
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:** 11 = 5 + 5 + 1 (3 coins).

#### Example 2
**Input:**
\`\`\`
1
2
3
\`\`\`
**Output:**
\`\`\`
-1
\`\`\`

#### Example 3
**Input:**
\`\`\`
1
1
0
\`\`\`
**Output:**
\`\`\`
0
\`\`\`
`,
    starterCode: {
      python: `import sys

def coin_change(coins, amount):
    # TODO: Return minimum coins to make amount, or -1 if impossible
    return -1

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
      javascript: `const fs = require('fs');

function coinChange(coins, amount) {
    // TODO: Return minimum coins to make amount, or -1 if impossible
    return -1;
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
      java: `import java.util.*;

public class Main {
    public static int coinChange(int[] coins, int amount) {
        // TODO: Return minimum coins to make amount, or -1 if impossible
        return -1;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] coins = new int[n];
        for (int i = 0; i < n; i++) {
            coins[i] = scanner.nextInt();
        }
        int amount = scanner.nextInt();
        System.out.println(coinChange(coins, amount));
    }
}
`,
    },
    sampleInputs: [
      "3\n1 2 5\n11\n",
      "1\n2\n3\n",
    ],
    hiddenInputs: [
      "1\n1\n0\n",
      "1\n5\n5\n",
      "3\n1 3 4\n6\n",
      "2\n4 6\n7\n",
      "4\n1 5 10 25\n99\n",
    ],
  },

  // 8. search-in-rotated-sorted-array
  {
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "medium",
    tags: ["arrays", "binary-search"],
    description: `### Problem Statement
There is an integer array \`nums\` sorted in ascending order (with distinct values).

Prior to being passed to your function, \`nums\` is possibly rotated at an unknown pivot index \`k\` (\`1 <= k < nums.length\`) such that the resulting array is \`[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]\` (0-indexed).

Given the array \`nums\` after the possible rotation and an integer \`target\`, return the 0-based index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

You must write an algorithm with \`O(log n)\` runtime complexity.

### Input Format
- Line 1: An integer \`n\`, representing the number of elements in \`nums\`.
- Line 2: \`n\` space-separated integers representing \`nums\`.
- Line 3: An integer \`target\`.

### Output Format
- Print a single integer representing the 0-based index of \`target\`, or \`-1\` if not found.

### Constraints
- 1 <= nums.length <= 5000
- -10^4 <= nums[i] <= 10^4
- All values of \`nums\` are unique.
- \`nums\` is an ascending array that is possibly rotated.
- -10^4 <= target <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
7
4 5 6 7 0 1 2
0
\`\`\`
**Output:**
\`\`\`
4
\`\`\`

#### Example 2
**Input:**
\`\`\`
7
4 5 6 7 0 1 2
3
\`\`\`
**Output:**
\`\`\`
-1
\`\`\`
`,
    starterCode: {
      python: `import sys

def search_rotated(nums, target):
    # TODO: Return index of target in rotated sorted array nums, or -1 if not found
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
      javascript: `const fs = require('fs');

function searchRotated(nums, target) {
    // TODO: Return index of target in rotated sorted array nums, or -1 if not found
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
      java: `import java.util.*;

public class Main {
    public static int searchRotated(int[] nums, int target) {
        // TODO: Return index of target in rotated sorted array nums, or -1 if not found
        return -1;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int target = scanner.nextInt();
        System.out.println(searchRotated(nums, target));
    }
}
`,
    },
    sampleInputs: [
      "7\n4 5 6 7 0 1 2\n0\n",
      "7\n4 5 6 7 0 1 2\n3\n",
    ],
    hiddenInputs: [
      "1\n1\n1\n",
      "1\n1\n0\n",
      "5\n1 2 3 4 5\n3\n",
      "5\n5 1 2 3 4\n5\n",
      "10\n10 12 15 18 20 1 3 5 7 9\n15\n",
    ],
  },

  // 9. trapping-rain-water
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    tags: ["arrays", "two-pointers", "stack"],
    description: `### Problem Statement
Given \`n\` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

### Input Format
- Line 1: An integer \`n\`, representing the number of bars.
- Line 2: \`n\` space-separated integers representing the elevation heights.

### Output Format
- Print a single integer representing the total amount of trapped rainwater.

### Constraints
- 1 <= n <= 2 * 10^4
- 0 <= height[i] <= 10^5

### Examples

#### Example 1
**Input:**
\`\`\`
12
0 1 0 2 1 0 1 3 2 1 2 1
\`\`\`
**Output:**
\`\`\`
6
\`\`\`
**Explanation:** The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.

#### Example 2
**Input:**
\`\`\`
6
4 2 0 3 2 5
\`\`\`
**Output:**
\`\`\`
9
\`\`\`
`,
    starterCode: {
      python: `import sys

def trap(height):
    # TODO: Return total units of trapped rain water
    return 0

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
      javascript: `const fs = require('fs');

function trap(height) {
    // TODO: Return total units of trapped rain water
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int trap(int[] height) {
        // TODO: Return total units of trapped rain water
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] height = new int[n];
        for (int i = 0; i < n; i++) {
            height[i] = scanner.nextInt();
        }
        System.out.println(trap(height));
    }
}
`,
    },
    sampleInputs: [
      "12\n0 1 0 2 1 0 1 3 2 1 2 1\n",
      "6\n4 2 0 3 2 5\n",
    ],
    hiddenInputs: [
      "1\n5\n",
      "5\n5 4 3 2 1\n",
      "5\n1 2 3 4 5\n",
      "5\n5 0 0 0 5\n",
      "15\n3 0 2 0 4 1 0 2 1 5 2 0 1 3 2\n",
    ],
  },

  // 10. longest-valid-parentheses
  {
    slug: "longest-valid-parentheses",
    title: "Longest Valid Parentheses",
    difficulty: "hard",
    tags: ["strings", "dynamic-programming", "stack"],
    description: `### Problem Statement
Given a string \`s\` containing just the characters \`'('\` and \`')'\`, return the length of the longest valid (well-formed) parentheses substring.

### Input Format
- Line 1: A string \`s\` containing only parentheses characters. (If \`s\` is empty, the line is empty).

### Output Format
- Print a single integer representing the length of the longest valid parentheses substring.

### Constraints
- 0 <= s.length <= 3 * 10^4
- \`s[i]\` is '(' or ')'.

### Examples

#### Example 1
**Input:**
\`\`\`
(()
\`\`\`
**Output:**
\`\`\`
2
\`\`\`
**Explanation:** The longest valid parentheses substring is \`"()"\`.

#### Example 2
**Input:**
\`\`\`
)()())
\`\`\`
**Output:**
\`\`\`
4
\`\`\`
**Explanation:** The longest valid parentheses substring is \`"()()"\`.

#### Example 3
**Input:**
\`\`\`

\`\`\`
**Output:**
\`\`\`
0
\`\`\`
`,
    starterCode: {
      python: `import sys

def longest_valid_parentheses(s: str) -> int:
    # TODO: Return length of longest valid parentheses substring
    return 0

def main():
    lines = sys.stdin.read().splitlines()
    s = lines[0].strip() if lines else ""
    print(longest_valid_parentheses(s))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function longestValidParentheses(s) {
    // TODO: Return length of longest valid parentheses substring
    return 0;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const s = lines[0] ? lines[0].trim() : '';
    console.log(longestValidParentheses(s));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int longestValidParentheses(String s) {
        // TODO: Return length of longest valid parentheses substring
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNextLine() ? scanner.nextLine().trim() : "";
        System.out.println(longestValidParentheses(s));
    }
}
`,
    },
    sampleInputs: [
      "(()\n",
      ")()())\n",
    ],
    hiddenInputs: [
      "\n",
      "(((((\n",
      "((()))\n",
      "())(()())((\n",
      "()((()))())(()())(())()((()()()())\n",
    ],
  },
];

console.log("Generating batch1 problems with Python reference expected outputs...");

const generatedProblems = rawProblems.map((p) => {
  const ref = batch1References[p.slug];
  if (!ref) {
    throw new Error(`Missing reference solution for ${p.slug}`);
  }

  const sampleTests = p.sampleInputs.map((input) => {
    const expectedOutput = runPython(ref.pythonRef, input);
    return { input, expectedOutput };
  });

  const hiddenTests = p.hiddenInputs.map((input) => {
    const expectedOutput = runPython(ref.pythonRef, input);
    return { input, expectedOutput };
  });

  return {
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    description: p.description,
    starterCode: p.starterCode,
    sampleTests,
    hiddenTests,
  };
});

const fileContent = `export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface CodingProblemSeed {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  description: string;
  starterCode: {
    python: string;
    javascript: string;
    java: string;
  };
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
}

export const batch1Problems: CodingProblemSeed[] = ${JSON.stringify(generatedProblems, null, 2)};
`;

const outputPath = path.resolve(process.cwd(), "prisma/coding-problems/batch1.ts");
fs.writeFileSync(outputPath, fileContent, "utf-8");
console.log(`Successfully generated ${generatedProblems.length} problems in ${outputPath}!`);
