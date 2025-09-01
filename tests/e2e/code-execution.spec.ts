// File: tests/e2e/code-execution.spec.ts
// Extension: .ts
// Location: tests/e2e/code-execution.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Code Execution and Editor', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login first (assuming we have a test user)
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to code editor
    await page.goto('/code');
    await expect(page).toHaveURL(/.*\/code/);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Code Editor Interface', () => {
    test('should display code editor with default C++ code', async () => {
      // Check if Monaco editor is loaded
      await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible();
      
      // Check if toolbar is present
      await expect(page.locator('[data-testid="editor-toolbar"]')).toBeVisible();
      await expect(page.locator('[data-testid="run-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="analyze-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-button"]')).toBeVisible();
      
      // Check if default code contains C++ hello world
      const editorContent = await page.locator('[data-testid="monaco-editor"]').textContent();
      expect(editorContent).toContain('#include <iostream>');
      expect(editorContent).toContain('int main()');
    });

    test('should allow typing and editing code', async () => {
      // Clear editor and type new code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "Hello from E2E test!" << std::endl;
            return 0;
        }
      `);

      // Verify code was entered
      const editorContent = await page.locator('[data-testid="monaco-editor"]').textContent();
      expect(editorContent).toContain('Hello from E2E test!');
    });

    test('should show syntax highlighting for C++', async () => {
      // Check that syntax highlighting elements are present
      await expect(page.locator('.mtk1')).toBeVisible(); // Monaco token classes
      await expect(page.locator('.mtk4')).toBeVisible(); // Keywords
      await expect(page.locator('.mtk9')).toBeVisible(); // Strings
    });

    test('should display line numbers', async () => {
      await expect(page.locator('.line-numbers')).toBeVisible();
      await expect(page.locator('[data-testid="line-number-1"]')).toBeVisible();
    });

    test('should support autocomplete', async () => {
      // Place cursor and trigger autocomplete
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('End');
      await page.keyboard.type('\nstd::');
      
      // Wait for autocomplete suggestions
      await page.waitForSelector('.suggest-widget', { timeout: 3000 });
      await expect(page.locator('.suggest-widget')).toBeVisible();
      
      // Check for common C++ suggestions
      await expect(page.locator('text=cout')).toBeVisible();
      await expect(page.locator('text=cin')).toBeVisible();
    });
  });

  test.describe('Code Execution', () => {
    test('should execute valid C++ code successfully', async () => {
      // Clear and enter simple code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
      `);

      // Click run button
      await page.click('[data-testid="run-button"]');
      
      // Wait for execution to complete
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 10000 });
      
      // Check output
      await expect(page.locator('[data-testid="execution-output"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-output"]')).toContainText('Hello, World!');
      
      // Check execution status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Success');
      
      // Check execution time is displayed
      await expect(page.locator('[data-testid="execution-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
    });

    test('should handle compilation errors', async () => {
      // Enter invalid C++ code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "Missing semicolon"
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      // Wait for error to appear
      await page.waitForSelector('[data-testid="execution-error"]', { timeout: 10000 });
      
      // Check error display
      await expect(page.locator('[data-testid="execution-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-error"]')).toContainText('compilation');
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Error');
    });

    test('should handle runtime errors', async () => {
      // Enter code that compiles but has runtime error
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        #include <vector>
        int main() {
            std::vector<int> v;
            std::cout << v.at(100) << std::endl; // Out of bounds
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-error"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="execution-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Runtime Error');
    });

    test('should support user input', async () => {
      // Enter code that requires input
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            int number;
            std::cout << "Enter a number: ";
            std::cin >> number;
            std::cout << "You entered: " << number << std::endl;
            return 0;
        }
      `);

      // Provide input
      await page.fill('[data-testid="input-textarea"]', '42');
      
      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="execution-output"]')).toContainText('Enter a number:');
      await expect(page.locator('[data-testid="execution-output"]')).toContainText('You entered: 42');
    });

    test('should show execution progress', async () => {
      // Enter code that takes some time
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        #include <chrono>
        #include <thread>
        int main() {
            std::this_thread::sleep_for(std::chrono::seconds(2));
            std::cout << "Done!" << std::endl;
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      // Check loading state
      await expect(page.locator('[data-testid="run-button"]')).toContainText('Running...');
      await expect(page.locator('[data-testid="execution-spinner"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 15000 });
      
      await expect(page.locator('[data-testid="execution-output"]')).toContainText('Done!');
      await expect(page.locator('[data-testid="run-button"]')).toContainText('Run');
    });

    test('should handle execution timeout', async () => {
      // Enter infinite loop code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            while(true) {
                std::cout << "Infinite loop" << std::endl;
            }
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      // Wait for timeout error
      await page.waitForSelector('[data-testid="execution-error"]', { timeout: 15000 });
      
      await expect(page.locator('[data-testid="execution-error"]')).toContainText('timeout');
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Timeout');
    });
  });

  test.describe('Code Analysis', () => {
    test('should analyze code and show results', async () => {
      // Enter code with potential issues
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            int unused_variable = 42;
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
      `);

      await page.click('[data-testid="analyze-button"]');
      
      // Wait for analysis results
      await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="analysis-issues"]')).toBeVisible();
      
      // Check for unused variable warning
      await expect(page.locator('text=unused variable')).toBeVisible();
      
      // Check analysis metrics
      await expect(page.locator('[data-testid="complexity-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="maintainability-score"]')).toBeVisible();
    });

    test('should show security analysis warnings', async () => {
      // Enter potentially unsafe code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        #include <cstring>
        int main() {
            char buffer[10];
            char input[100];
            strcpy(buffer, input); // Buffer overflow risk
            return 0;
        }
      `);

      await page.click('[data-testid="analyze-button"]');
      
      await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 10000 });
      
      // Check for security warnings
      await expect(page.locator('[data-testid="security-issues"]')).toBeVisible();
      await expect(page.locator('text=buffer overflow')).toBeVisible();
      await expect(page.locator('[data-testid="risk-level"]')).toContainText('High');
    });

    test('should provide code suggestions', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            int* ptr = new int(42);
            std::cout << *ptr << std::endl;
            // Missing delete
            return 0;
        }
      `);

      await page.click('[data-testid="analyze-button"]');
      
      await page.waitForSelector('[data-testid="analysis-suggestions"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="analysis-suggestions"]')).toBeVisible();
      await expect(page.locator('text=memory leak')).toBeVisible();
      await expect(page.locator('text=smart pointer')).toBeVisible();
    });
  });

  test.describe('Code Snippets Management', () => {
    test('should save code snippet', async () => {
      // Enter code
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "My saved snippet!" << std::endl;
            return 0;
        }
      `);

      // Click save button
      await page.click('[data-testid="save-button"]');
      
      // Fill save dialog
      await page.waitForSelector('[data-testid="save-dialog"]');
      await page.fill('[data-testid="snippet-title"]', 'Test Snippet');
      await page.fill('[data-testid="snippet-description"]', 'A test snippet for E2E testing');
      await page.check('[data-testid="public-checkbox"]');
      
      await page.click('[data-testid="save-snippet-button"]');
      
      // Check success message
      await expect(page.locator('text=Snippet saved successfully')).toBeVisible();
    });

    test('should load saved snippet', async () => {
      // Navigate to snippets page
      await page.click('[data-testid="snippets-nav"]');
      await expect(page).toHaveURL(/.*\/code\/snippets/);
      
      // Find and click on a snippet
      await expect(page.locator('[data-testid="snippet-card"]').first()).toBeVisible();
      await page.click('[data-testid="snippet-card"]').first();
      
      // Should load in editor
      await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible();
      
      // Check that code is loaded
      const editorContent = await page.locator('[data-testid="monaco-editor"]').textContent();
      expect(editorContent).toContain('#include');
    });

    test('should share snippet', async () => {
      // Save a snippet first
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "Shared snippet!" << std::endl;
            return 0;
        }
      `);

      await page.click('[data-testid="save-button"]');
      await page.fill('[data-testid="snippet-title"]', 'Shared Snippet');
      await page.check('[data-testid="public-checkbox"]');
      await page.click('[data-testid="save-snippet-button"]');

      // Click share button
      await page.click('[data-testid="share-button"]');
      
      // Check share dialog
      await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-url"]')).toBeVisible();
      
      // Copy share URL
      await page.click('[data-testid="copy-url-button"]');
      await expect(page.locator('text=URL copied')).toBeVisible();
    });
  });

  test.describe('Collaborative Features', () => {
    test('should create collaboration session', async () => {
      await page.click('[data-testid="collaborate-button"]');
      
      // Check collaboration dialog
      await expect(page.locator('[data-testid="collaboration-dialog"]')).toBeVisible();
      await page.click('[data-testid="start-session-button"]');
      
      // Should show session info
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="invite-link"]')).toBeVisible();
      
      // Check collaboration status
      await expect(page.locator('[data-testid="collaboration-status"]')).toContainText('Session Active');
    });

    test('should show participants in session', async () => {
      // Start collaboration session
      await page.click('[data-testid="collaborate-button"]');
      await page.click('[data-testid="start-session-button"]');
      
      // Check participants panel
      await expect(page.locator('[data-testid="participants-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('1');
      
      // Should show current user as participant
      await expect(page.locator('[data-testid="current-user-participant"]')).toBeVisible();
    });

    test('should end collaboration session', async () => {
      // Start and then end session
      await page.click('[data-testid="collaborate-button"]');
      await page.click('[data-testid="start-session-button"]');
      
      await page.click('[data-testid="end-session-button"]');
      await page.click('[data-testid="confirm-end-session"]');
      
      // Should return to normal mode
      await expect(page.locator('[data-testid="collaboration-status"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="participants-panel"]')).not.toBeVisible();
    });
  });

  test.describe('Editor Settings', () => {
    test('should change editor theme', async () => {
      await page.click('[data-testid="settings-button"]');
      
      // Check settings panel
      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
      
      // Change theme
      await page.selectOption('[data-testid="theme-select"]', 'dark');
      
      // Check that editor theme changed
      await expect(page.locator('.monaco-editor.vs-dark')).toBeVisible();
    });

    test('should change font size', async () => {
      await page.click('[data-testid="settings-button"]');
      
      // Change font size
      await page.fill('[data-testid="font-size-input"]', '16');
      
      // Check that font size changed
      const editorElement = page.locator('[data-testid="monaco-editor"]');
      await expect(editorElement).toHaveCSS('font-size', '16px');
    });

    test('should toggle line numbers', async () => {
      await page.click('[data-testid="settings-button"]');
      
      // Toggle line numbers off
      await page.uncheck('[data-testid="line-numbers-checkbox"]');
      
      // Check that line numbers are hidden
      await expect(page.locator('.line-numbers')).not.toBeVisible();
      
      // Toggle back on
      await page.check('[data-testid="line-numbers-checkbox"]');
      await expect(page.locator('.line-numbers')).toBeVisible();
    });

    test('should change indentation settings', async () => {
      await page.click('[data-testid="settings-button"]');
      
      // Change to spaces
      await page.selectOption('[data-testid="indentation-type"]', 'spaces');
      await page.fill('[data-testid="indent-size"]', '4');
      
      // Type some code and check indentation
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type('int main() {\n    return 0;\n}');
      
      // Check indentation
      const editorContent = await page.locator('[data-testid="monaco-editor"]').textContent();
      expect(editorContent).toContain('    return 0;'); // 4 spaces
    });
  });

  test.describe('Memory Visualization', () => {
    test('should show memory visualization for pointer code', async () => {
      // Enter code with pointers
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            int x = 42;
            int* ptr = &x;
            std::cout << *ptr << std::endl;
            return 0;
        }
      `);

      // Enable memory visualization
      await page.check('[data-testid="memory-visualization-checkbox"]');
      
      await page.click('[data-testid="run-button"]');
      
      // Wait for memory visualization
      await page.waitForSelector('[data-testid="memory-visualization"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="memory-visualization"]')).toBeVisible();
      await expect(page.locator('[data-testid="stack-visualization"]')).toBeVisible();
      await expect(page.locator('[data-testid="variable-x"]')).toBeVisible();
      await expect(page.locator('[data-testid="pointer-ptr"]')).toBeVisible();
    });

    test('should show heap visualization for dynamic allocation', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            int* ptr = new int(42);
            std::cout << *ptr << std::endl;
            delete ptr;
            return 0;
        }
      `);

      await page.check('[data-testid="memory-visualization-checkbox"]');
      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="memory-visualization"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="heap-visualization"]')).toBeVisible();
      await expect(page.locator('[data-testid="heap-allocation"]')).toBeVisible();
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should show execution time and memory usage', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        #include <vector>
        int main() {
            std::vector<int> v(1000000, 42);
            std::cout << v.size() << std::endl;
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 10000 });
      
      // Check performance metrics
      await expect(page.locator('[data-testid="execution-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="peak-memory"]')).toBeVisible();
      
      // Values should be reasonable
      const executionTime = await page.locator('[data-testid="execution-time"]').textContent();
      expect(executionTime).toMatch(/\d+(\.\d+)?\s*(ms|s)/);
      
      const memoryUsage = await page.locator('[data-testid="memory-usage"]').textContent();
      expect(memoryUsage).toMatch(/\d+(\.\d+)?\s*(KB|MB)/);
    });

    test('should compare different optimization levels', async () => {
      const testCode = `
        #include <iostream>
        #include <vector>
        #include <algorithm>
        int main() {
            std::vector<int> v(100000);
            std::iota(v.begin(), v.end(), 1);
            std::sort(v.begin(), v.end(), std::greater<int>());
            std::cout << v[0] << std::endl;
            return 0;
        }
      `;

      // Test with O0 optimization
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(testCode);
      
      await page.selectOption('[data-testid="optimization-level"]', 'O0');
      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-time"]', { timeout: 10000 });
      const timeO0 = await page.locator('[data-testid="execution-time"]').textContent();
      
      // Test with O2 optimization
      await page.selectOption('[data-testid="optimization-level"]', 'O2');
      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-time"]', { timeout: 10000 });
      const timeO2 = await page.locator('[data-testid="execution-time"]').textContent();
      
      // Both should have valid execution times
      expect(timeO0).toMatch(/\d+(\.\d+)?\s*(ms|s)/);
      expect(timeO2).toMatch(/\d+(\.\d+)?\s*(ms|s)/);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/code/execute', route => route.abort());
      
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type('int main() { return 0; }');
      
      await page.click('[data-testid="run-button"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('text=Network error')).toBeVisible();
    });

    test('should handle very large code files', async () => {
      // Generate large code content
      const largeCode = `
        #include <iostream>
        int main() {
            ${Array(1000).fill('std::cout << "Line" << std::endl;').join('\n            ')}
            return 0;
        }
      `;

      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(largeCode);

      // Should handle large files without crashing
      await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible();
      
      // Run button should still work
      await page.click('[data-testid="run-button"]');
      
      // Should either execute or show size limit error
      await page.waitForSelector('[data-testid="execution-output"], [data-testid="execution-error"]', { timeout: 15000 });
    });

    test('should handle special characters in code', async () => {
      // Code with unicode and special characters
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`
        #include <iostream>
        int main() {
            std::cout << "Unicode: αβγ 中文 🚀" << std::endl;
            std::cout << "Special: \\n\\t\\r" << std::endl;
            return 0;
        }
      `);

      await page.click('[data-testid="run-button"]');
      
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 10000 });
      
      const output = await page.locator('[data-testid="execution-output"]').textContent();
      expect(output).toContain('Unicode:');
      expect(output).toContain('Special:');
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should support Ctrl+S for save', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('Control+s');
      
      await expect(page.locator('[data-testid="save-dialog"]')).toBeVisible();
    });

    test('should support F5 for run', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.press('F5');
      
      // Should start execution
      await expect(page.locator('[data-testid="run-button"]')).toContainText('Running...');
    });

    test('should support Ctrl+/ for comments', async () => {
      await page.locator('[data-testid="monaco-editor"]').click();
      await page.keyboard.type('int main() { return 0; }');
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Control+/');
      
      const editorContent = await page.locator('[data-testid="monaco-editor"]').textContent();
      expect(editorContent).toContain('//');
    });
  });
});