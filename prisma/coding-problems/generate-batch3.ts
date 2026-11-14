import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { batch3References } from "./reference/batch3.ref";

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
  // 1. contains-duplicate (Easy)
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "easy",
    tags: ["arrays", "hash-map"],
    description: `### Problem Statement
Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.

### Input Format
- Line 1: An integer \`n\` representing the number of elements in the array.
- Line 2: If \`n > 0\`, \`n\` space-separated integers representing the elements of \`nums\`. If \`n == 0\`, this line is empty.

### Output Format
- Print \`true\` if any value appears at least twice, or \`false\` otherwise.

### Constraints
- 0 <= n <= 10^5
- -10^9 <= nums[i] <= 10^9

### Examples

#### Example 1
**Input:**
\`\`\`
4
1 2 3 1
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 2
**Input:**
\`\`\`
4
1 2 3 4
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
`,
    starterCode: {
      python: `import sys

def contains_duplicate(nums):
    # TODO: Return True if any value appears at least twice, False otherwise
    return False

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("false")
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    print("true" if contains_duplicate(nums) else "false")

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function containsDuplicate(nums) {
    // TODO: Return true if any value appears at least twice, false otherwise
    return false;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log('false');
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    console.log(containsDuplicate(nums) ? 'true' : 'false');
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static boolean containsDuplicate(int[] nums) {
        // TODO: Return true if any value appears at least twice, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("false");
            return;
        }
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        System.out.println(containsDuplicate(nums) ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "4\n1 2 3 1\n",
      "4\n1 2 3 4\n",
    ],
    hiddenInputs: [
      // Empty array edge case
      "0\n\n",
      // Single element
      "1\n42\n",
      // Negative numbers with duplicate
      "5\n-1 -2 -3 -1 0\n",
      // All identical elements
      "5\n7 7 7 7 7\n",
      // Larger array without duplicates
      "50\n" + Array.from({ length: 50 }, (_, i) => i * 3 + 1).join(" ") + "\n",
    ],
  },

  // 2. single-number (Easy)
  {
    slug: "single-number",
    title: "Single Number",
    difficulty: "easy",
    tags: ["arrays", "bit-manipulation"],
    description: `### Problem Statement
Given a non-empty array of integers \`nums\`, every element appears twice except for one. Find that single one.

You must implement a solution with a linear runtime complexity and use only constant extra space.

### Input Format
- Line 1: An integer \`n\` representing the length of \`nums\` (\`n\` is odd).
- Line 2: \`n\` space-separated integers representing the elements of \`nums\`.

### Output Format
- Print a single integer representing the element that appears only once.

### Constraints
- 1 <= n <= 3 * 10^4
- -3 * 10^4 <= nums[i] <= 3 * 10^4
- Each element in the array appears twice except for one element which appears only once.

### Examples

#### Example 1
**Input:**
\`\`\`
3
2 2 1
\`\`\`
**Output:**
\`\`\`
1
\`\`\`

#### Example 2
**Input:**
\`\`\`
5
4 1 2 1 2
\`\`\`
**Output:**
\`\`\`
4
\`\`\`
`,
    starterCode: {
      python: `import sys

def single_number(nums):
    # TODO: Return the single element that appears only once
    return 0

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    print(single_number(nums))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function singleNumber(nums) {
    // TODO: Return the single element that appears only once
    return 0;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    const nums = tokens.slice(1, 1 + n).map(Number);
    console.log(singleNumber(nums));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int singleNumber(int[] nums) {
        // TODO: Return the single element that appears only once
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        System.out.println(singleNumber(nums));
    }
}
`,
    },
    sampleInputs: [
      "3\n2 2 1\n",
      "5\n4 1 2 1 2\n",
    ],
    hiddenInputs: [
      // Single element
      "1\n1\n",
      // Negative numbers
      "5\n-1 -1 -2 3 3\n",
      // Zero as unique single
      "5\n10 10 0 25 25\n",
      // Large boundary numbers
      "3\n30000 30000 -30000\n",
      // 51 elements (25 pairs + 1 single)
      (() => {
        const pairs: number[] = [];
        for (let i = 1; i <= 25; i++) {
          pairs.push(i * 10, i * 10);
        }
        pairs.push(999);
        return `${pairs.length}\n${pairs.join(" ")}\n`;
      })(),
    ],
  },

  // 3. number-of-1-bits (Easy)
  {
    slug: "number-of-1-bits",
    title: "Number of 1 Bits",
    difficulty: "easy",
    tags: ["bit-manipulation"],
    description: `### Problem Statement
Given a positive integer \`n\`, write a function that returns the number of set bits (1s) in its binary representation (also known as the Hamming weight).

### Input Format
- Line 1: A positive integer \`n\`.

### Output Format
- Print a single integer representing the count of 1s in the binary representation of \`n\`.

### Constraints
- 1 <= n <= 2^31 - 1

### Examples

#### Example 1
**Input:**
\`\`\`
11
\`\`\`
**Output:**
\`\`\`
3
\`\`\`

#### Example 2
**Input:**
\`\`\`
128
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
`,
    starterCode: {
      python: `import sys

def hamming_weight(n):
    # TODO: Return count of 1 bits in binary representation of n
    return 0

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print(0)
        return
    n = int(tokens[0])
    print(hamming_weight(n))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function hammingWeight(n) {
    // TODO: Return count of 1 bits in binary representation of n
    return 0;
}

function main() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens[0] || tokens[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(tokens[0], 10);
    console.log(hammingWeight(n));
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int hammingWeight(long n) {
        // TODO: Return count of 1 bits in binary representation of n
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextLong()) {
            System.out.println(0);
            return;
        }
        long n = scanner.nextLong();
        System.out.println(hammingWeight(n));
    }
}
`,
    },
    sampleInputs: [
      "11\n",
      "128\n",
    ],
    hiddenInputs: [
      // 1 (binary 1)
      "1\n",
      // 7 (binary 111)
      "7\n",
      // 21 (binary 10101)
      "21\n",
      // 2147483647 (2^31 - 1, thirty-one 1s)
      "2147483647\n",
      // 1048575 (2^20 - 1, twenty 1s)
      "1048575\n",
    ],
  },

  // 4. roman-to-integer (Easy)
  {
    slug: "roman-to-integer",
    title: "Roman to Integer",
    difficulty: "easy",
    tags: ["strings", "math", "hash-map"],
    description: `### Problem Statement
Roman numerals are represented by seven different symbols: \`I\` (1), \`V\` (5), \`X\` (10), \`L\` (50), \`C\` (100), \`D\` (500), and \`M\` (1000).

Given a roman numeral string \`s\`, convert it to an integer.

### Input Format
- Line 1: A string \`s\` representing a valid roman numeral.

### Output Format
- Print a single integer representing the converted value of \`s\`.

### Constraints
- 1 <= s.length <= 15
- \`s\` contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M').
- It is guaranteed that \`s\` is a valid roman numeral in the range [1, 3999].

### Examples

#### Example 1
**Input:**
\`\`\`
III
\`\`\`
**Output:**
\`\`\`
3
\`\`\`

#### Example 2
**Input:**
\`\`\`
LVIII
\`\`\`
**Output:**
\`\`\`
58
\`\`\`
`,
    starterCode: {
      python: `import sys

def roman_to_int(s):
    # TODO: Convert roman numeral string to integer
    return 0

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
      javascript: `const fs = require('fs');

function romanToInt(s) {
    // TODO: Convert roman numeral string to integer
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int romanToInt(String s) {
        // TODO: Convert roman numeral string to integer
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNext()) {
            System.out.println(0);
            return;
        }
        String s = scanner.next();
        System.out.println(romanToInt(s));
    }
}
`,
    },
    sampleInputs: [
      "III\n",
      "LVIII\n",
    ],
    hiddenInputs: [
      // MCMXCIV = 1994
      "MCMXCIV\n",
      // IV = 4
      "IV\n",
      // IX = 9
      "IX\n",
      // XL = 40
      "XL\n",
      // MMMCMXCIX = 3999
      "MMMCMXCIX\n",
    ],
  },

  // 5. longest-consecutive-sequence (Medium)
  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "medium",
    tags: ["arrays", "hash-map", "union-find"],
    description: `### Problem Statement
Given an unsorted array of integers \`nums\`, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in \`O(n)\` time.

### Input Format
- Line 1: An integer \`n\` representing the number of elements in the array.
- Line 2: If \`n > 0\`, \`n\` space-separated integers representing \`nums\`. If \`n == 0\`, this line is empty.

### Output Format
- Print a single integer representing the length of the longest consecutive elements sequence.

### Constraints
- 0 <= n <= 10^5
- -10^9 <= nums[i] <= 10^9

### Examples

#### Example 1
**Input:**
\`\`\`
6
100 4 200 1 3 2
\`\`\`
**Output:**
\`\`\`
4
\`\`\`

#### Example 2
**Input:**
\`\`\`
10
0 3 7 2 5 8 4 6 0 1
\`\`\`
**Output:**
\`\`\`
9
\`\`\`
`,
    starterCode: {
      python: `import sys

def longest_consecutive(nums):
    # TODO: Return length of longest consecutive sequence
    return 0

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
      javascript: `const fs = require('fs');

function longestConsecutive(nums) {
    // TODO: Return length of longest consecutive sequence
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int longestConsecutive(int[] nums) {
        // TODO: Return length of longest consecutive sequence
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        System.out.println(longestConsecutive(nums));
    }
}
`,
    },
    sampleInputs: [
      "6\n100 4 200 1 3 2\n",
      "10\n0 3 7 2 5 8 4 6 0 1\n",
    ],
    hiddenInputs: [
      // Empty array edge case
      "0\n\n",
      // Single element
      "1\n42\n",
      // Negative numbers with duplicates: [-3, -2, -1, -2, 0, 1, 2] -> 6
      "7\n-3 -2 -1 -2 0 1 2\n",
      // Disjoint values: 10, 20, 30, 40 -> 1
      "4\n10 20 30 40\n",
      // 40 elements with multiple interleaved sequences
      (() => {
        const arr = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100, 101, 102, 103, 1, 2, 3, 4, 5, 6, 7, 8, 9, 200, 201, 202, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
        return `${arr.length}\n${arr.join(" ")}\n`;
      })(),
    ],
  },

  // 6. number-of-provinces (Medium)
  {
    slug: "number-of-provinces",
    title: "Number of Provinces",
    difficulty: "medium",
    tags: ["graphs", "dfs", "bfs"],
    description: `### Problem Statement
There are \`n\` cities. Some of them are connected, while some are not. If city \`a\` is connected directly with city \`b\`, and city \`b\` is connected directly with city \`c\`, then city \`a\` is connected indirectly with city \`c\`.

A **province** is a group of directly or indirectly connected cities and no other cities outside of the group.

You are given an \`n x n\` matrix \`isConnected\` where \`isConnected[i][j] = 1\` if the \`i\`th city and the \`j\`th city are directly connected, and \`isConnected[i][j] = 0\` otherwise.

Return the total number of provinces.

### Input Format
- Line 1: An integer \`n\` representing the number of cities.
- Next \`n\` lines: Each line contains \`n\` space-separated integers (0 or 1) representing row \`i\` of the adjacency matrix \`isConnected\`.

### Output Format
- Print a single integer representing the total number of provinces.

### Constraints
- 1 <= n <= 200
- isConnected[i][j] is 1 or 0.
- isConnected[i][i] == 1
- isConnected[i][j] == isConnected[j][i]

### Examples

#### Example 1
**Input:**
\`\`\`
3
1 1 0
1 1 0
0 0 1
\`\`\`
**Output:**
\`\`\`
2
\`\`\`

#### Example 2
**Input:**
\`\`\`
3
1 0 0
0 1 0
0 0 1
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
`,
    starterCode: {
      python: `import sys

def find_circle_num(n, is_connected):
    # TODO: Return total number of provinces
    return 0

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
      javascript: `const fs = require('fs');

function findCircleNum(n, isConnected) {
    // TODO: Return total number of provinces
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int findCircleNum(int[][] isConnected) {
        // TODO: Return total number of provinces
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        int[][] isConnected = new int[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                isConnected[i][j] = scanner.nextInt();
            }
        }
        System.out.println(findCircleNum(isConnected));
    }
}
`,
    },
    sampleInputs: [
      "3\n1 1 0\n1 1 0\n0 0 1\n",
      "3\n1 0 0\n0 1 0\n0 0 1\n",
    ],
    hiddenInputs: [
      // Single city
      "1\n1\n",
      // Fully connected 4-city graph
      "4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1\n",
      // Chain graph: 5 cities connected in a line (1-2-3-4-5) -> 1 province
      "5\n1 1 0 0 0\n1 1 1 0 0\n0 1 1 1 0\n0 0 1 1 1\n0 0 0 1 1\n",
      // Two disjoint components of size 2 and 3 -> 2 provinces
      "5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 1 1\n0 0 1 1 1\n0 0 1 1 1\n",
      // 6 cities: 3 isolated, 1 component of size 3 -> 4 provinces
      "6\n1 1 1 0 0 0\n1 1 1 0 0 0\n1 1 1 0 0 0\n0 0 0 1 0 0\n0 0 0 0 1 0\n0 0 0 0 0 1\n",
    ],
  },

  // 7. meeting-rooms-ii (Medium)
  {
    slug: "meeting-rooms-ii",
    title: "Meeting Rooms II",
    difficulty: "medium",
    tags: ["arrays", "greedy", "heap"],
    description: `### Problem Statement
Given an array of meeting time intervals \`intervals\` where \`intervals[i] = [start_i, end_i]\`, return the minimum number of conference rooms required.

### Input Format
- Line 1: An integer \`n\` representing the number of meeting intervals.
- Next \`n\` lines: Each line contains two space-separated integers \`start end\` representing a meeting interval.

### Output Format
- Print a single integer representing the minimum number of conference rooms required.

### Constraints
- 0 <= n <= 10^4
- 0 <= start_i < end_i <= 10^6

### Examples

#### Example 1
**Input:**
\`\`\`
3
0 30
5 10
15 20
\`\`\`
**Output:**
\`\`\`
2
\`\`\`

#### Example 2
**Input:**
\`\`\`
3
7 10
2 4
15 20
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
`,
    starterCode: {
      python: `import sys

def min_meeting_rooms(intervals):
    # TODO: Return minimum number of conference rooms required
    return 0

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
      javascript: `const fs = require('fs');

function minMeetingRooms(intervals) {
    // TODO: Return minimum number of conference rooms required
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int minMeetingRooms(int[][] intervals) {
        // TODO: Return minimum number of conference rooms required
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        int[][] intervals = new int[n][2];
        for (int i = 0; i < n; i++) {
            intervals[i][0] = scanner.nextInt();
            intervals[i][1] = scanner.nextInt();
        }
        System.out.println(minMeetingRooms(intervals));
    }
}
`,
    },
    sampleInputs: [
      "3\n0 30\n5 10\n15 20\n",
      "3\n7 10\n2 4\n15 20\n",
    ],
    hiddenInputs: [
      // Zero meetings edge case
      "0\n",
      // Single meeting
      "1\n1 10\n",
      // Back-to-back non-overlapping meetings: [1, 5], [5, 10] -> 1 room
      "2\n1 5\n5 10\n",
      // All overlapping intervals: [1, 10], [2, 9], [3, 8], [4, 7] -> 4 rooms
      "4\n1 10\n2 9\n3 8\n4 7\n",
      // Complex schedule with 10 meetings
      "10\n1 4\n2 5\n7 9\n3 6\n8 12\n10 15\n11 14\n13 18\n15 20\n16 19\n",
    ],
  },

  // 8. word-break (Medium)
  {
    slug: "word-break",
    title: "Word Break",
    difficulty: "medium",
    tags: ["dynamic-programming", "strings", "trie"],
    description: `### Problem Statement
Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.

Note that the same word in the dictionary may be reused multiple times in the segmentation.

### Input Format
- Line 1: A string \`s\`.
- Line 2: An integer \`m\` representing the number of words in \`wordDict\`.
- Next \`m\` lines: One word per line from \`wordDict\`.

### Output Format
- Print \`true\` if \`s\` can be segmented, or \`false\` otherwise.

### Constraints
- 1 <= s.length <= 300
- 1 <= m <= 1000
- 1 <= word.length <= 20
- \`s\` and all words in \`wordDict\` consist of lowercase English letters.
- All strings in \`wordDict\` are distinct.

### Examples

#### Example 1
**Input:**
\`\`\`
leetcode
2
leet
code
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 2
**Input:**
\`\`\`
applepenapple
2
apple
pen
\`\`\`
**Output:**
\`\`\`
true
\`\`\`
`,
    starterCode: {
      python: `import sys

def word_break(s, word_dict):
    # TODO: Return True if s can be segmented into words from word_dict
    return False

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
      javascript: `const fs = require('fs');

function wordBreak(s, wordDict) {
    // TODO: Return true if s can be segmented into words from wordDict
    return false;
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
      java: `import java.util.*;

public class Main {
    public static boolean wordBreak(String s, List<String> wordDict) {
        // TODO: Return true if s can be segmented into words from wordDict
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNext()) {
            System.out.println("false");
            return;
        }
        String s = scanner.next();
        if (!scanner.hasNextInt()) {
            System.out.println("false");
            return;
        }
        int m = scanner.nextInt();
        List<String> wordDict = new ArrayList<>();
        for (int i = 0; i < m; i++) {
            wordDict.add(scanner.next());
        }
        System.out.println(wordBreak(s, wordDict) ? "true" : "false");
    }
}
`,
    },
    sampleInputs: [
      "leetcode\n2\nleet\ncode\n",
      "applepenapple\n2\napple\npen\n",
    ],
    hiddenInputs: [
      // Cannot be segmented: catsandog
      "catsandog\n5\ncats\ndog\nsand\nand\ncat\n",
      // Single character match
      "a\n1\na\n",
      // Multiple repeated words: aaaaaaa with [aaaa, aaa] -> true
      "aaaaaaa\n2\naaaa\naaa\n",
      // Single char mismatch: ab with [a] -> false
      "ab\n1\na\n",
      // Longer target with overlapping prefixes: goalspecial
      "goalspecial\n4\ngo\ngoal\nspecial\nspec\n",
    ],
  },

  // 9. sliding-window-maximum (Hard)
  {
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    difficulty: "hard",
    tags: ["sliding-window", "queue", "heap"],
    description: `### Problem Statement
You are given an array of integers \`nums\`, there is a sliding window of size \`k\` which is moving from the very left of the array to the very right. You can only see the \`k\` numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window.

### Input Format
- Line 1: An integer \`n\` representing the number of elements in \`nums\`.
- Line 2: \`n\` space-separated integers representing \`nums\`.
- Line 3: An integer \`k\` representing the sliding window size.

### Output Format
- Print the max in each sliding window, space-separated on a single line.

### Constraints
- 1 <= n <= 10^5
- -10^4 <= nums[i] <= 10^4
- 1 <= k <= n

### Examples

#### Example 1
**Input:**
\`\`\`
8
1 3 -1 -3 5 3 6 7
3
\`\`\`
**Output:**
\`\`\`
3 3 5 5 6 7
\`\`\`

#### Example 2
**Input:**
\`\`\`
1
1
1
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
`,
    starterCode: {
      python: `import sys

def max_sliding_window(nums, k):
    # TODO: Return space-separated max for each sliding window of size k
    return []

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        print("")
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1+n]]
    k = int(tokens[1+n]) if len(tokens) > 1 + n else 1
    res = max_sliding_window(nums, k)
    print(" ".join(str(x) for x in res))

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function maxSlidingWindow(nums, k) {
    // TODO: Return array of max for each sliding window of size k
    return [];
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
      java: `import java.util.*;

public class Main {
    public static int[] maxSlidingWindow(int[] nums, int k) {
        // TODO: Return max in each sliding window of size k
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println("");
            return;
        }
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int k = scanner.hasNextInt() ? scanner.nextInt() : 1;
        int[] res = maxSlidingWindow(nums, k);
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
      "8\n1 3 -1 -3 5 3 6 7\n3\n",
      "1\n1\n1\n",
    ],
    hiddenInputs: [
      // k = 1: each element is its own max
      "4\n4 2 1 3\n1\n",
      // k = n: single overall max
      "5\n10 20 50 30 40\n5\n",
      // Decreasing array
      "5\n9 8 7 6 5\n3\n",
      // All identical elements
      "6\n2 2 2 2 2 2\n4\n",
      // 30 elements with mixed positive and negative numbers
      "30\n12 1 -3 4 11 0 -5 8 9 15 2 -1 6 7 14 3 -8 10 19 22 -4 5 18 13 -2 16 20 8 3 17\n5\n",
    ],
  },

  // 10. n-queens-count (Hard)
  {
    slug: "n-queens-count",
    title: "N-Queens Count",
    difficulty: "hard",
    tags: ["backtracking", "recursion"],
    description: `### Problem Statement
The **n-queens** puzzle is the problem of placing \`n\` queens on an \`n x n\` chessboard such that no two queens attack each other.

Given an integer \`n\`, return the number of distinct solutions to the **n-queens puzzle**.

### Input Format
- Line 1: An integer \`n\` representing the size of the chessboard.

### Output Format
- Print a single integer representing the number of distinct solutions.

### Constraints
- 1 <= n <= 9

### Examples

#### Example 1
**Input:**
\`\`\`
4
\`\`\`
**Output:**
\`\`\`
2
\`\`\`

#### Example 2
**Input:**
\`\`\`
1
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
`,
    starterCode: {
      python: `import sys

def total_n_queens(n):
    # TODO: Return number of distinct solutions to the n-queens puzzle
    return 0

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
      javascript: `const fs = require('fs');

function totalNQueens(n) {
    // TODO: Return number of distinct solutions to the n-queens puzzle
    return 0;
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
      java: `import java.util.*;

public class Main {
    public static int totalNQueens(int n) {
        // TODO: Return number of distinct solutions to the n-queens puzzle
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) {
            System.out.println(0);
            return;
        }
        int n = scanner.nextInt();
        System.out.println(totalNQueens(n));
    }
}
`,
    },
    sampleInputs: [
      "4\n",
      "1\n",
    ],
    hiddenInputs: [
      // n = 2 -> 0
      "2\n",
      // n = 3 -> 0
      "3\n",
      // n = 5 -> 10
      "5\n",
      // n = 6 -> 4
      "6\n",
      // n = 8 -> 92
      "8\n",
    ],
  },
];

console.log("Generating batch3 problems with Python reference expected outputs...");

const generatedProblems = rawProblems.map((raw) => {
  const ref = batch3References[raw.slug];
  if (!ref) {
    throw new Error(`Missing reference for slug: ${raw.slug}`);
  }

  const sampleTests = raw.sampleInputs.map((input) => {
    const expected = runPython(ref.pythonRef, input);
    if (ref.pythonBruteForce) {
      const bfExpected = runPython(ref.pythonBruteForce, input);
      if (expected !== bfExpected) {
        throw new Error(
          `[${raw.slug}] Sample test mismatch between Python ref ('${expected}') and brute force ('${bfExpected}') on input: ${JSON.stringify(input)}`
        );
      }
    }
    return {
      input,
      expectedOutput: expected,
    };
  });

  const hiddenTests = raw.hiddenInputs.map((input) => {
    const expected = runPython(ref.pythonRef, input);
    if (ref.pythonBruteForce) {
      const bfExpected = runPython(ref.pythonBruteForce, input);
      if (expected !== bfExpected) {
        throw new Error(
          `[${raw.slug}] Hidden test mismatch between Python ref ('${expected}') and brute force ('${bfExpected}') on input: ${JSON.stringify(input)}`
        );
      }
    }
    return {
      input,
      expectedOutput: expected,
    };
  });

  return {
    slug: raw.slug,
    title: raw.title,
    difficulty: raw.difficulty,
    tags: raw.tags,
    description: raw.description,
    starterCode: raw.starterCode,
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

export const batch3Problems: CodingProblemSeed[] = ${JSON.stringify(generatedProblems, null, 2)};
`;

const outputPath = path.resolve(process.cwd(), "prisma/coding-problems/batch3.ts");
fs.writeFileSync(outputPath, fileContent, "utf-8");
console.log(`Successfully generated ${generatedProblems.length} problems in ${outputPath}!`);
