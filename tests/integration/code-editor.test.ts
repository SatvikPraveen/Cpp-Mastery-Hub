// File: tests/integration/code-editor.test.ts
// Extension: .ts
// Location: tests/integration/code-editor.test.ts

/**
 * C++ Mastery Hub - Code Editor Integration Tests
 * Comprehensive tests for code editing, compilation, and execution
 */

import { test, expect } from './setup';
import { CodeEditorHelpers, PageHelpers } from './setup';

test.describe('Code Editor Functionality', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/playground');
    await authenticatedPage.waitForSelector('[data-testid="code-editor"]', { state: 'visible' });
  });

  test.describe('Basic Editor Features', () => {
    test('should load with default C++ template', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      // Check if editor loads with default template
      const editor = authenticatedPage.locator('[data-testid="code-editor"]');
      await expect(editor).toBeVisible();
      
      // Verify default C++ template content
      const editorContent = await editor.inputValue();
      expect(editorContent).toContain('#include <iostream>');
      expect(editorContent).toContain('int main()');
    });

    test('should support syntax highlighting', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        
        int main() {
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
      `);

      // Check for syntax highlighting elements
      await expect(authenticatedPage.locator('.token.keyword')).toBeVisible();
      await expect(authenticatedPage.locator('.token.string')).toBeVisible();
      await expect(authenticatedPage.locator('.token.comment')).toBeVisible();
    });

    test('should provide auto-completion', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode('#include <iostream>\n\nint main() {\n    std::c');
      
      // Trigger auto-completion
      await authenticatedPage.keyboard.press('Control+Space');
      
      // Check for completion suggestions
      await expect(authenticatedPage.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="suggestion-cout"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="suggestion-cin"]')).toBeVisible();
    });

    test('should show line numbers', async ({ authenticatedPage }) => {
      await expect(authenticatedPage.locator('.line-numbers')).toBeVisible();
      
      // Check that line numbers are properly displayed
      await expect(authenticatedPage.locator('.line-number[data-line="1"]')).toContainText('1');
      await expect(authenticatedPage.locator('.line-number[data-line="2"]')).toContainText('2');
    });

    test('should support keyboard shortcuts', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode('int main() {\n    return 0;\n}');
      
      // Test Ctrl+A (Select All)
      await authenticatedPage.keyboard.press('Control+A');
      const selectedText = await authenticatedPage.evaluate(() => window.getSelection()?.toString());
      expect(selectedText).toContain('int main()');
      
      // Test Ctrl+Z (Undo)
      await authenticatedPage.keyboard.press('Delete');
      await authenticatedPage.keyboard.press('Control+Z');
      
      const restoredContent = await authenticatedPage.locator('[data-testid="code-editor"]').inputValue();
      expect(restoredContent).toContain('int main()');
    });

    test('should support multiple themes', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      // Switch to dark theme
      await pageHelpers.clickButton('[data-testid="theme-selector"]');
      await pageHelpers.clickButton('[data-testid="theme-dark"]');
      
      // Verify theme change
      await expect(authenticatedPage.locator('[data-testid="code-editor"]')).toHaveClass(/dark-theme/);
      
      // Switch to light theme
      await pageHelpers.clickButton('[data-testid="theme-selector"]');
      await pageHelpers.clickButton('[data-testid="theme-light"]');
      
      await expect(authenticatedPage.locator('[data-testid="code-editor"]')).toHaveClass(/light-theme/);
    });
  });

  test.describe('Code Compilation', () => {
    test('should compile valid C++ code successfully', async ({ authenticatedPage, testData }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const helloWorldCode = testData.getCodeExample(0);
      
      await codeEditorHelpers.enterCode(helloWorldCode.code);
      
      // Compile the code
      await authenticatedPage.click('[data-testid="compile-button"]');
      
      // Wait for compilation to complete
      await authenticatedPage.waitForSelector('[data-testid="compilation-success"]', { timeout: 10000 });
      
      // Verify compilation success
      await expect(authenticatedPage.locator('[data-testid="compilation-status"]')).toContainText('Compilation successful');
      await expect(authenticatedPage.locator('[data-testid="run-button"]')).toBeEnabled();
    });

    test('should show compilation errors for invalid code', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      // Enter code with syntax errors
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            std::cout << "Missing semicolon"
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="compile-button"]');
      
      // Wait for compilation to complete
      await authenticatedPage.waitForSelector('[data-testid="compilation-error"]', { timeout: 10000 });
      
      // Verify error display
      await expect(authenticatedPage.locator('[data-testid="compilation-status"]')).toContainText('Compilation failed');
      await expect(authenticatedPage.locator('[data-testid="error-message"]')).toContainText('expected');
      await expect(authenticatedPage.locator('[data-testid="run-button"]')).toBeDisabled();
    });

    test('should highlight compilation errors in editor', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            undeclared_variable = 5;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="compile-button"]');
      await authenticatedPage.waitForSelector('[data-testid="compilation-error"]');
      
      // Check for error highlighting in editor
      await expect(authenticatedPage.locator('.error-highlight')).toBeVisible();
      await expect(authenticatedPage.locator('.error-squiggle')).toBeVisible();
    });

    test('should show compiler warnings', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            int unused_variable = 42;
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="compile-button"]');
      await authenticatedPage.waitForSelector('[data-testid="compilation-success"]');
      
      // Check for warnings
      await expect(authenticatedPage.locator('[data-testid="compilation-warnings"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="warning-message"]')).toContainText('unused variable');
    });
  });

  test.describe('Code Execution', () => {
    test('should execute valid C++ code and show output', async ({ authenticatedPage, testData }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const helloWorldCode = testData.getCodeExample(0);
      
      await codeEditorHelpers.enterCode(helloWorldCode.code);
      await codeEditorHelpers.runCode();
      
      // Verify output
      await codeEditorHelpers.expectOutput(helloWorldCode.expectedOutput);
      
      // Check execution status
      await expect(authenticatedPage.locator('[data-testid="execution-status"]')).toContainText('Execution completed');
      await expect(authenticatedPage.locator('[data-testid="execution-time"]')).toBeVisible();
    });

    test('should handle infinite loops with timeout', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            while(true) {
                std::cout << "Infinite loop" << std::endl;
            }
            return 0;
        }
      `);
      
      await codeEditorHelpers.runCode();
      
      // Should timeout and show appropriate message
      await expect(authenticatedPage.locator('[data-testid="execution-timeout"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="timeout-message"]')).toContainText('Execution timed out');
    });

    test('should handle runtime errors', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        
        int main() {
            std::vector<int> vec = {1, 2, 3};
            std::cout << vec.at(10) << std::endl;  // Out of bounds
            return 0;
        }
      `);
      
      await codeEditorHelpers.runCode();
      
      // Should show runtime error
      await codeEditorHelpers.expectError();
      await expect(authenticatedPage.locator('[data-testid="runtime-error"]')).toContainText('out_of_range');
    });

    test('should support input for interactive programs', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <string>
        
        int main() {
            std::string name;
            std::cout << "Enter your name: ";
            std::cin >> name;
            std::cout << "Hello, " << name << "!" << std::endl;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="compile-button"]');
      await authenticatedPage.waitForSelector('[data-testid="compilation-success"]');
      
      await authenticatedPage.click('[data-testid="run-button"]');
      
      // Wait for input prompt
      await expect(authenticatedPage.locator('[data-testid="input-required"]')).toBeVisible();
      
      // Provide input
      await authenticatedPage.fill('[data-testid="program-input"]', 'John');
      await authenticatedPage.click('[data-testid="send-input-button"]');
      
      // Check output
      await codeEditorHelpers.expectOutput('Enter your name: Hello, John!');
    });

    test('should track execution statistics', async ({ authenticatedPage, testData }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const fibonacciCode = testData.getCodeExample(1);
      
      await codeEditorHelpers.enterCode(fibonacciCode.code);
      await codeEditorHelpers.runCode();
      
      // Check execution statistics
      await expect(authenticatedPage.locator('[data-testid="execution-time"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="memory-usage"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="cpu-usage"]')).toBeVisible();
      
      // Verify statistics have meaningful values
      const executionTime = await authenticatedPage.locator('[data-testid="execution-time"]').textContent();
      expect(executionTime).toMatch(/\d+\s*ms/);
    });
  });

  test.describe('Code Analysis', () => {
    test('should perform static analysis on code', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        
        int main() {
            int* ptr = new int(42);
            std::vector<int> vec;
            for(int i = 0; i < 1000000; i++) {
                vec.push_back(i);
            }
            // Memory leak: ptr is never deleted
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="analyze-button"]');
      await authenticatedPage.waitForSelector('[data-testid="analysis-complete"]');
      
      // Check analysis results
      await expect(authenticatedPage.locator('[data-testid="analysis-results"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="memory-leak-warning"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="performance-warning"]')).toBeVisible();
    });

    test('should show code quality metrics', async ({ authenticatedPage, testData }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const codeExample = testData.getCodeExample(1);
      
      await codeEditorHelpers.enterCode(codeExample.code);
      await authenticatedPage.click('[data-testid="analyze-button"]');
      await authenticatedPage.waitForSelector('[data-testid="analysis-complete"]');
      
      // Check quality metrics
      await expect(authenticatedPage.locator('[data-testid="complexity-score"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="maintainability-index"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="code-smells"]')).toBeVisible();
      
      // Verify metrics have reasonable values
      const complexityScore = await authenticatedPage.locator('[data-testid="complexity-score"]').textContent();
      expect(complexityScore).toMatch(/\d+/);
    });

    test('should provide security vulnerability scanning', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <cstring>
        
        int main() {
            char buffer[10];
            char input[100] = "This is a very long string that will overflow";
            strcpy(buffer, input);  // Buffer overflow vulnerability
            std::cout << buffer << std::endl;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="analyze-button"]');
      await authenticatedPage.waitForSelector('[data-testid="analysis-complete"]');
      
      // Check security warnings
      await expect(authenticatedPage.locator('[data-testid="security-vulnerabilities"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="buffer-overflow-warning"]')).toBeVisible();
    });

    test('should suggest code improvements', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        
        int main() {
            std::vector<int> numbers;
            numbers.push_back(1);
            numbers.push_back(2);
            numbers.push_back(3);
            
            for(int i = 0; i < numbers.size(); i++) {
                std::cout << numbers[i] << std::endl;
            }
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="analyze-button"]');
      await authenticatedPage.waitForSelector('[data-testid="analysis-complete"]');
      
      // Check suggestions
      await expect(authenticatedPage.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="range-based-for-suggestion"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="initialization-list-suggestion"]')).toBeVisible();
    });
  });

  test.describe('Memory Visualization', () => {
    test('should visualize stack and heap memory', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            int stackVar = 42;
            int* heapVar = new int(100);
            
            std::cout << "Stack: " << stackVar << std::endl;
            std::cout << "Heap: " << *heapVar << std::endl;
            
            delete heapVar;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="visualize-button"]');
      await authenticatedPage.waitForSelector('[data-testid="memory-visualization"]');
      
      // Check memory visualization components
      await expect(authenticatedPage.locator('[data-testid="stack-memory"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="heap-memory"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="variable-stackVar"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="variable-heapVar"]')).toBeVisible();
    });

    test('should show memory allocation and deallocation', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        
        int main() {
            std::vector<int>* vec = new std::vector<int>();
            vec->push_back(1);
            vec->push_back(2);
            vec->push_back(3);
            delete vec;
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="visualize-button"]');
      await authenticatedPage.click('[data-testid="step-through-button"]');
      
      // Step through execution and check memory changes
      await authenticatedPage.click('[data-testid="next-step"]');
      await expect(authenticatedPage.locator('[data-testid="allocation-event"]')).toBeVisible();
      
      // Continue to deletion
      while (await authenticatedPage.locator('[data-testid="next-step"]').isEnabled()) {
        await authenticatedPage.click('[data-testid="next-step"]');
      }
      
      await expect(authenticatedPage.locator('[data-testid="deallocation-event"]')).toBeVisible();
    });

    test('should detect and highlight memory leaks', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            int* leaked = new int(42);
            int* another_leak = new int[100];
            // No delete statements - memory leaks!
            return 0;
        }
      `);
      
      await authenticatedPage.click('[data-testid="visualize-button"]');
      await authenticatedPage.waitForSelector('[data-testid="memory-visualization"]');
      
      // Check for leak detection
      await expect(authenticatedPage.locator('[data-testid="memory-leaks"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="leaked-memory"]')).toHaveCount(2);
      await expect(authenticatedPage.locator('[data-testid="leak-warning"]')).toContainText('Memory leak detected');
    });
  });

  test.describe('File Management', () => {
    test('should save and load code files', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            std::cout << "Test file content" << std::endl;
            return 0;
        }
      `);
      
      // Save file
      await pageHelpers.clickButton('[data-testid="save-button"]');
      await pageHelpers.fillFormField('[data-testid="filename-input"]', 'test-file.cpp');
      await pageHelpers.clickButton('[data-testid="confirm-save-button"]');
      
      // Verify save success
      await pageHelpers.expectSuccessMessage('File saved successfully');
      
      // Clear editor and load file
      await codeEditorHelpers.enterCode('');
      await pageHelpers.clickButton('[data-testid="load-button"]');
      await pageHelpers.clickButton('[data-testid="file-test-file.cpp"]');
      
      // Verify file loaded
      const loadedContent = await authenticatedPage.locator('[data-testid="code-editor"]').inputValue();
      expect(loadedContent).toContain('Test file content');
    });

    test('should create new file from template', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      await pageHelpers.clickButton('[data-testid="new-file-button"]');
      await pageHelpers.clickButton('[data-testid="template-class"]');
      
      // Verify template loaded
      const templateContent = await authenticatedPage.locator('[data-testid="code-editor"]').inputValue();
      expect(templateContent).toContain('class');
      expect(templateContent).toContain('public:');
      expect(templateContent).toContain('private:');
    });

    test('should support multiple file tabs', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      // Create first file
      await codeEditorHelpers.enterCode('// File 1 content');
      await pageHelpers.clickButton('[data-testid="save-button"]');
      await pageHelpers.fillFormField('[data-testid="filename-input"]', 'file1.cpp');
      await pageHelpers.clickButton('[data-testid="confirm-save-button"]');
      
      // Create second file
      await pageHelpers.clickButton('[data-testid="new-file-button"]');
      await codeEditorHelpers.enterCode('// File 2 content');
      await pageHelpers.clickButton('[data-testid="save-button"]');
      await pageHelpers.fillFormField('[data-testid="filename-input"]', 'file2.cpp');
      await pageHelpers.clickButton('[data-testid="confirm-save-button"]');
      
      // Verify tabs exist
      await expect(authenticatedPage.locator('[data-testid="tab-file1.cpp"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="tab-file2.cpp"]')).toBeVisible();
      
      // Switch between tabs
      await pageHelpers.clickButton('[data-testid="tab-file1.cpp"]');
      const file1Content = await authenticatedPage.locator('[data-testid="code-editor"]').inputValue();
      expect(file1Content).toContain('File 1 content');
      
      await pageHelpers.clickButton('[data-testid="tab-file2.cpp"]');
      const file2Content = await authenticatedPage.locator('[data-testid="code-editor"]').inputValue();
      expect(file2Content).toContain('File 2 content');
    });
  });

  test.describe('Collaboration Features', () => {
    test('should share code snippets', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            std::cout << "Shared code example" << std::endl;
            return 0;
        }
      `);
      
      await pageHelpers.clickButton('[data-testid="share-button"]');
      await pageHelpers.clickButton('[data-testid="generate-link-button"]');
      
      // Verify share link generated
      await expect(authenticatedPage.locator('[data-testid="share-link"]')).toBeVisible();
      
      const shareLink = await authenticatedPage.locator('[data-testid="share-link"]').inputValue();
      expect(shareLink).toContain('/shared/');
    });

    test('should access shared code via link', async ({ authenticatedPage, page }) => {
      // Navigate to a shared code link
      await page.goto('/shared/mock-share-id');
      
      // Verify shared code is loaded
      await expect(page.locator('[data-testid="shared-code-viewer"]')).toBeVisible();
      await expect(page.locator('[data-testid="code-content"]')).toContainText('#include <iostream>');
      
      // Verify read-only mode
      await expect(page.locator('[data-testid="edit-disabled-notice"]')).toBeVisible();
      
      // Should allow copying to own workspace
      await page.click('[data-testid="copy-to-workspace-button"]');
      await expect(page).toHaveURL(/.*\/playground/);
    });

    test('should submit code for review', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <algorithm>
        #include <vector>
        
        int main() {
            std::vector<int> nums = {3, 1, 4, 1, 5, 9, 2, 6};
            std::sort(nums.begin(), nums.end());
            
            for(const auto& num : nums) {
                std::cout << num << " ";
            }
            std::cout << std::endl;
            return 0;
        }
      `);
      
      await pageHelpers.clickButton('[data-testid="request-review-button"]');
      await pageHelpers.fillFormField('[data-testid="review-description"]', 'Please review my sorting implementation');
      await pageHelpers.clickButton('[data-testid="submit-review-request"]');
      
      // Verify review request submitted
      await pageHelpers.expectSuccessMessage('Code review request submitted successfully');
      await expect(authenticatedPage.locator('[data-testid="review-status"]')).toContainText('Pending Review');
    });
  });

  test.describe('Performance Optimization', () => {
    test('should handle large code files efficiently', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      // Generate large code file
      let largeCode = '#include <iostream>\n\nint main() {\n';
      for (let i = 0; i < 1000; i++) {
        largeCode += `    std::cout << "Line ${i}" << std::endl;\n`;
      }
      largeCode += '    return 0;\n}';
      
      const startTime = Date.now();
      await codeEditorHelpers.enterCode(largeCode);
      const endTime = Date.now();
      
      // Should load within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Editor should remain responsive
      await expect(authenticatedPage.locator('[data-testid="code-editor"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="compile-button"]')).toBeEnabled();
    });

    test('should optimize rendering for long output', async ({ authenticatedPage }) => {
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            for(int i = 0; i < 10000; i++) {
                std::cout << "Output line " << i << std::endl;
            }
            return 0;
        }
      `);
      
      await codeEditorHelpers.runCode();
      
      // Should handle large output without freezing
      await expect(authenticatedPage.locator('[data-testid="execution-complete"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="output-virtualized"]')).toBeVisible();
      
      // Output should be scrollable
      const outputContainer = authenticatedPage.locator('[data-testid="code-output"]');
      await expect(outputContainer).toBeVisible();
      
      // Should show truncation notice for very large output
      await expect(authenticatedPage.locator('[data-testid="output-truncated"]')).toBeVisible();
    });
  });
});