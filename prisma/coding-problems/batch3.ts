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

export const batch3Problems: CodingProblemSeed[] = [
  {
    "slug": "contains-duplicate",
    "title": "Contains Duplicate",
    "difficulty": "easy",
    "tags": [
      "arrays",
      "hash-map"
    ],
    "description": "### Problem Statement\nGiven an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.\n\n### Input Format\n- Line 1: An integer `n` representing the number of elements in the array.\n- Line 2: If `n > 0`, `n` space-separated integers representing the elements of `nums`. If `n == 0`, this line is empty.\n\n### Output Format\n- Print `true` if any value appears at least twice, or `false` otherwise.\n\n### Constraints\n- 0 <= n <= 10^5\n- -10^9 <= nums[i] <= 10^9\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n4\n1 2 3 1\n```\n**Output:**\n```\ntrue\n```\n\n#### Example 2\n**Input:**\n```\n4\n1 2 3 4\n```\n**Output:**\n```\nfalse\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef contains_duplicate(nums):\n    # TODO: Return True if any value appears at least twice, False otherwise\n    return False\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(\"false\")\n        return\n    n = int(tokens[0])\n    nums = [int(x) for x in tokens[1:1+n]]\n    print(\"true\" if contains_duplicate(nums) else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction containsDuplicate(nums) {\n    // TODO: Return true if any value appears at least twice, false otherwise\n    return false;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log('false');\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    const nums = tokens.slice(1, 1 + n).map(Number);\n    console.log(containsDuplicate(nums) ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean containsDuplicate(int[] nums) {\n        // TODO: Return true if any value appears at least twice, false otherwise\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"false\");\n            return;\n        }\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        System.out.println(containsDuplicate(nums) ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "4\n1 2 3 1\n",
        "expectedOutput": "true"
      },
      {
        "input": "4\n1 2 3 4\n",
        "expectedOutput": "false"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n\n",
        "expectedOutput": "false"
      },
      {
        "input": "1\n42\n",
        "expectedOutput": "false"
      },
      {
        "input": "5\n-1 -2 -3 -1 0\n",
        "expectedOutput": "true"
      },
      {
        "input": "5\n7 7 7 7 7\n",
        "expectedOutput": "true"
      },
      {
        "input": "50\n1 4 7 10 13 16 19 22 25 28 31 34 37 40 43 46 49 52 55 58 61 64 67 70 73 76 79 82 85 88 91 94 97 100 103 106 109 112 115 118 121 124 127 130 133 136 139 142 145 148\n",
        "expectedOutput": "false"
      }
    ]
  },
  {
    "slug": "single-number",
    "title": "Single Number",
    "difficulty": "easy",
    "tags": [
      "arrays",
      "bit-manipulation"
    ],
    "description": "### Problem Statement\nGiven a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.\n\n### Input Format\n- Line 1: An integer `n` representing the length of `nums` (`n` is odd).\n- Line 2: `n` space-separated integers representing the elements of `nums`.\n\n### Output Format\n- Print a single integer representing the element that appears only once.\n\n### Constraints\n- 1 <= n <= 3 * 10^4\n- -3 * 10^4 <= nums[i] <= 3 * 10^4\n- Each element in the array appears twice except for one element which appears only once.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3\n2 2 1\n```\n**Output:**\n```\n1\n```\n\n#### Example 2\n**Input:**\n```\n5\n4 1 2 1 2\n```\n**Output:**\n```\n4\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef single_number(nums):\n    # TODO: Return the single element that appears only once\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    nums = [int(x) for x in tokens[1:1+n]]\n    print(single_number(nums))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction singleNumber(nums) {\n    // TODO: Return the single element that appears only once\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    const nums = tokens.slice(1, 1 + n).map(Number);\n    console.log(singleNumber(nums));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int singleNumber(int[] nums) {\n        // TODO: Return the single element that appears only once\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        System.out.println(singleNumber(nums));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3\n2 2 1\n",
        "expectedOutput": "1"
      },
      {
        "input": "5\n4 1 2 1 2\n",
        "expectedOutput": "4"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n1\n",
        "expectedOutput": "1"
      },
      {
        "input": "5\n-1 -1 -2 3 3\n",
        "expectedOutput": "-2"
      },
      {
        "input": "5\n10 10 0 25 25\n",
        "expectedOutput": "0"
      },
      {
        "input": "3\n30000 30000 -30000\n",
        "expectedOutput": "-30000"
      },
      {
        "input": "51\n10 10 20 20 30 30 40 40 50 50 60 60 70 70 80 80 90 90 100 100 110 110 120 120 130 130 140 140 150 150 160 160 170 170 180 180 190 190 200 200 210 210 220 220 230 230 240 240 250 250 999\n",
        "expectedOutput": "999"
      }
    ]
  },
  {
    "slug": "number-of-1-bits",
    "title": "Number of 1 Bits",
    "difficulty": "easy",
    "tags": [
      "bit-manipulation"
    ],
    "description": "### Problem Statement\nGiven a positive integer `n`, write a function that returns the number of set bits (1s) in its binary representation (also known as the Hamming weight).\n\n### Input Format\n- Line 1: A positive integer `n`.\n\n### Output Format\n- Print a single integer representing the count of 1s in the binary representation of `n`.\n\n### Constraints\n- 1 <= n <= 2^31 - 1\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n11\n```\n**Output:**\n```\n3\n```\n\n#### Example 2\n**Input:**\n```\n128\n```\n**Output:**\n```\n1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef hamming_weight(n):\n    # TODO: Return count of 1 bits in binary representation of n\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    print(hamming_weight(n))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction hammingWeight(n) {\n    // TODO: Return count of 1 bits in binary representation of n\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    console.log(hammingWeight(n));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int hammingWeight(long n) {\n        // TODO: Return count of 1 bits in binary representation of n\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextLong()) {\n            System.out.println(0);\n            return;\n        }\n        long n = scanner.nextLong();\n        System.out.println(hammingWeight(n));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "11\n",
        "expectedOutput": "3"
      },
      {
        "input": "128\n",
        "expectedOutput": "1"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n",
        "expectedOutput": "1"
      },
      {
        "input": "7\n",
        "expectedOutput": "3"
      },
      {
        "input": "21\n",
        "expectedOutput": "3"
      },
      {
        "input": "2147483647\n",
        "expectedOutput": "31"
      },
      {
        "input": "1048575\n",
        "expectedOutput": "20"
      }
    ]
  },
  {
    "slug": "roman-to-integer",
    "title": "Roman to Integer",
    "difficulty": "easy",
    "tags": [
      "strings",
      "math",
      "hash-map"
    ],
    "description": "### Problem Statement\nRoman numerals are represented by seven different symbols: `I` (1), `V` (5), `X` (10), `L` (50), `C` (100), `D` (500), and `M` (1000).\n\nGiven a roman numeral string `s`, convert it to an integer.\n\n### Input Format\n- Line 1: A string `s` representing a valid roman numeral.\n\n### Output Format\n- Print a single integer representing the converted value of `s`.\n\n### Constraints\n- 1 <= s.length <= 15\n- `s` contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M').\n- It is guaranteed that `s` is a valid roman numeral in the range [1, 3999].\n\n### Examples\n\n#### Example 1\n**Input:**\n```\nIII\n```\n**Output:**\n```\n3\n```\n\n#### Example 2\n**Input:**\n```\nLVIII\n```\n**Output:**\n```\n58\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef roman_to_int(s):\n    # TODO: Convert roman numeral string to integer\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    s = tokens[0]\n    print(roman_to_int(s))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction romanToInt(s) {\n    // TODO: Convert roman numeral string to integer\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    console.log(romanToInt(tokens[0]));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int romanToInt(String s) {\n        // TODO: Convert roman numeral string to integer\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNext()) {\n            System.out.println(0);\n            return;\n        }\n        String s = scanner.next();\n        System.out.println(romanToInt(s));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "III\n",
        "expectedOutput": "3"
      },
      {
        "input": "LVIII\n",
        "expectedOutput": "58"
      }
    ],
    "hiddenTests": [
      {
        "input": "MCMXCIV\n",
        "expectedOutput": "1994"
      },
      {
        "input": "IV\n",
        "expectedOutput": "4"
      },
      {
        "input": "IX\n",
        "expectedOutput": "9"
      },
      {
        "input": "XL\n",
        "expectedOutput": "40"
      },
      {
        "input": "MMMCMXCIX\n",
        "expectedOutput": "3999"
      }
    ]
  },
  {
    "slug": "longest-consecutive-sequence",
    "title": "Longest Consecutive Sequence",
    "difficulty": "medium",
    "tags": [
      "arrays",
      "hash-map",
      "union-find"
    ],
    "description": "### Problem Statement\nGiven an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence.\n\nYou must write an algorithm that runs in `O(n)` time.\n\n### Input Format\n- Line 1: An integer `n` representing the number of elements in the array.\n- Line 2: If `n > 0`, `n` space-separated integers representing `nums`. If `n == 0`, this line is empty.\n\n### Output Format\n- Print a single integer representing the length of the longest consecutive elements sequence.\n\n### Constraints\n- 0 <= n <= 10^5\n- -10^9 <= nums[i] <= 10^9\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\n100 4 200 1 3 2\n```\n**Output:**\n```\n4\n```\n\n#### Example 2\n**Input:**\n```\n10\n0 3 7 2 5 8 4 6 0 1\n```\n**Output:**\n```\n9\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef longest_consecutive(nums):\n    # TODO: Return length of longest consecutive sequence\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    nums = [int(x) for x in tokens[1:1+n]]\n    print(longest_consecutive(nums))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction longestConsecutive(nums) {\n    // TODO: Return length of longest consecutive sequence\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    const nums = tokens.slice(1, 1 + n).map(Number);\n    console.log(longestConsecutive(nums));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int longestConsecutive(int[] nums) {\n        // TODO: Return length of longest consecutive sequence\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        System.out.println(longestConsecutive(nums));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\n100 4 200 1 3 2\n",
        "expectedOutput": "4"
      },
      {
        "input": "10\n0 3 7 2 5 8 4 6 0 1\n",
        "expectedOutput": "9"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n42\n",
        "expectedOutput": "1"
      },
      {
        "input": "7\n-3 -2 -1 -2 0 1 2\n",
        "expectedOutput": "6"
      },
      {
        "input": "4\n10 20 30 40\n",
        "expectedOutput": "1"
      },
      {
        "input": "40\n10 11 12 13 14 15 16 17 18 19 100 101 102 103 1 2 3 4 5 6 7 8 9 200 201 202 20 21 22 23 24 25 26 27 28 29 30 31 32 33\n",
        "expectedOutput": "33"
      }
    ]
  },
  {
    "slug": "number-of-provinces",
    "title": "Number of Provinces",
    "difficulty": "medium",
    "tags": [
      "graphs",
      "dfs",
      "bfs"
    ],
    "description": "### Problem Statement\nThere are `n` cities. Some of them are connected, while some are not. If city `a` is connected directly with city `b`, and city `b` is connected directly with city `c`, then city `a` is connected indirectly with city `c`.\n\nA **province** is a group of directly or indirectly connected cities and no other cities outside of the group.\n\nYou are given an `n x n` matrix `isConnected` where `isConnected[i][j] = 1` if the `i`th city and the `j`th city are directly connected, and `isConnected[i][j] = 0` otherwise.\n\nReturn the total number of provinces.\n\n### Input Format\n- Line 1: An integer `n` representing the number of cities.\n- Next `n` lines: Each line contains `n` space-separated integers (0 or 1) representing row `i` of the adjacency matrix `isConnected`.\n\n### Output Format\n- Print a single integer representing the total number of provinces.\n\n### Constraints\n- 1 <= n <= 200\n- isConnected[i][j] is 1 or 0.\n- isConnected[i][i] == 1\n- isConnected[i][j] == isConnected[j][i]\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3\n1 1 0\n1 1 0\n0 0 1\n```\n**Output:**\n```\n2\n```\n\n#### Example 2\n**Input:**\n```\n3\n1 0 0\n0 1 0\n0 0 1\n```\n**Output:**\n```\n3\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef find_circle_num(n, is_connected):\n    # TODO: Return total number of provinces\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    idx = 1\n    matrix = []\n    for _ in range(n):\n        matrix.append([int(x) for x in tokens[idx:idx+n]])\n        idx += n\n    print(find_circle_num(n, matrix))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction findCircleNum(n, isConnected) {\n    // TODO: Return total number of provinces\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    let idx = 1;\n    const matrix = [];\n    for (let i = 0; i < n; i++) {\n        matrix.push(tokens.slice(idx, idx + n).map(Number));\n        idx += n;\n    }\n    console.log(findCircleNum(n, matrix));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int findCircleNum(int[][] isConnected) {\n        // TODO: Return total number of provinces\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        int[][] isConnected = new int[n][n];\n        for (int i = 0; i < n; i++) {\n            for (int j = 0; j < n; j++) {\n                isConnected[i][j] = scanner.nextInt();\n            }\n        }\n        System.out.println(findCircleNum(isConnected));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3\n1 1 0\n1 1 0\n0 0 1\n",
        "expectedOutput": "2"
      },
      {
        "input": "3\n1 0 0\n0 1 0\n0 0 1\n",
        "expectedOutput": "3"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n1\n",
        "expectedOutput": "1"
      },
      {
        "input": "4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1\n",
        "expectedOutput": "1"
      },
      {
        "input": "5\n1 1 0 0 0\n1 1 1 0 0\n0 1 1 1 0\n0 0 1 1 1\n0 0 0 1 1\n",
        "expectedOutput": "1"
      },
      {
        "input": "5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 1 1\n0 0 1 1 1\n0 0 1 1 1\n",
        "expectedOutput": "2"
      },
      {
        "input": "6\n1 1 1 0 0 0\n1 1 1 0 0 0\n1 1 1 0 0 0\n0 0 0 1 0 0\n0 0 0 0 1 0\n0 0 0 0 0 1\n",
        "expectedOutput": "4"
      }
    ]
  },
  {
    "slug": "meeting-rooms-ii",
    "title": "Meeting Rooms II",
    "difficulty": "medium",
    "tags": [
      "arrays",
      "greedy",
      "heap"
    ],
    "description": "### Problem Statement\nGiven an array of meeting time intervals `intervals` where `intervals[i] = [start_i, end_i]`, return the minimum number of conference rooms required.\n\n### Input Format\n- Line 1: An integer `n` representing the number of meeting intervals.\n- Next `n` lines: Each line contains two space-separated integers `start end` representing a meeting interval.\n\n### Output Format\n- Print a single integer representing the minimum number of conference rooms required.\n\n### Constraints\n- 0 <= n <= 10^4\n- 0 <= start_i < end_i <= 10^6\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3\n0 30\n5 10\n15 20\n```\n**Output:**\n```\n2\n```\n\n#### Example 2\n**Input:**\n```\n3\n7 10\n2 4\n15 20\n```\n**Output:**\n```\n1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef min_meeting_rooms(intervals):\n    # TODO: Return minimum number of conference rooms required\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    intervals = []\n    idx = 1\n    for _ in range(n):\n        intervals.append([int(tokens[idx]), int(tokens[idx+1])])\n        idx += 2\n    print(min_meeting_rooms(intervals))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction minMeetingRooms(intervals) {\n    // TODO: Return minimum number of conference rooms required\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    const intervals = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        intervals.push([parseInt(tokens[idx], 10), parseInt(tokens[idx + 1], 10)]);\n        idx += 2;\n    }\n    console.log(minMeetingRooms(intervals));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int minMeetingRooms(int[][] intervals) {\n        // TODO: Return minimum number of conference rooms required\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        int[][] intervals = new int[n][2];\n        for (int i = 0; i < n; i++) {\n            intervals[i][0] = scanner.nextInt();\n            intervals[i][1] = scanner.nextInt();\n        }\n        System.out.println(minMeetingRooms(intervals));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3\n0 30\n5 10\n15 20\n",
        "expectedOutput": "2"
      },
      {
        "input": "3\n7 10\n2 4\n15 20\n",
        "expectedOutput": "1"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n1 10\n",
        "expectedOutput": "1"
      },
      {
        "input": "2\n1 5\n5 10\n",
        "expectedOutput": "1"
      },
      {
        "input": "4\n1 10\n2 9\n3 8\n4 7\n",
        "expectedOutput": "4"
      },
      {
        "input": "10\n1 4\n2 5\n7 9\n3 6\n8 12\n10 15\n11 14\n13 18\n15 20\n16 19\n",
        "expectedOutput": "3"
      }
    ]
  },
  {
    "slug": "word-break",
    "title": "Word Break",
    "difficulty": "medium",
    "tags": [
      "dynamic-programming",
      "strings",
      "trie"
    ],
    "description": "### Problem Statement\nGiven a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.\n\n### Input Format\n- Line 1: A string `s`.\n- Line 2: An integer `m` representing the number of words in `wordDict`.\n- Next `m` lines: One word per line from `wordDict`.\n\n### Output Format\n- Print `true` if `s` can be segmented, or `false` otherwise.\n\n### Constraints\n- 1 <= s.length <= 300\n- 1 <= m <= 1000\n- 1 <= word.length <= 20\n- `s` and all words in `wordDict` consist of lowercase English letters.\n- All strings in `wordDict` are distinct.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\nleetcode\n2\nleet\ncode\n```\n**Output:**\n```\ntrue\n```\n\n#### Example 2\n**Input:**\n```\napplepenapple\n2\napple\npen\n```\n**Output:**\n```\ntrue\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef word_break(s, word_dict):\n    # TODO: Return True if s can be segmented into words from word_dict\n    return False\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines or not lines[0].strip():\n        print(\"false\")\n        return\n    s = lines[0].strip()\n    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0\n    words = [lines[i].strip() for i in range(2, 2 + m) if i < len(lines)]\n    print(\"true\" if word_break(s, words) else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction wordBreak(s, wordDict) {\n    // TODO: Return true if s can be segmented into words from wordDict\n    return false;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0] || lines[0].trim() === '') {\n        console.log('false');\n        return;\n    }\n    const s = lines[0].trim();\n    const m = lines.length > 1 && lines[1].trim() ? parseInt(lines[1].trim(), 10) : 0;\n    const words = [];\n    for (let i = 2; i < 2 + m; i++) {\n        if (lines[i] && lines[i].trim()) {\n            words.push(lines[i].trim());\n        }\n    }\n    console.log(wordBreak(s, words) ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean wordBreak(String s, List<String> wordDict) {\n        // TODO: Return true if s can be segmented into words from wordDict\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNext()) {\n            System.out.println(\"false\");\n            return;\n        }\n        String s = scanner.next();\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"false\");\n            return;\n        }\n        int m = scanner.nextInt();\n        List<String> wordDict = new ArrayList<>();\n        for (int i = 0; i < m; i++) {\n            wordDict.add(scanner.next());\n        }\n        System.out.println(wordBreak(s, wordDict) ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "leetcode\n2\nleet\ncode\n",
        "expectedOutput": "true"
      },
      {
        "input": "applepenapple\n2\napple\npen\n",
        "expectedOutput": "true"
      }
    ],
    "hiddenTests": [
      {
        "input": "catsandog\n5\ncats\ndog\nsand\nand\ncat\n",
        "expectedOutput": "false"
      },
      {
        "input": "a\n1\na\n",
        "expectedOutput": "true"
      },
      {
        "input": "aaaaaaa\n2\naaaa\naaa\n",
        "expectedOutput": "true"
      },
      {
        "input": "ab\n1\na\n",
        "expectedOutput": "false"
      },
      {
        "input": "goalspecial\n4\ngo\ngoal\nspecial\nspec\n",
        "expectedOutput": "true"
      }
    ]
  },
  {
    "slug": "sliding-window-maximum",
    "title": "Sliding Window Maximum",
    "difficulty": "hard",
    "tags": [
      "sliding-window",
      "queue",
      "heap"
    ],
    "description": "### Problem Statement\nYou are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position.\n\nReturn the max sliding window.\n\n### Input Format\n- Line 1: An integer `n` representing the number of elements in `nums`.\n- Line 2: `n` space-separated integers representing `nums`.\n- Line 3: An integer `k` representing the sliding window size.\n\n### Output Format\n- Print the max in each sliding window, space-separated on a single line.\n\n### Constraints\n- 1 <= n <= 10^5\n- -10^4 <= nums[i] <= 10^4\n- 1 <= k <= n\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n8\n1 3 -1 -3 5 3 6 7\n3\n```\n**Output:**\n```\n3 3 5 5 6 7\n```\n\n#### Example 2\n**Input:**\n```\n1\n1\n1\n```\n**Output:**\n```\n1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef max_sliding_window(nums, k):\n    # TODO: Return space-separated max for each sliding window of size k\n    return []\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(\"\")\n        return\n    n = int(tokens[0])\n    nums = [int(x) for x in tokens[1:1+n]]\n    k = int(tokens[1+n]) if len(tokens) > 1 + n else 1\n    res = max_sliding_window(nums, k)\n    print(\" \".join(str(x) for x in res))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction maxSlidingWindow(nums, k) {\n    // TODO: Return array of max for each sliding window of size k\n    return [];\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log('');\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    const nums = tokens.slice(1, 1 + n).map(Number);\n    const k = tokens.length > 1 + n ? parseInt(tokens[1 + n], 10) : 1;\n    const res = maxSlidingWindow(nums, k);\n    console.log(res.join(' '));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int[] maxSlidingWindow(int[] nums, int k) {\n        // TODO: Return max in each sliding window of size k\n        return new int[0];\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"\");\n            return;\n        }\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        int k = scanner.hasNextInt() ? scanner.nextInt() : 1;\n        int[] res = maxSlidingWindow(nums, k);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < res.length; i++) {\n            if (i > 0) sb.append(\" \");\n            sb.append(res[i]);\n        }\n        System.out.println(sb.toString());\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "8\n1 3 -1 -3 5 3 6 7\n3\n",
        "expectedOutput": "3 3 5 5 6 7"
      },
      {
        "input": "1\n1\n1\n",
        "expectedOutput": "1"
      }
    ],
    "hiddenTests": [
      {
        "input": "4\n4 2 1 3\n1\n",
        "expectedOutput": "4 2 1 3"
      },
      {
        "input": "5\n10 20 50 30 40\n5\n",
        "expectedOutput": "50"
      },
      {
        "input": "5\n9 8 7 6 5\n3\n",
        "expectedOutput": "9 8 7"
      },
      {
        "input": "6\n2 2 2 2 2 2\n4\n",
        "expectedOutput": "2 2 2"
      },
      {
        "input": "30\n12 1 -3 4 11 0 -5 8 9 15 2 -1 6 7 14 3 -8 10 19 22 -4 5 18 13 -2 16 20 8 3 17\n5\n",
        "expectedOutput": "12 11 11 11 11 15 15 15 15 15 14 14 14 14 19 22 22 22 22 22 18 18 20 20 20 20"
      }
    ]
  },
  {
    "slug": "n-queens-count",
    "title": "N-Queens Count",
    "difficulty": "hard",
    "tags": [
      "backtracking",
      "recursion"
    ],
    "description": "### Problem Statement\nThe **n-queens** puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.\n\nGiven an integer `n`, return the number of distinct solutions to the **n-queens puzzle**.\n\n### Input Format\n- Line 1: An integer `n` representing the size of the chessboard.\n\n### Output Format\n- Print a single integer representing the number of distinct solutions.\n\n### Constraints\n- 1 <= n <= 9\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n4\n```\n**Output:**\n```\n2\n```\n\n#### Example 2\n**Input:**\n```\n1\n```\n**Output:**\n```\n1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef total_n_queens(n):\n    # TODO: Return number of distinct solutions to the n-queens puzzle\n    return 0\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(0)\n        return\n    n = int(tokens[0])\n    print(total_n_queens(n))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction totalNQueens(n) {\n    // TODO: Return number of distinct solutions to the n-queens puzzle\n    return 0;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    console.log(totalNQueens(n));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int totalNQueens(int n) {\n        // TODO: Return number of distinct solutions to the n-queens puzzle\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        System.out.println(totalNQueens(n));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "4\n",
        "expectedOutput": "2"
      },
      {
        "input": "1\n",
        "expectedOutput": "1"
      }
    ],
    "hiddenTests": [
      {
        "input": "2\n",
        "expectedOutput": "0"
      },
      {
        "input": "3\n",
        "expectedOutput": "0"
      },
      {
        "input": "5\n",
        "expectedOutput": "10"
      },
      {
        "input": "6\n",
        "expectedOutput": "4"
      },
      {
        "input": "8\n",
        "expectedOutput": "92"
      }
    ]
  }
];
