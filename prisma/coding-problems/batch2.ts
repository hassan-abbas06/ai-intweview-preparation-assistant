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

export const batch2Problems: CodingProblemSeed[] = [
  {
    "slug": "reverse-linked-list",
    "title": "Reverse Linked List",
    "difficulty": "easy",
    "tags": [
      "linked-list",
      "two-pointers"
    ],
    "description": "### Problem Statement\nGiven the `head` of a singly linked list, reverse the list, and return the reversed list.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of nodes in the linked list (`n` may be 0).\n- Line 2: If `n > 0`, `n` space-separated integers representing the node values in order. If `n == 0`, line 2 is empty.\n\n### Output Format\n- Print the space-separated values of the reversed linked list on a single line, or an empty line if the list is empty.\n\n### Constraints\n- 0 <= n <= 5000\n- -5000 <= Node.val <= 5000\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n5\n1 2 3 4 5\n```\n**Output:**\n```\n5 4 3 2 1\n```\n\n#### Example 2\n**Input:**\n```\n2\n1 2\n```\n**Output:**\n```\n2 1\n```\n\n#### Example 3\n**Input:**\n```\n0\n\n```\n**Output:**\n```\n\n```\n",
    "starterCode": {
      "python": "import sys\n\nclass ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head):\n    # TODO: Return reversed linked list head\n    return None\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(\"\")\n        return\n    n = int(tokens[0])\n    if n == 0 or len(tokens) < 1 + n:\n        print(\"\")\n        return\n    vals = [int(x) for x in tokens[1:1+n]]\n    dummy = ListNode(0)\n    curr = dummy\n    for v in vals:\n        curr.next = ListNode(v)\n        curr = curr.next\n    \n    rev = reverse_list(dummy.next)\n    out = []\n    while rev:\n        out.append(str(rev.val))\n        rev = rev.next\n    print(\" \".join(out))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction ListNode(val, next) {\n    this.val = (val === undefined ? 0 : val);\n    this.next = (next === undefined ? null : next);\n}\n\nfunction reverseList(head) {\n    // TODO: Return reversed linked list head\n    return null;\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log('');\n        return;\n    }\n    const n = parseInt(tokens[0], 10);\n    if (n === 0 || tokens.length < 1 + n) {\n        console.log('');\n        return;\n    }\n    const vals = tokens.slice(1, 1 + n).map(Number);\n    const dummy = new ListNode(0);\n    let curr = dummy;\n    for (const v of vals) {\n        curr.next = new ListNode(v);\n        curr = curr.next;\n    }\n    let rev = reverseList(dummy.next);\n    const out = [];\n    while (rev) {\n        out.push(rev.val);\n        rev = rev.next;\n    }\n    console.log(out.join(' '));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\nclass ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\npublic class Main {\n    public static ListNode reverseList(ListNode head) {\n        // TODO: Return reversed linked list head\n        return null;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"\");\n            return;\n        }\n        int n = scanner.nextInt();\n        if (n == 0) {\n            System.out.println(\"\");\n            return;\n        }\n        ListNode dummy = new ListNode(0);\n        ListNode curr = dummy;\n        for (int i = 0; i < n; i++) {\n            curr.next = new ListNode(scanner.nextInt());\n            curr = curr.next;\n        }\n        ListNode rev = reverseList(dummy.next);\n        StringBuilder sb = new StringBuilder();\n        while (rev != null) {\n            if (sb.length() > 0) sb.append(\" \");\n            sb.append(rev.val);\n            rev = rev.next;\n        }\n        System.out.println(sb.toString());\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "5 4 3 2 1"
      },
      {
        "input": "2\n1 2\n",
        "expectedOutput": "2 1"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n\n",
        "expectedOutput": ""
      },
      {
        "input": "1\n42\n",
        "expectedOutput": "42"
      },
      {
        "input": "3\n1 1 1\n",
        "expectedOutput": "1 1 1"
      },
      {
        "input": "4\n-10 -20 -30 -40\n",
        "expectedOutput": "-40 -30 -20 -10"
      },
      {
        "input": "10\n10 9 8 7 6 5 4 3 2 1\n",
        "expectedOutput": "1 2 3 4 5 6 7 8 9 10"
      }
    ]
  },
  {
    "slug": "maximum-depth-of-binary-tree",
    "title": "Maximum Depth of Binary Tree",
    "difficulty": "easy",
    "tags": [
      "binary-tree",
      "dfs",
      "bfs"
    ],
    "description": "### Problem Statement\nGiven the root of a binary tree, return its maximum depth.\n\nA binary tree's **maximum depth** is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\n### Input Format\n- Line 1: A single line containing the level-order traversal of the tree, space-separated, with `\"null\"` denoting missing nodes. If the tree is empty, the line is empty or `\"null\"`.\n\n### Output Format\n- Print a single integer representing the maximum depth of the binary tree.\n\n### Constraints\n- The number of nodes in the tree is in the range [0, 10^4].\n- -100 <= Node.val <= 100\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3 9 20 null null 15 7\n```\n**Output:**\n```\n3\n```\n\n#### Example 2\n**Input:**\n```\n1 null 2\n```\n**Output:**\n```\n2\n```\n",
    "starterCode": {
      "python": "import sys\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef max_depth(root):\n    # TODO: Return maximum depth of binary tree\n    return 0\n\ndef build_tree(tokens):\n    if not tokens or tokens[0] == \"null\" or tokens[0] == \"\":\n        return None\n    root = TreeNode(int(tokens[0]))\n    queue = [root]\n    idx = 1\n    while queue and idx < len(tokens):\n        curr = queue.pop(0)\n        if idx < len(tokens):\n            if tokens[idx] != \"null\" and tokens[idx] != \"\":\n                curr.left = TreeNode(int(tokens[idx]))\n                queue.append(curr.left)\n            idx += 1\n        if idx < len(tokens):\n            if tokens[idx] != \"null\" and tokens[idx] != \"\":\n                curr.right = TreeNode(int(tokens[idx]))\n                queue.append(curr.right)\n            idx += 1\n    return root\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines or not lines[0].strip():\n        print(0)\n        return\n    tokens = lines[0].strip().split()\n    root = build_tree(tokens)\n    print(max_depth(root))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction TreeNode(val, left, right) {\n    this.val = (val === undefined ? 0 : val);\n    this.left = (left === undefined ? null : left);\n    this.right = (right === undefined ? null : right);\n}\n\nfunction maxDepth(root) {\n    // TODO: Return maximum depth of binary tree\n    return 0;\n}\n\nfunction buildTree(tokens) {\n    if (!tokens || tokens.length === 0 || tokens[0] === 'null' || tokens[0] === '') return null;\n    const root = new TreeNode(parseInt(tokens[0], 10));\n    const queue = [root];\n    let idx = 1;\n    while (queue.length > 0 && idx < tokens.length) {\n        const curr = queue.shift();\n        if (idx < tokens.length) {\n            if (tokens[idx] !== 'null' && tokens[idx] !== '') {\n                curr.left = new TreeNode(parseInt(tokens[idx], 10));\n                queue.push(curr.left);\n            }\n            idx++;\n        }\n        if (idx < tokens.length) {\n            if (tokens[idx] !== 'null' && tokens[idx] !== '') {\n                curr.right = new TreeNode(parseInt(tokens[idx], 10));\n                queue.push(curr.right);\n            }\n            idx++;\n        }\n    }\n    return root;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0] || lines[0].trim() === '') {\n        console.log(0);\n        return;\n    }\n    const tokens = lines[0].trim().split(/\\s+/);\n    const root = buildTree(tokens);\n    console.log(maxDepth(root));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\nclass TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) {\n        this.val = val;\n        this.left = left;\n        this.right = right;\n    }\n}\n\npublic class Main {\n    public static int maxDepth(TreeNode root) {\n        // TODO: Return maximum depth of binary tree\n        return 0;\n    }\n\n    public static TreeNode buildTree(String[] tokens) {\n        if (tokens == null || tokens.length == 0 || tokens[0].equals(\"null\") || tokens[0].isEmpty()) {\n            return null;\n        }\n        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));\n        Queue<TreeNode> queue = new LinkedList<>();\n        queue.add(root);\n        int idx = 1;\n        while (!queue.isEmpty() && idx < tokens.length) {\n            TreeNode curr = queue.poll();\n            if (idx < tokens.length) {\n                if (!tokens[idx].equals(\"null\") && !tokens[idx].isEmpty()) {\n                    curr.left = new TreeNode(Integer.parseInt(tokens[idx]));\n                    queue.add(curr.left);\n                }\n                idx++;\n            }\n            if (idx < tokens.length) {\n                if (!tokens[idx].equals(\"null\") && !tokens[idx].isEmpty()) {\n                    curr.right = new TreeNode(Integer.parseInt(tokens[idx]));\n                    queue.add(curr.right);\n                }\n                idx++;\n            }\n        }\n        return root;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextLine()) {\n            System.out.println(0);\n            return;\n        }\n        String line = scanner.nextLine().trim();\n        if (line.isEmpty() || line.equals(\"null\")) {\n            System.out.println(0);\n            return;\n        }\n        String[] tokens = line.split(\"\\\\s+\");\n        TreeNode root = buildTree(tokens);\n        System.out.println(maxDepth(root));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3 9 20 null null 15 7\n",
        "expectedOutput": "3"
      },
      {
        "input": "1 null 2\n",
        "expectedOutput": "2"
      }
    ],
    "hiddenTests": [
      {
        "input": "null\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n",
        "expectedOutput": "1"
      },
      {
        "input": "1 2 3 4 5 null null\n",
        "expectedOutput": "3"
      },
      {
        "input": "1 2 null 3 null 4 null 5\n",
        "expectedOutput": "5"
      },
      {
        "input": "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15\n",
        "expectedOutput": "4"
      }
    ]
  },
  {
    "slug": "valid-anagram",
    "title": "Valid Anagram",
    "difficulty": "easy",
    "tags": [
      "strings",
      "hash-map"
    ],
    "description": "### Problem Statement\nGiven two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n### Input Format\n- Line 1: A string `s`.\n- Line 2: A string `t`.\n\n### Output Format\n- Print `true` if `t` is an anagram of `s`, or `false` otherwise.\n\n### Constraints\n- 1 <= s.length, t.length <= 5 * 10^4\n- `s` and `t` consist of lowercase English letters.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\nanagram\nnagaram\n```\n**Output:**\n```\ntrue\n```\n\n#### Example 2\n**Input:**\n```\nrat\ncar\n```\n**Output:**\n```\nfalse\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef is_anagram(s: str, t: str) -> bool:\n    # TODO: Return True if t is an anagram of s, False otherwise\n    return False\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if len(lines) < 2:\n        print(\"false\")\n        return\n    s = lines[0].strip()\n    t = lines[1].strip()\n    print(\"true\" if is_anagram(s, t) else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction isAnagram(s, t) {\n    // TODO: Return true if t is an anagram of s, false otherwise\n    return false;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (lines.length < 2) {\n        console.log('false');\n        return;\n    }\n    const s = lines[0].trim();\n    const t = lines[1].trim();\n    console.log(isAnagram(s, t) ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean isAnagram(String s, String t) {\n        // TODO: Return true if t is an anagram of s, false otherwise\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String s = scanner.hasNext() ? scanner.next() : \"\";\n        String t = scanner.hasNext() ? scanner.next() : \"\";\n        System.out.println(isAnagram(s, t) ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "anagram\nnagaram\n",
        "expectedOutput": "true"
      },
      {
        "input": "rat\ncar\n",
        "expectedOutput": "false"
      }
    ],
    "hiddenTests": [
      {
        "input": "a\na\n",
        "expectedOutput": "true"
      },
      {
        "input": "a\nb\n",
        "expectedOutput": "false"
      },
      {
        "input": "ab\na\n",
        "expectedOutput": "false"
      },
      {
        "input": "listen\nsilent\n",
        "expectedOutput": "true"
      },
      {
        "input": "aaccbbdd\nbbddccaa\n",
        "expectedOutput": "true"
      }
    ]
  },
  {
    "slug": "group-anagrams-count",
    "title": "Group Anagrams Count",
    "difficulty": "medium",
    "tags": [
      "strings",
      "hash-map",
      "sorting"
    ],
    "description": "### Problem Statement\nGiven an array of strings `strs`, group the anagrams together and return the total number of distinct anagram groups.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of strings in `strs`.\n- Line 2: `n` space-separated strings.\n\n### Output Format\n- Print a single integer representing the number of distinct anagram groups.\n\n### Constraints\n- 1 <= n <= 10^4\n- 0 <= strs[i].length <= 100\n- `strs[i]` consists of lowercase English letters.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\neat tea tan ate nat bat\n```\n**Output:**\n```\n3\n```\n**Explanation:** The groups are `[\"bat\"]`, `[\"nat\", \"tan\"]`, and `[\"ate\", \"eat\", \"tea\"]`.\n\n#### Example 2\n**Input:**\n```\n1\na\n```\n**Output:**\n```\n1\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef group_anagrams_count(strs):\n    # TODO: Return total number of distinct anagram groups\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        print(0)\n        return\n    n = int(lines[0].strip()) if lines[0].strip() else 0\n    if n == 0 or len(lines) < 2 or not lines[1].strip():\n        print(0)\n        return\n    strs = lines[1].strip().split()\n    print(group_anagrams_count(strs))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction groupAnagramsCount(strs) {\n    // TODO: Return total number of distinct anagram groups\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(lines[0].trim(), 10);\n    if (n === 0 || lines.length < 2 || !lines[1].trim()) {\n        console.log(0);\n        return;\n    }\n    const strs = lines[1].trim().split(/\\s+/);\n    console.log(groupAnagramsCount(strs));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int groupAnagramsCount(String[] strs) {\n        // TODO: Return total number of distinct anagram groups\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        String[] strs = new String[n];\n        for (int i = 0; i < n; i++) {\n            strs[i] = scanner.next();\n        }\n        System.out.println(groupAnagramsCount(strs));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\neat tea tan ate nat bat\n",
        "expectedOutput": "3"
      },
      {
        "input": "1\na\n",
        "expectedOutput": "1"
      }
    ],
    "hiddenTests": [
      {
        "input": "3\na b c\n",
        "expectedOutput": "3"
      },
      {
        "input": "4\naaa aaa aaa aaa\n",
        "expectedOutput": "1"
      },
      {
        "input": "4\nab ba cd dc\n",
        "expectedOutput": "2"
      },
      {
        "input": "5\nabc bca cba cab bac\n",
        "expectedOutput": "1"
      },
      {
        "input": "10\napple ppael leapp orange orgena banana ananab grape perag pear\n",
        "expectedOutput": "5"
      }
    ]
  },
  {
    "slug": "kth-largest-element",
    "title": "Kth Largest Element in an Array",
    "difficulty": "medium",
    "tags": [
      "arrays",
      "heap",
      "quickselect"
    ],
    "description": "### Problem Statement\nGiven an integer array `nums` and an integer `k`, return the `k`-th largest element in the array.\n\nNote that it is the `k`-th largest element in the sorted order, not the `k`-th distinct element.\n\n### Input Format\n- Line 1: An integer `n`, the size of `nums`.\n- Line 2: `n` space-separated integers representing `nums`.\n- Line 3: An integer `k`.\n\n### Output Format\n- Print a single integer representing the `k`-th largest element.\n\n### Constraints\n- 1 <= k <= n <= 10^5\n- -10^4 <= nums[i] <= 10^4\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\n3 2 1 5 6 4\n2\n```\n**Output:**\n```\n5\n```\n\n#### Example 2\n**Input:**\n```\n9\n3 2 3 1 2 4 5 5 6\n4\n```\n**Output:**\n```\n4\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef find_kth_largest(nums, k):\n    # TODO: Return kth largest element in nums\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    n = int(lines[0].strip())\n    nums = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 else []\n    k = int(lines[2].strip()) if len(lines) > 2 else 1\n    print(find_kth_largest(nums, k))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction findKthLargest(nums, k) {\n    // TODO: Return kth largest element in nums\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) return;\n    const n = parseInt(lines[0].trim(), 10);\n    const nums = n > 0 && lines.length > 1 ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    const k = lines.length > 2 ? parseInt(lines[2].trim(), 10) : 1;\n    console.log(findKthLargest(nums, k));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int findKthLargest(int[] nums, int k) {\n        // TODO: Return kth largest element in nums\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) return;\n        int n = scanner.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = scanner.nextInt();\n        }\n        int k = scanner.hasNextInt() ? scanner.nextInt() : 1;\n        System.out.println(findKthLargest(nums, k));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\n3 2 1 5 6 4\n2\n",
        "expectedOutput": "5"
      },
      {
        "input": "9\n3 2 3 1 2 4 5 5 6\n4\n",
        "expectedOutput": "4"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n10\n1\n",
        "expectedOutput": "10"
      },
      {
        "input": "5\n7 7 7 7 7\n3\n",
        "expectedOutput": "7"
      },
      {
        "input": "5\n-5 -2 -9 -1 -6\n1\n",
        "expectedOutput": "-1"
      },
      {
        "input": "6\n10 20 30 40 50 60\n6\n",
        "expectedOutput": "10"
      },
      {
        "input": "15\n12 45 19 88 33 24 99 71 50 3 66 82 14 55 2\n5\n",
        "expectedOutput": "66"
      }
    ]
  },
  {
    "slug": "course-schedule",
    "title": "Course Schedule",
    "difficulty": "medium",
    "tags": [
      "graphs",
      "topological-sort",
      "bfs-dfs"
    ],
    "description": "### Problem Statement\nThere are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where each pair `[a, b]` indicates that you must take course `b` first if you want to take course `a`.\n\nReturn `true` if you can finish all courses, or `false` otherwise.\n\n### Input Format\n- Line 1: An integer `numCourses`.\n- Line 2: An integer `m`, the number of prerequisite pairs.\n- Next `m` lines: Two space-separated integers `a` and `b` per line, indicating course `b` is a prerequisite for `a`.\n\n### Output Format\n- Print `true` if it is possible to finish all courses, or `false` otherwise.\n\n### Constraints\n- 1 <= numCourses <= 2000\n- 0 <= m <= 5000\n- 0 <= a, b < numCourses\n- All the pairs `[a, b]` are unique.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n2\n1\n1 0\n```\n**Output:**\n```\ntrue\n```\n**Explanation:** There are 2 courses to take. To take course 1 you should have finished course 0. So it is possible.\n\n#### Example 2\n**Input:**\n```\n2\n2\n1 0\n0 1\n```\n**Output:**\n```\nfalse\n```\n**Explanation:** There are 2 courses to take. To take course 1 you must have finished course 0, and to take course 0 you must have finished course 1. So it is impossible.\n",
    "starterCode": {
      "python": "import sys\n\ndef can_finish(num_courses, prerequisites):\n    # TODO: Return True if all courses can be finished, False otherwise\n    return False\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        print(\"true\")\n        return\n    num_courses = int(lines[0].strip())\n    m = int(lines[1].strip()) if len(lines) > 1 and lines[1].strip() else 0\n    prereqs = []\n    for i in range(2, 2 + m):\n        if i < len(lines) and lines[i].strip():\n            parts = list(map(int, lines[i].strip().split()))\n            prereqs.append((parts[0], parts[1]))\n    print(\"true\" if can_finish(num_courses, prereqs) else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction canFinish(numCourses, prerequisites) {\n    // TODO: Return true if all courses can be finished, false otherwise\n    return false;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) {\n        console.log('true');\n        return;\n    }\n    const numCourses = parseInt(lines[0].trim(), 10);\n    const m = lines.length > 1 && lines[1].trim() ? parseInt(lines[1].trim(), 10) : 0;\n    const prereqs = [];\n    for (let i = 2; i < 2 + m; i++) {\n        if (lines[i] && lines[i].trim()) {\n            prereqs.push(lines[i].trim().split(/\\s+/).map(Number));\n        }\n    }\n    console.log(canFinish(numCourses, prereqs) ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean canFinish(int numCourses, int[][] prerequisites) {\n        // TODO: Return true if all courses can be finished, false otherwise\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"true\");\n            return;\n        }\n        int numCourses = scanner.nextInt();\n        int m = scanner.hasNextInt() ? scanner.nextInt() : 0;\n        int[][] prereqs = new int[m][2];\n        for (int i = 0; i < m; i++) {\n            prereqs[i][0] = scanner.nextInt();\n            prereqs[i][1] = scanner.nextInt();\n        }\n        System.out.println(canFinish(numCourses, prereqs) ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "2\n1\n1 0\n",
        "expectedOutput": "true"
      },
      {
        "input": "2\n2\n1 0\n0 1\n",
        "expectedOutput": "false"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n0\n",
        "expectedOutput": "true"
      },
      {
        "input": "3\n2\n1 0\n2 1\n",
        "expectedOutput": "true"
      },
      {
        "input": "3\n3\n1 0\n2 1\n0 2\n",
        "expectedOutput": "false"
      },
      {
        "input": "4\n3\n1 0\n2 0\n3 1\n",
        "expectedOutput": "true"
      },
      {
        "input": "6\n6\n1 0\n2 1\n3 2\n4 3\n5 4\n0 5\n",
        "expectedOutput": "false"
      }
    ]
  },
  {
    "slug": "word-search",
    "title": "Word Search",
    "difficulty": "medium",
    "tags": [
      "backtracking",
      "matrix",
      "dfs"
    ],
    "description": "### Problem Statement\nGiven an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.\n\n### Input Format\n- Line 1: Two space-separated integers `m` and `n`, representing the number of rows and columns.\n- Next `m` lines: A string of length `n` per line (characters with no spaces), representing the rows of the board.\n- Line `m + 2`: A string representing `word`.\n\n### Output Format\n- Print `true` if the word exists in the grid, or `false` otherwise.\n\n### Constraints\n- 1 <= m, n <= 6\n- 1 <= word.length <= 15\n- `board` and `word` consist of only lowercase and uppercase English letters.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n3 4\nABCE\nSFCS\nADEE\nABCCED\n```\n**Output:**\n```\ntrue\n```\n\n#### Example 2\n**Input:**\n```\n3 4\nABCE\nSFCS\nADEE\nSEE\n```\n**Output:**\n```\ntrue\n```\n\n#### Example 3\n**Input:**\n```\n3 4\nABCE\nSFCS\nADEE\nABCB\n```\n**Output:**\n```\nfalse\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef exist(board, word):\n    # TODO: Return True if word exists in the board, False otherwise\n    return False\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        print(\"false\")\n        return\n    parts = lines[0].strip().split()\n    m, n = int(parts[0]), int(parts[1])\n    board = []\n    for i in range(1, 1 + m):\n        if i < len(lines):\n            board.append(list(lines[i].strip()))\n    word = lines[1 + m].strip() if 1 + m < len(lines) else \"\"\n    print(\"true\" if exist(board, word) else \"false\")\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction exist(board, word) {\n    // TODO: Return true if word exists in the board, false otherwise\n    return false;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) {\n        console.log('false');\n        return;\n    }\n    const [m, n] = lines[0].trim().split(/\\s+/).map(Number);\n    const board = [];\n    for (let i = 1; i <= m; i++) {\n        if (lines[i]) {\n            board.push(lines[i].trim().split(''));\n        }\n    }\n    const word = lines[1 + m] ? lines[1 + m].trim() : '';\n    console.log(exist(board, word) ? 'true' : 'false');\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static boolean exist(char[][] board, String word) {\n        // TODO: Return true if word exists in the board, false otherwise\n        return false;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"false\");\n            return;\n        }\n        int m = scanner.nextInt();\n        int n = scanner.nextInt();\n        char[][] board = new char[m][n];\n        for (int i = 0; i < m; i++) {\n            String row = scanner.next();\n            for (int j = 0; j < n; j++) {\n                board[i][j] = row.charAt(j);\n            }\n        }\n        String word = scanner.hasNext() ? scanner.next() : \"\";\n        System.out.println(exist(board, word) ? \"true\" : \"false\");\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "3 4\nABCE\nSFCS\nADEE\nABCCED\n",
        "expectedOutput": "true"
      },
      {
        "input": "3 4\nABCE\nSFCS\nADEE\nABCB\n",
        "expectedOutput": "false"
      }
    ],
    "hiddenTests": [
      {
        "input": "1 1\nA\nA\n",
        "expectedOutput": "true"
      },
      {
        "input": "1 1\nA\nB\n",
        "expectedOutput": "false"
      },
      {
        "input": "2 2\nAB\nCD\nACDB\n",
        "expectedOutput": "true"
      },
      {
        "input": "3 3\nAAA\nAAA\nAAA\nAAAAAAAAA\n",
        "expectedOutput": "true"
      },
      {
        "input": "4 4\nEASY\nCODE\nTEST\nPASS\nFAST\n",
        "expectedOutput": "false"
      }
    ]
  },
  {
    "slug": "median-of-two-sorted-arrays",
    "title": "Median of Two Sorted Arrays",
    "difficulty": "hard",
    "tags": [
      "arrays",
      "binary-search",
      "divide-and-conquer"
    ],
    "description": "### Problem Statement\nGiven two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be `O(log (m+n))`.\n\n### Input Format\n- Line 1: An integer `m`, the number of elements in `nums1`.\n- Line 2: If `m > 0`, `m` space-separated integers representing `nums1`. If `m == 0`, line 2 is empty.\n- Line 3: An integer `n`, the number of elements in `nums2`.\n- Line 4: If `n > 0`, `n` space-separated integers representing `nums2`. If `n == 0`, line 4 is empty.\n\n### Output Format\n- Print the median as a single number. If the median is an integer, print it as an integer (e.g. `2`); if it has a fractional part, print it with exactly one decimal place (e.g. `2.5`). Do not print trailing `.0` for whole numbers.\n\n### Constraints\n- 0 <= m, n <= 1000\n- 1 <= m + n <= 2000\n- -10^6 <= nums1[i], nums2[i] <= 10^6\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n2\n1 3\n1\n2\n```\n**Output:**\n```\n2\n```\n**Explanation:** merged array = [1,2,3] and median is 2.\n\n#### Example 2\n**Input:**\n```\n2\n1 2\n2\n3 4\n```\n**Output:**\n```\n2.5\n```\n**Explanation:** merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.\n",
    "starterCode": {
      "python": "import sys\n\ndef find_median_sorted_arrays(nums1, nums2):\n    # TODO: Return median of two sorted arrays\n    return 0.0\n\ndef format_median(val):\n    if val == int(val):\n        return str(int(val))\n    return f\"{val:.1f}\"\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        print(\"0\")\n        return\n    m = int(tokens[0])\n    nums1 = [int(x) for x in tokens[1:1+m]]\n    n = int(tokens[1+m])\n    nums2 = [int(x) for x in tokens[2+m:2+m+n]]\n    \n    med = find_median_sorted_arrays(nums1, nums2)\n    print(format_median(med))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction findMedianSortedArrays(nums1, nums2) {\n    // TODO: Return median of two sorted arrays\n    return 0;\n}\n\nfunction formatMedian(val) {\n    if (Number.isInteger(val)) return String(val);\n    return val.toFixed(1);\n}\n\nfunction main() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens[0] || tokens[0] === '') {\n        console.log('0');\n        return;\n    }\n    const m = parseInt(tokens[0], 10);\n    const nums1 = tokens.slice(1, 1 + m).map(Number);\n    const n = parseInt(tokens[1 + m], 10);\n    const nums2 = tokens.slice(2 + m, 2 + m + n).map(Number);\n\n    const med = findMedianSortedArrays(nums1, nums2);\n    console.log(formatMedian(med));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // TODO: Return median of two sorted arrays\n        return 0.0;\n    }\n\n    public static String formatMedian(double val) {\n        if (val == (long) val) {\n            return String.valueOf((long) val);\n        }\n        return String.format(Locale.US, \"%.1f\", val);\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(\"0\");\n            return;\n        }\n        int m = scanner.nextInt();\n        int[] nums1 = new int[m];\n        for (int i = 0; i < m; i++) nums1[i] = scanner.nextInt();\n        int n = scanner.hasNextInt() ? scanner.nextInt() : 0;\n        int[] nums2 = new int[n];\n        for (int i = 0; i < n; i++) nums2[i] = scanner.nextInt();\n        double med = findMedianSortedArrays(nums1, nums2);\n        System.out.println(formatMedian(med));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "2\n1 3\n1\n2\n",
        "expectedOutput": "2"
      },
      {
        "input": "2\n1 2\n2\n3 4\n",
        "expectedOutput": "2.5"
      }
    ],
    "hiddenTests": [
      {
        "input": "0\n\n1\n1\n",
        "expectedOutput": "1"
      },
      {
        "input": "2\n0 0\n2\n0 0\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n2\n0\n\n",
        "expectedOutput": "2"
      },
      {
        "input": "3\n1 5 9\n3\n2 6 10\n",
        "expectedOutput": "5.5"
      },
      {
        "input": "5\n-10 -5 0 5 10\n5\n-8 -3 2 7 12\n",
        "expectedOutput": "1"
      }
    ]
  },
  {
    "slug": "edit-distance",
    "title": "Edit Distance",
    "difficulty": "hard",
    "tags": [
      "strings",
      "dynamic-programming"
    ],
    "description": "### Problem Statement\nGiven two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.\n\nYou have the following three operations permitted on a word:\n1. Insert a character\n2. Delete a character\n3. Replace a character\n\n### Input Format\n- Line 1: A string `word1` (may be empty).\n- Line 2: A string `word2` (may be empty).\n\n### Output Format\n- Print a single integer representing the minimum edit distance.\n\n### Constraints\n- 0 <= word1.length, word2.length <= 500\n- `word1` and `word2` consist of lowercase English letters.\n\n### Examples\n\n#### Example 1\n**Input:**\n```\nhorse\nros\n```\n**Output:**\n```\n3\n```\n**Explanation:**\nhorse -> rorse (replace 'h' with 'r')\nrorse -> rose (remove 'r')\nrose -> ros (remove 'e')\n\n#### Example 2\n**Input:**\n```\nintention\nexecution\n```\n**Output:**\n```\n5\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef min_distance(word1: str, word2: str) -> int:\n    # TODO: Return minimum edit distance\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    word1 = lines[0].strip() if len(lines) > 0 else \"\"\n    word2 = lines[1].strip() if len(lines) > 1 else \"\"\n    print(min_distance(word1, word2))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction minDistance(word1, word2) {\n    // TODO: Return minimum edit distance\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);\n    const word1 = lines[0] ? lines[0].trim() : '';\n    const word2 = lines[1] ? lines[1].trim() : '';\n    console.log(minDistance(word1, word2));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int minDistance(String word1, String word2) {\n        // TODO: Return minimum edit distance\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String word1 = scanner.hasNextLine() ? scanner.nextLine().trim() : \"\";\n        String word2 = scanner.hasNextLine() ? scanner.nextLine().trim() : \"\";\n        System.out.println(minDistance(word1, word2));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "horse\nros\n",
        "expectedOutput": "3"
      },
      {
        "input": "intention\nexecution\n",
        "expectedOutput": "5"
      }
    ],
    "hiddenTests": [
      {
        "input": "\n\n",
        "expectedOutput": "0"
      },
      {
        "input": "a\n\n",
        "expectedOutput": "1"
      },
      {
        "input": "abc\nabc\n",
        "expectedOutput": "0"
      },
      {
        "input": "zoologico\nzoologico\n",
        "expectedOutput": "0"
      },
      {
        "input": "kitten\nsitting\n",
        "expectedOutput": "3"
      }
    ]
  },
  {
    "slug": "largest-rectangle-in-histogram",
    "title": "Largest Rectangle in Histogram",
    "difficulty": "hard",
    "tags": [
      "arrays",
      "stack",
      "monotonic-stack"
    ],
    "description": "### Problem Statement\nGiven an array of integers `heights` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.\n\n### Input Format\n- Line 1: An integer `n`, representing the number of bars.\n- Line 2: `n` space-separated integers representing the bar heights.\n\n### Output Format\n- Print a single integer representing the area of the largest rectangle.\n\n### Constraints\n- 1 <= n <= 10^5\n- 0 <= heights[i] <= 10^4\n\n### Examples\n\n#### Example 1\n**Input:**\n```\n6\n2 1 5 6 2 3\n```\n**Output:**\n```\n10\n```\n**Explanation:** The largest rectangle has an area = 10 units (formed by heights 5 and 6 with width 2).\n\n#### Example 2\n**Input:**\n```\n2\n2 4\n```\n**Output:**\n```\n4\n```\n",
    "starterCode": {
      "python": "import sys\n\ndef largest_rectangle_area(heights):\n    # TODO: Return area of largest rectangle in histogram\n    return 0\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        print(0)\n        return\n    n = int(lines[0].strip()) if lines[0].strip() else 0\n    heights = list(map(int, lines[1].strip().split())) if n > 0 and len(lines) > 1 and lines[1].strip() else []\n    print(largest_rectangle_area(heights))\n\nif __name__ == \"__main__\":\n    main()\n",
      "javascript": "const fs = require('fs');\n\nfunction largestRectangleArea(heights) {\n    // TODO: Return area of largest rectangle in histogram\n    return 0;\n}\n\nfunction main() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\n    if (!lines[0]) {\n        console.log(0);\n        return;\n    }\n    const n = parseInt(lines[0].trim(), 10);\n    const heights = n > 0 && lines.length > 1 && lines[1].trim() ? lines[1].trim().split(/\\s+/).map(Number) : [];\n    console.log(largestRectangleArea(heights));\n}\n\nmain();\n",
      "java": "import java.util.*;\n\npublic class Main {\n    public static int largestRectangleArea(int[] heights) {\n        // TODO: Return area of largest rectangle in histogram\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (!scanner.hasNextInt()) {\n            System.out.println(0);\n            return;\n        }\n        int n = scanner.nextInt();\n        int[] heights = new int[n];\n        for (int i = 0; i < n; i++) heights[i] = scanner.nextInt();\n        System.out.println(largestRectangleArea(heights));\n    }\n}\n"
    },
    "sampleTests": [
      {
        "input": "6\n2 1 5 6 2 3\n",
        "expectedOutput": "10"
      },
      {
        "input": "2\n2 4\n",
        "expectedOutput": "4"
      }
    ],
    "hiddenTests": [
      {
        "input": "1\n0\n",
        "expectedOutput": "0"
      },
      {
        "input": "1\n100\n",
        "expectedOutput": "100"
      },
      {
        "input": "5\n1 2 3 4 5\n",
        "expectedOutput": "9"
      },
      {
        "input": "5\n5 5 5 5 5\n",
        "expectedOutput": "25"
      },
      {
        "input": "12\n6 2 5 4 5 1 6 7 8 2 4 1\n",
        "expectedOutput": "18"
      }
    ]
  }
];
