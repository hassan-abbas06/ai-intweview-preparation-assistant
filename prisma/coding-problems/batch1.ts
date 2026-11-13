export interface TestCase {
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

export const batch1Problems: CodingProblemSeed[] = [
  {
    "slug": "valid-palindrome",
    "title": "Valid Palindrome",
    "difficulty": "easy",
    "tags": [
      "strings",
      "two-pointers"
    ],
    "description": "### Problem Statement\nA phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.\n\n### Input Format\n- Line 1: A single line containing the string `s`.\n\n### Output Format\n- Print `true` if the string is a palindrome, or `false` otherwise.\n\n### Constraints\n- 1 <= s.length <= 2 * 10^5\n- `s` consists only of printable ASCII characters.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\nA man, a plan, a canal: Panama\n```\n**Output:**\n```\ntrue\n```\n**Explanation:** `\"amanaplanacanalpanama\"` is a palindrome.\n\n#### Example 2\n**Input:**\n```\nrace a car\n```\n**Output:**\n```\nfalse\n```\n**Explanation:** `\"raceacar\"` is not a palindrome.\n",
    "starterCode": {
      "python": "import sys\n\ndef is_palindrome(s: str) -> bool:\n    # TODO: Return True if s is a palindrome, False otherwise\n    return False\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0] if lines else \"\"\n    result = is_palindrome(s)\n    print(\"true\" if result else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction isPalindrome(s) {\n    // TODO: Return true if s is a palindrome, false otherwise\n    return false;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);\n    const s = lines[0] || '';\n    const result = isPalindrome(s);\n    console.log(result ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean isPalindrome(String s) {\n        // TODO: Return true if s is a palindrome, false otherwise\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String s = scanner.hasNextLine() ? scanner.nextLine() : \"\";\n        boolean result = isPalindrome(s);\n        System.out.println(result ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "A man, a plan, a canal: Panama\n",
        "expectedOutput": "true"
      },
      {
        "input": "race a car\n",
        "expectedOutput": "false"
      }
    ],
    "hiddenTests": [
      {
        "input": "a\n",
        "expectedOutput": "true"
      },
      {
        "input": " ,:;!? \n",
        "expectedOutput": "true"
      },
      {
        "input": "0P\n",
        "expectedOutput": "false"
      },
      {
        "input": "12321\n",
        "expectedOutput": "true"
      },
      {
        "input": "Was it a car or a cat I saw? No, it was a racecar in Panama, a canal, a plan!\n",
        "expectedOutput": "false"
      }
    ]
  },
  {
    "slug": "best-time-to-buy-and-sell-stock",
    "title": "Best Time to Buy and Sell Stock",
    "difficulty": "easy",
    "tags": [
      "arrays",
      "dynamic-programming"
    ],
    "description": "### Problem Statement\nYou are given an array `prices` where `prices[i]` is the price of a given stock on the `i`-th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of days.\n- Line 2: `n` space-separated integers representing the stock prices.\n\n### Output Format\n- Print a single integer representing the maximum profit achievable.\n\n### Constraints\n- 1 <= n <= 10^5\n- 0 <= prices[i] <= 10^4\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\n7 1 5 3 6 4\n```\n**Output:**\n```\n5\n```\n**Explanation:** Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.\n\n#### Example 2\n**Input:**\n```\n5\n7 6 4 3 1\n```\n**Output:**\n```\n0\n```\n**Explanation:** In this case, no transactions are done and the max profit is 0.\n",
    "starterCode": {
      "python": "import sys\n\ndef max_profit(prices):\n    # TODO: Return maximum profit from buying and selling stock\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    prices = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    print(max_profit(prices))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction maxProfit(prices) {\n    // TODO: Return maximum profit from buying and selling stock\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const prices = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    console.log(maxProfit(prices));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int maxProfit(int[] prices) {\n        // TODO: Return maximum profit from buying and selling stock\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] prices = new int[n];\n        for (int i = 0; i < n; i++) {\n            prices[i] = scanner.nextInt();\n        }\n        System.out.println(maxProfit(prices));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\n7 1 5 3 6 4\n",
        "expectedOutput": "5"
      },
      {
        "input": "5\n7 6 4 3 1\n",
        "expectedOutput": "0"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n5\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n3 3 3 3 3\n",
        "expectedOutput": "0"
      },
      {
        "input": "6\n1 2 4 7 11 16\n",
        "expectedOutput": "15"
      },
      {
        "input": "6\n2 10 1 3 4 1\n",
        "expectedOutput": "8"
      },
      {
        "input": "20\n30 29 28 25 24 20 19 15 14 12 11 10 9 7 5 3 2 1 100 0\n",
        "expectedOutput": "99"
      }
    ]
  },
  {
    "slug": "climbing-stairs",
    "title": "Climbing Stairs",
    "difficulty": "easy",
    "tags": [
      "math",
      "dynamic-programming"
    ],
    "description": "### Problem Statement\nYou are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n### Input Format\n- Line 1: An integer `n`.\n\n### Output Format\n- Print a single integer representing the number of distinct ways to climb to the top.\n\n### Constraints\n- 1 <= n <= 45\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n2\n```\n**Output:**\n```\n2\n```\n**Explanation:** There are two ways to climb to the top:\n1. 1 step + 1 step\n2. 2 steps\n\n#### Example 2\n**Input:**\n```\n3\n```\n**Output:**\n```\n3\n```\n**Explanation:** There are three ways to climb to the top:\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step\n",
    "starterCode": {
      "python": "import sys\n\ndef climb_stairs(n: int) -> int:\n    # TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    print(climb_stairs(n))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction climbStairs(n) {\n    // TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    console.log(climbStairs(n));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int climbStairs(int n) {\n        // TODO: Return number of distinct ways to climb n stairs taking 1 or 2 steps\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        System.out.println(climbStairs(n));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "2\n",
        "expectedOutput": "2"
      },
      {
        "input": "3\n",
        "expectedOutput": "3"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n",
        "expectedOutput": "1"
      },
      {
        "input": "4\n",
        "expectedOutput": "5"
      },
      {
        "input": "5\n",
        "expectedOutput": "8"
      },
      {
        "input": "10\n",
        "expectedOutput": "89"
      },
      {
        "input": "45\n",
        "expectedOutput": "1836311903"
      }
    ]
  },
  {
    "slug": "binary-search",
    "title": "Binary Search",
    "difficulty": "easy",
    "tags": [
      "arrays",
      "binary-search"
    ],
    "description": "### Problem Statement\nGiven an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its 0-based index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of elements in `nums`.\n- Line 2: `n` space-separated integers representing the sorted array `nums`.\n- Line 3: An integer `target`.\n\n### Output Format\n- Print a single integer representing the 0-based index of `target`, or `-1` if not found.\n\n### Constraints\n- 1 <= n <= 10^4\n- -10^4 < nums[i], target < 10^4\n- All integers in `nums` are unique.\n- `nums` is sorted in ascending order.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\n-1 0 3 5 9 12\n9\n```\n**Output:**\n```\n4\n```\n**Explanation:** 9 exists in `nums` and its index is 4.\n\n#### Example 2\n**Input:**\n```\n6\n-1 0 3 5 9 12\n2\n```\n**Output:**\n```\n-1\n```\n**Explanation:** 2 does not exist in `nums` so return -1.\n",
    "starterCode": {
      "python": "import sys\n\ndef search(nums, target):\n    # TODO: Return index of target in sorted nums, or -1 if not found\n    return -1\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    target = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())\n    print(search(nums, target))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction search(nums, target) {\n    // TODO: Return index of target in sorted nums, or -1 if not found\n    return -1;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    const target = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);\n    console.log(search(nums, target));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int search(int[] nums, int target) {\n        // TODO: Return index of target in sorted nums, or -1 if not found\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        int target = scanner.nextInt();\n        System.out.println(search(nums, target));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\n-1 0 3 5 9 12\n9\n",
        "expectedOutput": "4"
      },
      {
        "input": "6\n-1 0 3 5 9 12\n2\n",
        "expectedOutput": "-1"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n5\n5\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n5\n2\n",
        "expectedOutput": "-1"
      },
      {
        "input": "5\n-10 -5 0 5 10\n-10\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n-10 -5 0 5 10\n10\n",
        "expectedOutput": "4"
      },
      {
        "input": "15\n-50 -40 -30 -20 -10 -5 0 2 8 15 22 35 48 60 75\n35\n",
        "expectedOutput": "11"
      }
    ]
  },
  {
    "slug": "product-of-array-except-self",
    "title": "Product of Array Except Self",
    "difficulty": "medium",
    "tags": [
      "arrays",
      "prefix-sum"
    ],
    "description": "### Problem Statement\nGiven an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a **32-bit** integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of elements in the array.\n- Line 2: `n` space-separated integers representing `nums`.\n\n### Output Format\n- Print `n` space-separated integers representing the answer array.\n\n### Constraints\n- 2 <= n <= 10^5\n- -30 <= nums[i] <= 30\n- The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n4\n1 2 3 4\n```\n**Output:**\n```\n24 12 8 6\n```\n\n#### Example 2\n**Input:**\n```\n5\n-1 1 0 -3 3\n```\n**Output:**\n```\n0 0 9 0 0\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef product_except_self(nums):\n    # TODO: Return array where output[i] is product of all elements except nums[i] without division\n    return []\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    res = product_except_self(nums)\n    print(\" \".join(map(str, res)))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction productExceptSelf(nums) {\n    // TODO: Return array where output[i] is product of all elements except nums[i] without division\n    return [];\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    const res = productExceptSelf(nums);\n    console.log(res.join(' '));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int[] productExceptSelf(int[] nums) {\n        // TODO: Return array where output[i] is product of all elements except nums[i] without division\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        int[] res = productExceptSelf(nums);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < res.length; i++) {\n            if (i > 0) sb.append(\" \");\n            sb.append(res[i]);\n        }\n        System.out.println(sb.toString());\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "24 12 8 6"
      },
      {
        "input": "5\n-1 1 0 -3 3\n",
        "expectedOutput": "0 0 9 0 0"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n5 10\n",
        "expectedOutput": "10 5"
      },
      {
        "input": "4\n0 4 0 2\n",
        "expectedOutput": "0 0 0 0"
      },
      {
        "input": "4\n-1 -2 -3 -4\n",
        "expectedOutput": "-24 -12 -8 -6"
      },
      {
        "input": "5\n2 2 2 2 2\n",
        "expectedOutput": "16 16 16 16 16"
      },
      {
        "input": "12\n1 -1 2 -2 1 1 -1 2 1 -2 1 2\n",
        "expectedOutput": "32 -32 16 -16 32 32 -32 16 32 -16 32 16"
      }
    ]
  },
  {
    "slug": "number-of-islands",
    "title": "Number of Islands",
    "difficulty": "medium",
    "tags": [
      "graphs",
      "bfs-dfs"
    ],
    "description": "### Problem Statement\nGiven an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.\n\n### Input Format\n- Line 1: Two space-separated integers `m` and `n`, representing the number of rows and columns.\n- Next `m` lines: Each line contains `n` space-separated characters (`'1'` or `'0'`) representing a row in the grid.\n\n### Output Format\n- Print a single integer representing the total number of islands.\n\n### Constraints\n- 1 <= m, n <= 300\n- grid[i][j] is '0' or '1'.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0\n```\n**Output:**\n```\n1\n```\n\n#### Example 2\n**Input:**\n```\n4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1\n```\n**Output:**\n```\n3\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef num_islands(grid):\n    # TODO: Return total number of connected land components\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    parts = lines[0].strip().split()\n    if len(parts) < 2:\n        return\n    m, n = int(parts[0]), int(parts[1])\n    grid = []\n    for i in range(1, m + 1):\n        if i < len(lines):\n            row = lines[i].strip().split()\n            grid.append(row)\n    print(num_islands(grid))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction numIslands(grid) {\n    // TODO: Return total number of connected land components\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const [m, n] = lines[0].trim().split(/s+/).map(Number);\n    const grid = [];\n    for (let i = 1; i <= m; i++) {\n        if (lines[i]) {\n            grid.push(lines[i].trim().split(/s+/));\n        }\n    }\n    console.log(numIslands(grid));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int numIslands(char[][] grid) {\n        // TODO: Return total number of connected land components\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int m = scanner.nextInt();\n        int n = scanner.nextInt();\n        char[][] grid = new char[m][n];\n        for (int i = 0; i < m; i++) {\n            for (int j = 0; j < n; j++) {\n                grid[i][j] = scanner.next().charAt(0);\n            }\n        }\n        System.out.println(numIslands(grid));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0\n",
        "expectedOutput": "1"
      },
      {
        "input": "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1\n",
        "expectedOutput": "3"
      }
    ],
    "hiddenTests": [
      {
        "input": "1 1\n1\n",
        "expectedOutput": "1"
      },
      {
        "input": "1 1\n0\n",
        "expectedOutput": "0"
      },
      {
        "input": "3 3\n1 1 1\n1 1 1\n1 1 1\n",
        "expectedOutput": "1"
      },
      {
        "input": "3 3\n1 0 1\n0 1 0\n1 0 1\n",
        "expectedOutput": "5"
      },
      {
        "input": "6 6\n1 0 0 0 0 1\n0 1 1 1 1 0\n0 1 0 0 1 0\n0 1 0 0 1 0\n0 1 1 1 1 0\n1 0 0 0 0 1\n",
        "expectedOutput": "5"
      }
    ]
  },
  {
    "slug": "coin-change",
    "title": "Coin Change",
    "difficulty": "medium",
    "tags": [
      "dynamic-programming",
      "breadth-first-search"
    ],
    "description": "### Problem Statement\nYou are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.\n\n### Input Format\n- Line 1: An integer `n`, the number of coin denominations.\n- Line 2: `n` space-separated integers representing the coin denominations.\n- Line 3: An integer `amount`.\n\n### Output Format\n- Print a single integer representing the minimum number of coins needed, or `-1` if impossible.\n\n### Constraints\n- 1 <= coins.length <= 12\n- 1 <= coins[i] <= 2^31 - 1\n- 0 <= amount <= 10^4\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3\n1 2 5\n11\n```\n**Output:**\n```\n3\n```\n**Explanation:** 11 = 5 + 5 + 1 (3 coins).\n\n#### Example 2\n**Input:**\n```\n1\n2\n3\n```\n**Output:**\n```\n-1\n```\n\n#### Example 3\n**Input:**\n```\n1\n1\n0\n```\n**Output:**\n```\n0\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef coin_change(coins, amount):\n    # TODO: Return minimum coins to make amount, or -1 if impossible\n    return -1\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    coins = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    amount = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())\n    print(coin_change(coins, amount))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction coinChange(coins, amount) {\n    // TODO: Return minimum coins to make amount, or -1 if impossible\n    return -1;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const coins = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    const amount = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);\n    console.log(coinChange(coins, amount));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int coinChange(int[] coins, int amount) {\n        // TODO: Return minimum coins to make amount, or -1 if impossible\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] coins = new int[n];\n        for (int i = 0; i < n; i++) {\n            coins[i] = scanner.nextInt();\n        }\n        int amount = scanner.nextInt();\n        System.out.println(coinChange(coins, amount));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3\n1 2 5\n11\n",
        "expectedOutput": "3"
      },
      {
        "input": "1\n2\n3\n",
        "expectedOutput": "-1"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n1\n0\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n5\n5\n",
        "expectedOutput": "1"
      },
      {
        "input": "3\n1 3 4\n6\n",
        "expectedOutput": "2"
      },
      {
        "input": "2\n4 6\n7\n",
        "expectedOutput": "-1"
      },
      {
        "input": "4\n1 5 10 25\n99\n",
        "expectedOutput": "9"
      }
    ]
  },
  {
    "slug": "search-in-rotated-sorted-array",
    "title": "Search in Rotated Sorted Array",
    "difficulty": "medium",
    "tags": [
      "arrays",
      "binary-search"
    ],
    "description": "### Problem Statement\nThere is an integer array `nums` sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k` (`1 <= k < nums.length`) such that the resulting array is `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]` (0-indexed).\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the 0-based index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of elements in `nums`.\n- Line 2: `n` space-separated integers representing `nums`.\n- Line 3: An integer `target`.\n\n### Output Format\n- Print a single integer representing the 0-based index of `target`, or `-1` if not found.\n\n### Constraints\n- 1 <= nums.length <= 5000\n- -10^4 <= nums[i] <= 10^4\n- All values of `nums` are unique.\n- `nums` is an ascending array that is possibly rotated.\n- -10^4 <= target <= 10^4\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n7\n4 5 6 7 0 1 2\n0\n```\n**Output:**\n```\n4\n```\n\n#### Example 2\n**Input:**\n```\n7\n4 5 6 7 0 1 2\n3\n```\n**Output:**\n```\n-1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef search_rotated(nums, target):\n    # TODO: Return index of target in rotated sorted array nums, or -1 if not found\n    return -1\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    target = int(lines[2].strip()) if len(lines) > 2 else int(lines[1].strip())\n    print(search_rotated(nums, target))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction searchRotated(nums, target) {\n    // TODO: Return index of target in rotated sorted array nums, or -1 if not found\n    return -1;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    const target = lines.length > 2 ? parseInt(lines[2].trim(), 10) : parseInt(lines[1].trim(), 10);\n    console.log(searchRotated(nums, target));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int searchRotated(int[] nums, int target) {\n        // TODO: Return index of target in rotated sorted array nums, or -1 if not found\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        int target = scanner.nextInt();\n        System.out.println(searchRotated(nums, target));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "7\n4 5 6 7 0 1 2\n0\n",
        "expectedOutput": "4"
      },
      {
        "input": "7\n4 5 6 7 0 1 2\n3\n",
        "expectedOutput": "-1"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n1\n1\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n1\n0\n",
        "expectedOutput": "-1"
      },
      {
        "input": "5\n1 2 3 4 5\n3\n",
        "expectedOutput": "2"
      },
      {
        "input": "5\n5 1 2 3 4\n5\n",
        "expectedOutput": "0"
      },
      {
        "input": "10\n10 12 15 18 20 1 3 5 7 9\n15\n",
        "expectedOutput": "2"
      }
    ]
  },
  {
    "slug": "trapping-rain-water",
    "title": "Trapping Rain Water",
    "difficulty": "hard",
    "tags": [
      "arrays",
      "two-pointers",
      "stack"
    ],
    "description": "### Problem Statement\nGiven `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of bars.\n- Line 2: `n` space-separated integers representing the elevation heights.\n\n### Output Format\n- Print a single integer representing the total amount of trapped rainwater.\n\n### Constraints\n- 1 <= n <= 2 * 10^4\n- 0 <= height[i] <= 10^5\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n12\n0 1 0 2 1 0 1 3 2 1 2 1\n```\n**Output:**\n```\n6\n```\n**Explanation:** The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.\n\n#### Example 2\n**Input:**\n```\n6\n4 2 0 3 2 5\n```\n**Output:**\n```\n9\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef trap(height):\n    # TODO: Return total units of trapped rain water\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    height = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    print(trap(height))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction trap(height) {\n    // TODO: Return total units of trapped rain water\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const height = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    console.log(trap(height));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int trap(int[] height) {\n        // TODO: Return total units of trapped rain water\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] height = new int[n];\n        for (int i = 0; i < n; i++) {\n            height[i] = scanner.nextInt();\n        }\n        System.out.println(trap(height));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "12\n0 1 0 2 1 0 1 3 2 1 2 1\n",
        "expectedOutput": "6"
      },
      {
        "input": "6\n4 2 0 3 2 5\n",
        "expectedOutput": "9"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n5\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n5 4 3 2 1\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n5 0 0 0 5\n",
        "expectedOutput": "15"
      },
      {
        "input": "15\n3 0 2 0 4 1 0 2 1 5 2 0 1 3 2\n",
        "expectedOutput": "25"
      }
    ]
  },
  {
    "slug": "longest-valid-parentheses",
    "title": "Longest Valid Parentheses",
    "difficulty": "hard",
    "tags": [
      "strings",
      "dynamic-programming",
      "stack"
    ],
    "description": "### Problem Statement\nGiven a string `s` containing just the characters `'('` and `')'`, return the length of the longest valid (well-formed) parentheses substring.\n\n### Input Format\n- Line 1: A string `s` containing only parentheses characters. (If `s` is empty, the line is empty).\n\n### Output Format\n- Print a single integer representing the length of the longest valid parentheses substring.\n\n### Constraints\n- 0 <= s.length <= 3 * 10^4\n- `s[i]` is '(' or ')'.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n(()\n```\n**Output:**\n```\n2\n```\n**Explanation:** The longest valid parentheses substring is `\"()\"`.\n\n#### Example 2\n**Input:**\n```\n)()())\n```\n**Output:**\n```\n4\n```\n**Explanation:** The longest valid parentheses substring is `\"()()\"`.\n\n#### Example 3\n**Input:**\n```\n\n```\n**Output:**\n```\n0\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef longest_valid_parentheses(s: str) -> int:\n    # TODO: Return length of longest valid parentheses substring\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0].strip() if lines else \"\"\n    print(longest_valid_parentheses(s))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction longestValidParentheses(s) {\n    // TODO: Return length of longest valid parentheses substring\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);\n    const s = lines[0] ? lines[0].trim() : '';\n    console.log(longestValidParentheses(s));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int longestValidParentheses(String s) {\n        // TODO: Return length of longest valid parentheses substring\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String s = scanner.hasNextLine() ? scanner.nextLine().trim() : \"\";\n        System.out.println(longestValidParentheses(s));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "(()\n",
        "expectedOutput": "2"
      },
      {
        "input": ")()())\n",
        "expectedOutput": "4"
      }
    ],
    "hiddenTests": [
      {
        "input": "\n",
        "expectedOutput": "0"
      },
      {
        "input": "(((((\n",
        "expectedOutput": "0"
      },
      {
        "input": "((()))\n",
        "expectedOutput": "6"
      },
      {
        "input": "())(()())((\n",
        "expectedOutput": "6"
      },
      {
        "input": "()((()))())(()())(())()((()()()())\n",
        "expectedOutput": "12"
      }
    ]
  }
];
