import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { batch2References } from "./reference/batch2.ref";

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
  // 1. reverse-linked-list
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "easy",
    tags: ["linked-list", "two-pointers"],
    description: `### Problem Statement
Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.

### Input Format
- Line 1: An integer \`n\`, representing the number of nodes in the linked list (\`n\` may be 0).
- Line 2: If \`n > 0\`, \`n\` space-separated integers representing the node values in order. If \`n == 0\`, line 2 is empty.

### Output Format
- Print the space-separated values of the reversed linked list on a single line, or an empty line if the list is empty.

### Constraints
- 0 <= n <= 5000
- -5000 <= Node.val <= 5000

### Examples

#### Example 1
**Input:**
\`\`\`
5
1 2 3 4 5
\`\`\`
**Output:**
\`\`\`
5 4 3 2 1
\`\`\`

#### Example 2
**Input:**
\`\`\`
2
1 2
\`\`\`
**Output:**
\`\`\`
2 1
\`\`\`

#### Example 3
**Input:**
\`\`\`
0

\`\`\`
**Output:**
\`\`\`

\`\`\`
`,
    starterCode: {
      python: `import sys

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    # TODO: Return reversed linked list head
    return None

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
      javascript: `const fs = require('fs');

function ListNode(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}

function reverseList(head) {
    // TODO: Return reversed linked list head
    return null;
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
      java: `import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

public class Main {
    public static ListNode reverseList(ListNode head) {
        // TODO: Return reversed linked list head
        return null;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("");
            return;
        }
        int n = scanner.nextInt();
        if (n == 0) {
            System.out.println("");
            return;
        }
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (int i = 0; i < n; i++) {
            curr.next = new ListNode(scanner.nextInt());
            curr = curr.next;
        }
        ListNode rev = reverseList(dummy.next);
        StringBuilder sb = new StringBuilder();
        while (rev != null) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(rev.val);
            rev = rev.next;
        }
        System.out.println(sb.toString());
    }
}
`,
    },
    sampleInputs: [
      "5\n1 2 3 4 5\n",
      "2\n1 2\n",
    ],
    hiddenInputs: [
      "0\n\n",
      "1\n42\n",
      "3\n1 1 1\n",
      "4\n-10 -20 -30 -40\n",
      "10\n10 9 8 7 6 5 4 3 2 1\n",
    ],
  },

  // 2. maximum-depth-of-binary-tree
  {
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "easy",
    tags: ["binary-tree", "dfs", "bfs"],
    description: `### Problem Statement
Given the root of a binary tree, return its maximum depth.

A binary tree's **maximum depth** is the number of nodes along the longest path from the root node down to the farthest leaf node.

### Input Format
- Line 1: A single line containing the level-order traversal of the tree, space-separated, with \`"null"\` denoting missing nodes. If the tree is empty, the line is empty or \`"null"\`.

### Output Format
- Print a single integer representing the maximum depth of the binary tree.

### Constraints
- The number of nodes in the tree is in the range [0, 10^4].
- -100 <= Node.val <= 100

### Examples

#### Example 1
**Input:**
\`\`\`
3 9 20 null null 15 7
\`\`\`
**Output:**
\`\`\`
3
\`\`\`

#### Example 2
**Input:**
\`\`\`
1 null 2
\`\`\`
**Output:**
\`\`\`
2
\`\`\`
`,
    starterCode: {
      python: `import sys

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root):
    # TODO: Return maximum depth of binary tree
    return 0

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
      javascript: `const fs = require('fs');

function TreeNode(val, left, right) {
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
}

function maxDepth(root) {
    // TODO: Return maximum depth of binary tree
    return 0;
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
      java: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

public class Main {
    public static int maxDepth(TreeNode root) {
        // TODO: Return maximum depth of binary tree
        return 0;
    }

    public static TreeNode buildTree(String[] tokens) {
        if (tokens == null || tokens.length == 0 || tokens[0].equals("null") || tokens[0].isEmpty()) {
            return null;
        }
        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int idx = 1;
        while (!queue.isEmpty() && idx < tokens.length) {
            TreeNode curr = queue.poll();
            if (idx < tokens.length) {
                if (!tokens[idx].equals("null") && !tokens[idx].isEmpty()) {
                    curr.left = new TreeNode(Integer.parseInt(tokens[idx]));
                    queue.add(curr.left);
                }
                idx++;
            }
            if (idx < tokens.length) {
                if (!tokens[idx].equals("null") && !tokens[idx].isEmpty()) {
                    curr.right = new TreeNode(Integer.parseInt(tokens[idx]));
                    queue.add(curr.right);
                }
                idx++;
            }
        }
        return root;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextLine()) {
            System.out.println(0);
            return;
        }
        String line = scanner.nextLine().trim();
        if (line.isEmpty() || line.equals("null")) {
            System.out.println(0);
            return;
        }
        String[] tokens = line.split("\\\\s+");
        TreeNode root = buildTree(tokens);
        System.out.println(maxDepth(root));
    }
}
`,
    },
    sampleInputs: [
      "3 9 20 null null 15 7\n",
      "1 null 2\n",
    ],
    hiddenInputs: [
      "null\n",
      "1\n",
      "1 2 3 4 5 null null\n",
      "1 2 null 3 null 4 null 5\n",
      "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15\n",
    ],
  },

  // 3. valid-anagram
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "easy",
    tags: ["strings", "hash-map"],
    description: `### Problem Statement
Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

### Input Format
- Line 1: A string \`s\`.
- Line 2: A string \`t\`.

### Output Format
- Print \`true\` if \`t\` is an anagram of \`s\`, or \`false\` otherwise.

### Constraints
- 1 <= s.length, t.length <= 5 * 10^4
- \`s\` and \`t\` consist of lowercase English letters.

### Examples

#### Example 1
**Input:**
\`\`\`
anagram
nagaram
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 2
**Input:**
\`\`\`
rat
car
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
`,
    starterCode: {
      python: `import sys

def is_anagram(s: str, t: str) -> bool:
    # TODO: Return True if t is an anagram of s, False otherwise
    return False

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
      javascript: `const fs = require('fs');

function isAnagram(s, t) {
    // TODO: Return true if t is an anagram of s, false otherwise
    return false;
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
      java: `import java.util.*;

public class Main {
    public static boolean isAnagram(String s, String t) {
        // TODO: Return true if t is an anagram of s, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNext() ? scanner.next() : "";
        String t = scanner.hasNext() ? scanner.next() : "";
        System.out.println(isAnagram(s, t) ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "anagram\nnagaram\n",
      "rat\ncar\n",
    ],
    hiddenInputs: [
      "a\na\n",
      "a\nb\n",
      "ab\na\n",
      "listen\nsilent\n",
      "aaccbbdd\nbbddccaa\n",
    ],
  },

  // 4. group-anagrams-count
  {
    slug: "group-anagrams-count",
    title: "Group Anagrams Count",
    difficulty: "medium",
    tags: ["strings", "hash-map", "sorting"],
    description: `### Problem Statement
Given an array of strings \`strs\`, group the anagrams together and return the total number of distinct anagram groups.

An **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

### Input Format
- Line 1: An integer \`n\`, representing the number of strings in \`strs\`.
- Line 2: \`n\` space-separated strings.

### Output Format
- Print a single integer representing the number of distinct anagram groups.

### Constraints
- 1 <= n <= 10^4
- 0 <= strs[i].length <= 100
- \`strs[i]\` consists of lowercase English letters.

### Examples

#### Example 1
**Input:**
\`\`\`
6
eat tea tan ate nat bat
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:** The groups are \`["bat"]\`, \`["nat", "tan"]\`, and \`["ate", "eat", "tea"]\`.

#### Example 2
**Input:**
\`\`\`
1
a
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
`,
    starterCode: {
      python: `import sys

def group_anagrams_count(strs):
    # TODO: Return total number of distinct anagram groups
    return 0

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
      javascript: `const fs = require('fs');

function groupAnagramsCount(strs) {
    // TODO: Return total number of distinct anagram groups
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int groupAnagramsCount(String[] strs) {
        // TODO: Return total number of distinct anagram groups
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        String[] strs = new String[n];
        for (int i = 0; i < n; i++) {
            strs[i] = scanner.next();
        }
        System.out.println(groupAnagramsCount(strs));
    }
}
`,
    },
    sampleInputs: [
      "6\neat tea tan ate nat bat\n",
      "1\na\n",
    ],
    hiddenInputs: [
      "3\na b c\n",
      "4\naaa aaa aaa aaa\n",
      "4\nab ba cd dc\n",
      "5\nabc bca cba cab bac\n",
      "10\napple ppael leapp orange orgena banana ananab grape perag pear\n",
    ],
  },

  // 5. kth-largest-element
  {
    slug: "kth-largest-element",
    title: "Kth Largest Element in an Array",
    difficulty: "medium",
    tags: ["arrays", "heap", "quickselect"],
    description: `### Problem Statement
Given an integer array \`nums\` and an integer \`k\`, return the \`k\`-th largest element in the array.

Note that it is the \`k\`-th largest element in the sorted order, not the \`k\`-th distinct element.

### Input Format
- Line 1: An integer \`n\`, the size of \`nums\`.
- Line 2: \`n\` space-separated integers representing \`nums\`.
- Line 3: An integer \`k\`.

### Output Format
- Print a single integer representing the \`k\`-th largest element.

### Constraints
- 1 <= k <= n <= 10^5
- -10^4 <= nums[i] <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
6
3 2 1 5 6 4
2
\`\`\`
**Output:**
\`\`\`
5
\`\`\`

#### Example 2
**Input:**
\`\`\`
9
3 2 3 1 2 4 5 5 6
4
\`\`\`
**Output:**
\`\`\`
4
\`\`\`
`,
    starterCode: {
      python: `import sys

def find_kth_largest(nums, k):
    # TODO: Return kth largest element in nums
    return 0

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
      javascript: `const fs = require('fs');

function findKthLargest(nums, k) {
    // TODO: Return kth largest element in nums
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int findKthLargest(int[] nums, int k) {
        // TODO: Return kth largest element in nums
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int k = scanner.hasNextInt() ? scanner.nextInt() : 1;
        System.out.println(findKthLargest(nums, k));
    }
}
`,
    },
    sampleInputs: [
      "6\n3 2 1 5 6 4\n2\n",
      "9\n3 2 3 1 2 4 5 5 6\n4\n",
    ],
    hiddenInputs: [
      "1\n10\n1\n",
      "5\n7 7 7 7 7\n3\n",
      "5\n-5 -2 -9 -1 -6\n1\n",
      "6\n10 20 30 40 50 60\n6\n",
      "15\n12 45 19 88 33 24 99 71 50 3 66 82 14 55 2\n5\n",
    ],
  },

  // 6. course-schedule
  {
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "medium",
    tags: ["graphs", "topological-sort", "bfs-dfs"],
    description: `### Problem Statement
There are a total of \`numCourses\` courses you have to take, labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where each pair \`[a, b]\` indicates that you must take course \`b\` first if you want to take course \`a\`.

Return \`true\` if you can finish all courses, or \`false\` otherwise.

### Input Format
- Line 1: An integer \`numCourses\`.
- Line 2: An integer \`m\`, the number of prerequisite pairs.
- Next \`m\` lines: Two space-separated integers \`a\` and \`b\` per line, indicating course \`b\` is a prerequisite for \`a\`.

### Output Format
- Print \`true\` if it is possible to finish all courses, or \`false\` otherwise.

### Constraints
- 1 <= numCourses <= 2000
- 0 <= m <= 5000
- 0 <= a, b < numCourses
- All the pairs \`[a, b]\` are unique.

### Examples

#### Example 1
**Input:**
\`\`\`
2
1
1 0
\`\`\`
**Output:**
\`\`\`
true
\`\`\`
**Explanation:** There are 2 courses to take. To take course 1 you should have finished course 0. So it is possible.

#### Example 2
**Input:**
\`\`\`
2
2
1 0
0 1
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
**Explanation:** There are 2 courses to take. To take course 1 you must have finished course 0, and to take course 0 you must have finished course 1. So it is impossible.
`,
    starterCode: {
      python: `import sys

def can_finish(num_courses, prerequisites):
    # TODO: Return True if all courses can be finished, False otherwise
    return False

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
      javascript: `const fs = require('fs');

function canFinish(numCourses, prerequisites) {
    // TODO: Return true if all courses can be finished, false otherwise
    return false;
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
      java: `import java.util.*;

public class Main {
    public static boolean canFinish(int numCourses, int[][] prerequisites) {
        // TODO: Return true if all courses can be finished, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("true");
            return;
        }
        int numCourses = scanner.nextInt();
        int m = scanner.hasNextInt() ? scanner.nextInt() : 0;
        int[][] prereqs = new int[m][2];
        for (int i = 0; i < m; i++) {
            prereqs[i][0] = scanner.nextInt();
            prereqs[i][1] = scanner.nextInt();
        }
        System.out.println(canFinish(numCourses, prereqs) ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "2\n1\n1 0\n",
      "2\n2\n1 0\n0 1\n",
    ],
    hiddenInputs: [
      "1\n0\n",
      "3\n2\n1 0\n2 1\n",
      "3\n3\n1 0\n2 1\n0 2\n",
      "4\n3\n1 0\n2 0\n3 1\n",
      "6\n6\n1 0\n2 1\n3 2\n4 3\n5 4\n0 5\n",
    ],
  },

  // 7. word-search
  {
    slug: "word-search",
    title: "Word Search",
    difficulty: "medium",
    tags: ["backtracking", "matrix", "dfs"],
    description: `### Problem Statement
Given an \`m x n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.

### Input Format
- Line 1: Two space-separated integers \`m\` and \`n\`, representing the number of rows and columns.
- Next \`m\` lines: A string of length \`n\` per line (characters with no spaces), representing the rows of the board.
- Line \`m + 2\`: A string representing \`word\`.

### Output Format
- Print \`true\` if the word exists in the grid, or \`false\` otherwise.

### Constraints
- 1 <= m, n <= 6
- 1 <= word.length <= 15
- \`board\` and \`word\` consist of only lowercase and uppercase English letters.

### Examples

#### Example 1
**Input:**
\`\`\`
3 4
ABCE
SFCS
ADEE
ABCCED
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 2
**Input:**
\`\`\`
3 4
ABCE
SFCS
ADEE
SEE
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 3
**Input:**
\`\`\`
3 4
ABCE
SFCS
ADEE
ABCB
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
`,
    starterCode: {
      python: `import sys

def exist(board, word):
    # TODO: Return True if word exists in the board, False otherwise
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
      javascript: `const fs = require('fs');

function exist(board, word) {
    // TODO: Return true if word exists in the board, false otherwise
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
      java: `import java.util.*;

public class Main {
    public static boolean exist(char[][] board, String word) {
        // TODO: Return true if word exists in the board, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("false");
            return;
        }
        int m = scanner.nextInt();
        int n = scanner.nextInt();
        char[][] board = new char[m][n];
        for (int i = 0; i < m; i++) {
            String row = scanner.next();
            for (int j = 0; j < n; j++) {
                board[i][j] = row.charAt(j);
            }
        }
        String word = scanner.hasNext() ? scanner.next() : "";
        System.out.println(exist(board, word) ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "3 4\nABCE\nSFCS\nADEE\nABCCED\n",
      "3 4\nABCE\nSFCS\nADEE\nABCB\n",
    ],
    hiddenInputs: [
      "1 1\nA\nA\n",
      "1 1\nA\nB\n",
      "2 2\nAB\nCD\nACDB\n",
      "3 3\nAAA\nAAA\nAAA\nAAAAAAAAA\n",
      "4 4\nEASY\nCODE\nTEST\nPASS\nFAST\n",
    ],
  },

  // 8. median-of-two-sorted-arrays
  {
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    tags: ["arrays", "binary-search", "divide-and-conquer"],
    description: `### Problem Statement
Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the median of the two sorted arrays.

The overall run time complexity should be \`O(log (m+n))\`.

### Input Format
- Line 1: An integer \`m\`, the number of elements in \`nums1\`.
- Line 2: If \`m > 0\`, \`m\` space-separated integers representing \`nums1\`. If \`m == 0\`, line 2 is empty.
- Line 3: An integer \`n\`, the number of elements in \`nums2\`.
- Line 4: If \`n > 0\`, \`n\` space-separated integers representing \`nums2\`. If \`n == 0\`, line 4 is empty.

### Output Format
- Print the median as a single number. If the median is an integer, print it as an integer (e.g. \`2\`); if it has a fractional part, print it with exactly one decimal place (e.g. \`2.5\`). Do not print trailing \`.0\` for whole numbers.

### Constraints
- 0 <= m, n <= 1000
- 1 <= m + n <= 2000
- -10^6 <= nums1[i], nums2[i] <= 10^6

### Examples

#### Example 1
**Input:**
\`\`\`
2
1 3
1
2
\`\`\`
**Output:**
\`\`\`
2
\`\`\`
**Explanation:** merged array = [1,2,3] and median is 2.

#### Example 2
**Input:**
\`\`\`
2
1 2
2
3 4
\`\`\`
**Output:**
\`\`\`
2.5
\`\`\`
**Explanation:** merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.
`,
    starterCode: {
      python: `import sys

def find_median_sorted_arrays(nums1, nums2):
    # TODO: Return median of two sorted arrays
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
      javascript: `const fs = require('fs');

function findMedianSortedArrays(nums1, nums2) {
    // TODO: Return median of two sorted arrays
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
      java: `import java.util.*;

public class Main {
    public static double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // TODO: Return median of two sorted arrays
        return 0.0;
    }

    public static String formatMedian(double val) {
        if (val == (long) val) {
            return String.valueOf((long) val);
        }
        return String.format(Locale.US, "%.1f", val);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("0");
            return;
        }
        int m = scanner.nextInt();
        int[] nums1 = new int[m];
        for (int i = 0; i < m; i++) nums1[i] = scanner.nextInt();
        int n = scanner.hasNextInt() ? scanner.nextInt() : 0;
        int[] nums2 = new int[n];
        for (int i = 0; i < n; i++) nums2[i] = scanner.nextInt();
        double med = findMedianSortedArrays(nums1, nums2);
        System.out.println(formatMedian(med));
    }
}
`,
    },
    sampleInputs: [
      "2\n1 3\n1\n2\n",
      "2\n1 2\n2\n3 4\n",
    ],
    hiddenInputs: [
      "0\n\n1\n1\n",
      "2\n0 0\n2\n0 0\n",
      "1\n2\n0\n\n",
      "3\n1 5 9\n3\n2 6 10\n",
      "5\n-10 -5 0 5 10\n5\n-8 -3 2 7 12\n",
    ],
  },

  // 9. edit-distance
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "hard",
    tags: ["strings", "dynamic-programming"],
    description: `### Problem Statement
Given two strings \`word1\` and \`word2\`, return the minimum number of operations required to convert \`word1\` to \`word2\`.

You have the following three operations permitted on a word:
1. Insert a character
2. Delete a character
3. Replace a character

### Input Format
- Line 1: A string \`word1\` (may be empty).
- Line 2: A string \`word2\` (may be empty).

### Output Format
- Print a single integer representing the minimum edit distance.

### Constraints
- 0 <= word1.length, word2.length <= 500
- \`word1\` and \`word2\` consist of lowercase English letters.

### Examples

#### Example 1
**Input:**
\`\`\`
horse
ros
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:**
horse -> rorse (replace 'h' with 'r')
rorse -> rose (remove 'r')
rose -> ros (remove 'e')

#### Example 2
**Input:**
\`\`\`
intention
execution
\`\`\`
**Output:**
\`\`\`
5
\`\`\`
`,
    starterCode: {
      python: `import sys

def min_distance(word1: str, word2: str) -> int:
    # TODO: Return minimum edit distance
    return 0

def main():
    lines = sys.stdin.read().splitlines()
    word1 = lines[0].strip() if len(lines) > 0 else ""
    word2 = lines[1].strip() if len(lines) > 1 else ""
    print(min_distance(word1, word2))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function minDistance(word1, word2) {
    // TODO: Return minimum edit distance
    return 0;
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
    const word1 = lines[0] ? lines[0].trim() : '';
    const word2 = lines[1] ? lines[1].trim() : '';
    console.log(minDistance(word1, word2));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int minDistance(String word1, String word2) {
        // TODO: Return minimum edit distance
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String word1 = scanner.hasNextLine() ? scanner.nextLine().trim() : "";
        String word2 = scanner.hasNextLine() ? scanner.nextLine().trim() : "";
        System.out.println(minDistance(word1, word2));
    }
}
`,
    },
    sampleInputs: [
      "horse\nros\n",
      "intention\nexecution\n",
    ],
    hiddenInputs: [
      "\n\n",
      "a\n\n",
      "abc\nabc\n",
      "zoologico\nzoologico\n",
      "kitten\nsitting\n",
    ],
  },

  // 10. largest-rectangle-in-histogram
  {
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "hard",
    tags: ["arrays", "stack", "monotonic-stack"],
    description: `### Problem Statement
Given an array of integers \`heights\` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.

### Input Format
- Line 1: An integer \`n\`, representing the number of bars.
- Line 2: \`n\` space-separated integers representing the bar heights.

### Output Format
- Print a single integer representing the area of the largest rectangle.

### Constraints
- 1 <= n <= 10^5
- 0 <= heights[i] <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
6
2 1 5 6 2 3
\`\`\`
**Output:**
\`\`\`
10
\`\`\`
**Explanation:** The largest rectangle has an area = 10 units (formed by heights 5 and 6 with width 2).

#### Example 2
**Input:**
\`\`\`
2
2 4
\`\`\`
**Output:**
\`\`\`
4
\`\`\`
`,
    starterCode: {
      python: `import sys

def largest_rectangle_area(heights):
    # TODO: Return area of largest rectangle in histogram
    return 0

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
      javascript: `const fs = require('fs');

function largestRectangleArea(heights) {
    // TODO: Return area of largest rectangle in histogram
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int largestRectangleArea(int[] heights) {
        // TODO: Return area of largest rectangle in histogram
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        int[] heights = new int[n];
        for (int i = 0; i < n; i++) heights[i] = scanner.nextInt();
        System.out.println(largestRectangleArea(heights));
    }
}
`,
    },
    sampleInputs: [
      "6\n2 1 5 6 2 3\n",
      "2\n2 4\n",
    ],
    hiddenInputs: [
      "1\n0\n",
      "1\n100\n",
      "5\n1 2 3 4 5\n",
      "5\n5 5 5 5 5\n",
      "12\n6 2 5 4 5 1 6 7 8 2 4 1\n",
    ],
  },
];

console.log("Generating batch2 problems with Python reference expected outputs...");

const generatedProblems = rawProblems.map((p) => {
  const ref = batch2References[p.slug];
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

export const batch2Problems: CodingProblemSeed[] = ${JSON.stringify(generatedProblems, null, 2)};
`;

const outputPath = path.resolve(process.cwd(), "prisma/coding-problems/batch2.ts");
fs.writeFileSync(outputPath, fileContent, "utf-8");
console.log(`Successfully generated ${generatedProblems.length} problems in ${outputPath}!`);
