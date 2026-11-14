import { PrismaClient, Prisma } from "@prisma/client";
import { batch1Problems } from "./coding-problems/batch1";
import { batch2Problems } from "./coding-problems/batch2";
import { batch3Problems } from "./coding-problems/batch3";

const prisma = new PrismaClient();

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface CodingProblemSeed {
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

// Deterministic array of 50 elements for two-sum hidden test 5
const p1LargeArray = Array.from({ length: 50 }, (_, i) => i * i * 3 + i * 7 + 5);

const problems: CodingProblemSeed[] = [
  // --------------------------------------------------------------------------
  // Problem 1: Two Sum
  // --------------------------------------------------------------------------
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    tags: ["arrays", "hash-map"],
    description: `### Problem Statement
Given an array of integers \`nums\` and an integer \`target\`, return the 0-based indices of the two numbers such that they add up to \`target\`.

You may assume that each input has **exactly one solution**, and you may not use the same element twice. Return the indices with the smaller index first.

### Input Format
- Line 1: An integer \`n\`, representing the number of elements in the array.
- Line 2: \`n\` space-separated integers representing the elements of \`nums\`.
- Line 3: An integer \`target\`.

### Output Format
- Print two space-separated integers representing the 0-based indices of the two numbers (smaller index first).

### Constraints
- 2 <= n <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Exactly one valid answer exists.

### Examples

#### Example 1
**Input:**
\`\`\`
4
2 7 11 15
9
\`\`\`
**Output:**
\`\`\`
0 1
\`\`\`
**Explanation:** \`nums[0] + nums[1] == 2 + 7 == 9\`, so the output is \`0 1\`.

#### Example 2
**Input:**
\`\`\`
3
3 2 4
6
\`\`\`
**Output:**
\`\`\`
1 2
\`\`\`
**Explanation:** \`nums[1] + nums[2] == 2 + 4 == 6\`, so the output is \`1 2\`.
`,
    starterCode: {
      python: `import sys

def two_sum(nums, target):
    # TODO: Return [index1, index2] with index1 < index2 such that nums[index1] + nums[index2] == target
    pass

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split()))
    target = int(lines[2].strip())
    
    result = two_sum(nums, target)
    if result:
        print(f"{result[0]} {result[1]}")

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function twoSum(nums, target) {
    // TODO: Return [index1, index2] with index1 < index2 such that nums[index1] + nums[index2] === target
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = lines[1].trim().split(/\\s+/).map(Number);
    const target = parseInt(lines[2].trim(), 10);
    
    const result = twoSum(nums, target);
    if (result) {
        console.log(\`\${result[0]} \${result[1]}\`);
    }
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        // TODO: Return new int[]{index1, index2} with index1 < index2 such that nums[index1] + nums[index2] == target
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
        int target = scanner.nextInt();
        
        int[] result = twoSum(nums, target);
        if (result != null && result.length == 2) {
            System.out.println(result[0] + " " + result[1]);
        }
    }
}
`,
    },
    sampleTests: [
      {
        input: "4\n2 7 11 15\n9\n",
        expectedOutput: "0 1",
      },
      {
        input: "3\n3 2 4\n6\n",
        expectedOutput: "1 2",
      },
    ],
    hiddenTests: [
      {
        input: "2\n3 3\n6\n",
        expectedOutput: "0 1",
      },
      {
        input: "5\n-1 -2 -3 -4 -5\n-8\n",
        expectedOutput: "2 4",
      },
      {
        input: "4\n0 4 3 0\n0\n",
        expectedOutput: "0 3",
      },
      {
        input: "6\n1 5 8 3 2 9\n14\n",
        expectedOutput: "1 5",
      },
      {
        input: `50\n${p1LargeArray.join(" ")}\n5532\n`,
        expectedOutput: "14 39",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Problem 2: Valid Parentheses
  // --------------------------------------------------------------------------
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    tags: ["stack", "strings"],
    description: `### Problem Statement
Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Input Format
- A single line containing the string \`s\`.

### Output Format
- Print \`true\` if the string is valid, or \`false\` otherwise.

### Constraints
- 1 <= s.length <= 10^4
- \`s\` consists of parentheses only: \`'()[]{}'\`.

### Examples

#### Example 1
**Input:**
\`\`\`
()[]{}
\`\`\`
**Output:**
\`\`\`
true
\`\`\`

#### Example 2
**Input:**
\`\`\`
(]
\`\`\`
**Output:**
\`\`\`
false
\`\`\`
`,
    starterCode: {
      python: `import sys

def is_valid(s):
    # TODO: Return True if the bracket string is valid, False otherwise
    pass

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    s = lines[0].strip()
    result = is_valid(s)
    print("true" if result else "false")

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function isValid(s) {
    // TODO: Return true if the bracket string is valid, false otherwise
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const s = lines[0].trim();
    const result = isValid(s);
    console.log(result ? 'true' : 'false');
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        // TODO: Return true if the bracket string is valid, false otherwise
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNext()) return;
        String s = scanner.next().trim();
        boolean result = isValid(s);
        System.out.println(result ? "true" : "false");
    }
}
`,
    },
    sampleTests: [
      {
        input: "()[]{}\n",
        expectedOutput: "true",
      },
      {
        input: "(]\n",
        expectedOutput: "false",
      },
    ],
    hiddenTests: [
      {
        input: "(\n",
        expectedOutput: "false",
      },
      {
        input: "]\n",
        expectedOutput: "false",
      },
      {
        input: "{[]([{}])}\n",
        expectedOutput: "true",
      },
      {
        input: "([)]\n",
        expectedOutput: "false",
      },
      {
        input: "{()[{}]}(()){[()]}\n",
        expectedOutput: "true",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Problem 3: Maximum Subarray
  // --------------------------------------------------------------------------
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    tags: ["arrays", "dynamic-programming"],
    description: `### Problem Statement
Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

### Input Format
- Line 1: An integer \`n\`, representing the length of the array.
- Line 2: \`n\` space-separated integers representing the elements of \`nums\`.

### Output Format
- Print a single integer representing the maximum subarray sum.

### Constraints
- 1 <= n <= 10^5
- -10^4 <= nums[i] <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
9
-2 1 -3 4 -1 2 1 -5 4
\`\`\`
**Output:**
\`\`\`
6
\`\`\`
**Explanation:** The contiguous subarray \`[4, -1, 2, 1]\` has the largest sum = \`6\`.

#### Example 2
**Input:**
\`\`\`
1
1
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
**Explanation:** The subarray \`[1]\` has the largest sum = \`1\`.
`,
    starterCode: {
      python: `import sys

def max_sub_array(nums):
    # TODO: Return the maximum sum of a contiguous non-empty subarray
    pass

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    nums = list(map(int, lines[1].strip().split()))
    
    result = max_sub_array(nums)
    print(result)

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function maxSubArray(nums) {
    // TODO: Return the maximum sum of a contiguous non-empty subarray
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (lines.length < 2) return;
    const n = parseInt(lines[0].trim(), 10);
    const nums = lines[1].trim().split(/\\s+/).map(Number);
    
    const result = maxSubArray(nums);
    console.log(result);
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int maxSubArray(int[] nums) {
        // TODO: Return the maximum sum of a contiguous non-empty subarray
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
        
        int result = maxSubArray(nums);
        System.out.println(result);
    }
}
`,
    },
    sampleTests: [
      {
        input: "9\n-2 1 -3 4 -1 2 1 -5 4\n",
        expectedOutput: "6",
      },
      {
        input: "1\n1\n",
        expectedOutput: "1",
      },
    ],
    hiddenTests: [
      {
        input: "1\n-5\n",
        expectedOutput: "-5",
      },
      {
        input: "5\n-8 -3 -6 -2 -5\n",
        expectedOutput: "-2",
      },
      {
        input: "4\n5 4 1 7\n",
        expectedOutput: "17",
      },
      {
        input: "6\n0 -3 1 1 -1 2\n",
        expectedOutput: "3",
      },
      {
        input: "15\n2 -1 3 -2 5 -10 12 -3 4 8 -20 7 6 -2 1\n",
        expectedOutput: "21",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Problem 4: Longest Substring Without Repeating Characters
  // --------------------------------------------------------------------------
  {
    slug: "longest-unique-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    tags: ["strings", "sliding-window"],
    description: `### Problem Statement
Given a string \`s\`, find the length of the longest substring without repeating characters.

### Input Format
- A single line containing the string \`s\`.

### Output Format
- Print a single integer representing the length of the longest substring without duplicate characters.

### Constraints
- 1 <= s.length <= 10^5
- \`s\` consists of lowercase English letters.

### Examples

#### Example 1
**Input:**
\`\`\`
abcabcbb
\`\`\`
**Output:**
\`\`\`
3
\`\`\`
**Explanation:** The answer is \`"abc"\`, with the length of 3.

#### Example 2
**Input:**
\`\`\`
bbbbb
\`\`\`
**Output:**
\`\`\`
1
\`\`\`
**Explanation:** The answer is \`"b"\`, with the length of 1.
`,
    starterCode: {
      python: `import sys

def length_of_longest_substring(s):
    # TODO: Return the length of the longest substring without repeating characters
    pass

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    s = lines[0].strip()
    result = length_of_longest_substring(s)
    print(result)

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function lengthOfLongestSubstring(s) {
    // TODO: Return the length of the longest substring without repeating characters
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const s = lines[0].trim();
    const result = lengthOfLongestSubstring(s);
    console.log(result);
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int lengthOfLongestSubstring(String s) {
        // TODO: Return the length of the longest substring without repeating characters
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNext()) return;
        String s = scanner.next().trim();
        int result = lengthOfLongestSubstring(s);
        System.out.println(result);
    }
}
`,
    },
    sampleTests: [
      {
        input: "abcabcbb\n",
        expectedOutput: "3",
      },
      {
        input: "bbbbb\n",
        expectedOutput: "1",
      },
    ],
    hiddenTests: [
      {
        input: "a\n",
        expectedOutput: "1",
      },
      {
        input: "abcdefg\n",
        expectedOutput: "7",
      },
      {
        input: "pwwkew\n",
        expectedOutput: "3",
      },
      {
        input: "ababababab\n",
        expectedOutput: "2",
      },
      {
        input: "dvdfabcdeafg\n",
        expectedOutput: "7",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Problem 5: Merge Intervals
  // --------------------------------------------------------------------------
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "medium",
    tags: ["arrays", "sorting"],
    description: `### Problem Statement
Given an array of \`intervals\` where each interval is represented as \`[start, end]\`, merge all overlapping intervals and output the result sorted by ascending start time.

Two intervals \`[a, b]\` and \`[c, d]\` overlap if c <= b (i.e. touching intervals like \`[1, 3]\` and \`[3, 5]\` merge into \`[1, 5]\`).

### Input Format
- Line 1: An integer \`n\`, representing the number of intervals.
- The next \`n\` lines: Each contains two space-separated integers \`start\` and \`end\`.

### Output Format
- Print each merged interval on a new line as two space-separated integers \`start end\`, sorted by \`start\` in ascending order.

### Constraints
- 1 <= n <= 10^4
- -10^4 <= start <= end <= 10^4

### Examples

#### Example 1
**Input:**
\`\`\`
4
1 3
2 6
8 10
15 18
\`\`\`
**Output:**
\`\`\`
1 6
8 10
15 18
\`\`\`
**Explanation:** Intervals \`[1, 3]\` and \`[2, 6]\` overlap, merging into \`[1, 6]\`.

#### Example 2
**Input:**
\`\`\`
2
1 4
4 5
\`\`\`
**Output:**
\`\`\`
1 5
\`\`\`
**Explanation:** Intervals \`[1, 4]\` and \`[4, 5]\` touch at 4 and merge into \`[1, 5]\`.
`,
    starterCode: {
      python: `import sys

def merge_intervals(intervals):
    # TODO: Return a list of merged intervals sorted by start time
    pass

def main():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0].strip())
    intervals = []
    for i in range(1, n + 1):
        if i < len(lines):
            parts = lines[i].strip().split()
            if len(parts) >= 2:
                intervals.append([int(parts[0]), int(parts[1])])
                
    result = merge_intervals(intervals)
    if result:
        for interval in result:
            print(f"{interval[0]} {interval[1]}")

if __name__ == "__main__":
    main()
`,
      javascript: `const fs = require('fs');

function mergeIntervals(intervals) {
    // TODO: Return an array of merged intervals sorted by start time
}

function main() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
    if (!lines[0]) return;
    const n = parseInt(lines[0].trim(), 10);
    const intervals = [];
    for (let i = 1; i <= n; i++) {
        if (lines[i]) {
            const parts = lines[i].trim().split(/\\s+/).map(Number);
            if (parts.length >= 2) {
                intervals.push([parts[0], parts[1]]);
            }
        }
    }

    const result = mergeIntervals(intervals);
    if (result) {
        for (const interval of result) {
            console.log(\`\${interval[0]} \${interval[1]}\`);
        }
    }
}

main();
`,
      java: `import java.util.*;

public class Main {
    public static int[][] mergeIntervals(int[][] intervals) {
        // TODO: Return an array of merged intervals sorted by start time
        return new int[][]{};
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[][] intervals = new int[n][2];
        for (int i = 0; i < n; i++) {
            intervals[i][0] = scanner.nextInt();
            intervals[i][1] = scanner.nextInt();
        }

        int[][] result = mergeIntervals(intervals);
        if (result != null) {
            for (int[] interval : result) {
                System.out.println(interval[0] + " " + interval[1]);
            }
        }
    }
}
`,
    },
    sampleTests: [
      {
        input: "4\n1 3\n2 6\n8 10\n15 18\n",
        expectedOutput: "1 6\n8 10\n15 18",
      },
      {
        input: "2\n1 4\n4 5\n",
        expectedOutput: "1 5",
      },
    ],
    hiddenTests: [
      {
        input: "1\n2 3\n",
        expectedOutput: "2 3",
      },
      {
        input: "3\n6 8\n1 9\n2 4\n",
        expectedOutput: "1 9",
      },
      {
        input: "4\n1 2\n5 6\n9 10\n13 14\n",
        expectedOutput: "1 2\n5 6\n9 10\n13 14",
      },
      {
        input: "4\n1 2\n2 3\n3 4\n4 5\n",
        expectedOutput: "1 5",
      },
      {
        input: "6\n-10 -5\n-6 0\n2 4\n3 5\n8 12\n10 15\n",
        expectedOutput: "-10 0\n2 5\n8 15",
      },
    ],
  },
];

const allProblems: CodingProblemSeed[] = [...problems, ...batch1Problems, ...batch2Problems, ...batch3Problems];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN] Simulating seed for Coding Problems (DB will not be modified)...");
    let existingSlugs = new Set<string>();
    try {
      const existing = await prisma.codingProblem.findMany({
        select: { slug: true },
      });
      existingSlugs = new Set(existing.map((p) => p.slug));
    } catch {
      console.log("Note: Could not query existing database records; listing all candidate problems.");
    }

    for (const problem of allProblems) {
      const action = existingSlugs.has(problem.slug) ? "UPDATE" : "CREATE";
      console.log(`[DRY RUN] Would ${action} problem: ${problem.slug} (${problem.title}, ${problem.difficulty})`);
    }
    console.log(`🔍 [DRY RUN] Finished simulation. Total problems: ${allProblems.length} (${existingSlugs.size} existing, ${allProblems.length - existingSlugs.size} new).`);
    return;
  }

  console.log("🌱 Starting seed for Coding Problems...");

  for (const problem of allProblems) {
    const upserted = await prisma.codingProblem.upsert({
      where: { slug: problem.slug },
      update: {
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
        description: problem.description,
        starterCode: problem.starterCode,
        sampleTests: problem.sampleTests as unknown as Prisma.InputJsonValue,
        hiddenTests: problem.hiddenTests as unknown as Prisma.InputJsonValue,
      },
      create: {
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
        description: problem.description,
        starterCode: problem.starterCode,
        sampleTests: problem.sampleTests as unknown as Prisma.InputJsonValue,
        hiddenTests: problem.hiddenTests as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`✅ Upserted problem: ${upserted.slug} (${upserted.title})`);
  }

  console.log("✨ Coding problems seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
