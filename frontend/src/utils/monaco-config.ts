// File: frontend/src/utils/monaco-config.ts
// Extension: .ts

import { languages, editor } from 'monaco-editor';

// C++ Language Configuration
export const cppLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>', notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$/,
    decreaseIndentPattern: /^.*\}.*$/,
  },
  folding: {
    markers: {
      start: /^\s*#pragma\s+region\b/,
      end: /^\s*#pragma\s+endregion\b/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
};

// Custom C++ Theme Definitions
export const cppThemes: Record<string, editor.IStandaloneThemeData> = {
  'vs-dark-cpp': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Keywords
      { token: 'keyword.cpp', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'keyword.control.cpp', foreground: 'c586c0', fontStyle: 'bold' },
      { token: 'keyword.operator.cpp', foreground: 'd4d4d4' },
      
      // Types
      { token: 'type.cpp', foreground: '4ec9b0', fontStyle: 'bold' },
      { token: 'type.primitive.cpp', foreground: '569cd6', fontStyle: 'bold' },
      
      // Strings and characters
      { token: 'string.cpp', foreground: 'ce9178' },
      { token: 'string.escape.cpp', foreground: 'd7ba7d' },
      { token: 'character.cpp', foreground: 'ce9178' },
      
      // Numbers
      { token: 'number.cpp', foreground: 'b5cea8' },
      { token: 'number.hex.cpp', foreground: 'b5cea8' },
      { token: 'number.binary.cpp', foreground: 'b5cea8' },
      { token: 'number.octal.cpp', foreground: 'b5cea8' },
      
      // Comments
      { token: 'comment.cpp', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'comment.block.cpp', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'comment.line.cpp', foreground: '6a9955', fontStyle: 'italic' },
      
      // Preprocessor
      { token: 'preprocessor.cpp', foreground: '9cdcfe' },
      { token: 'include.cpp', foreground: 'ce9178' },
      
      // Functions and methods
      { token: 'function.cpp', foreground: 'dcdcaa' },
      { token: 'method.cpp', foreground: 'dcdcaa' },
      { token: 'function.call.cpp', foreground: 'dcdcaa' },
      
      // Variables and identifiers
      { token: 'variable.cpp', foreground: '9cdcfe' },
      { token: 'variable.parameter.cpp', foreground: '9cdcfe' },
      { token: 'identifier.cpp', foreground: 'd4d4d4' },
      
      // Operators
      { token: 'operator.cpp', foreground: 'd4d4d4' },
      { token: 'delimiter.cpp', foreground: 'd4d4d4' },
      
      // Namespaces and classes
      { token: 'namespace.cpp', foreground: '4ec9b0' },
      { token: 'class.cpp', foreground: '4ec9b0', fontStyle: 'bold' },
      { token: 'struct.cpp', foreground: '4ec9b0', fontStyle: 'bold' },
      { token: 'enum.cpp', foreground: '4ec9b0', fontStyle: 'bold' },
      
      // Template parameters
      { token: 'template.cpp', foreground: 'c586c0' },
      { token: 'template.parameter.cpp', foreground: 'c586c0' },
      
      // Constants and macros
      { token: 'constant.cpp', foreground: '4fc1ff' },
      { token: 'macro.cpp', foreground: 'c586c0' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editor.selectionBackground': '#264f78',
      'editor.selectionHighlightBackground': '#add6ff26',
      'editor.wordHighlightBackground': '#575757b8',
      'editor.wordHighlightStrongBackground': '#004972b8',
      'editor.findMatchBackground': '#515c6a',
      'editor.findMatchHighlightBackground': '#ea5c0055',
      'editor.hoverHighlightBackground': '#264f7840',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#888888',
      'editorError.foreground': '#f44747',
      'editorWarning.foreground': '#ffcc02',
      'editorInfo.foreground': '#75beff',
      'editorGutter.background': '#1e1e1e',
      'editorGutter.modifiedBackground': '#0c7d9d',
      'editorGutter.addedBackground': '#587c0c',
      'editorGutter.deletedBackground': '#94151b',
    },
  },
  
  'vs-light-cpp': {
    base: 'vs',
    inherit: true,
    rules: [
      // Keywords
      { token: 'keyword.cpp', foreground: '0000ff', fontStyle: 'bold' },
      { token: 'keyword.control.cpp', foreground: 'af00db', fontStyle: 'bold' },
      { token: 'keyword.operator.cpp', foreground: '000000' },
      
      // Types
      { token: 'type.cpp', foreground: '267f99', fontStyle: 'bold' },
      { token: 'type.primitive.cpp', foreground: '0000ff', fontStyle: 'bold' },
      
      // Strings and characters
      { token: 'string.cpp', foreground: 'a31515' },
      { token: 'string.escape.cpp', foreground: 'ff0000' },
      { token: 'character.cpp', foreground: 'a31515' },
      
      // Numbers
      { token: 'number.cpp', foreground: '098658' },
      
      // Comments
      { token: 'comment.cpp', foreground: '008000', fontStyle: 'italic' },
      
      // Preprocessor
      { token: 'preprocessor.cpp', foreground: '0000ff' },
      { token: 'include.cpp', foreground: 'a31515' },
      
      // Functions and methods
      { token: 'function.cpp', foreground: '795e26' },
      { token: 'method.cpp', foreground: '795e26' },
      
      // Variables and identifiers
      { token: 'variable.cpp', foreground: '001080' },
      { token: 'identifier.cpp', foreground: '000000' },
      
      // Namespaces and classes
      { token: 'namespace.cpp', foreground: '267f99' },
      { token: 'class.cpp', foreground: '267f99', fontStyle: 'bold' },
      { token: 'struct.cpp', foreground: '267f99', fontStyle: 'bold' },
      
      // Template parameters
      { token: 'template.cpp', foreground: 'af00db' },
      
      // Constants and macros
      { token: 'constant.cpp', foreground: '0070c1' },
      { token: 'macro.cpp', foreground: 'af00db' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editorLineNumber.foreground': '#237893',
      'editorLineNumber.activeForeground': '#0b216f',
      'editor.selectionBackground': '#add6ff',
      'editor.selectionHighlightBackground': '#add6ff80',
      'editor.wordHighlightBackground': '#57575740',
      'editor.wordHighlightStrongBackground': '#00497240',
      'editor.findMatchBackground': '#a8ac94',
      'editor.findMatchHighlightBackground': '#ea5c0055',
      'editor.hoverHighlightBackground': '#264f7840',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#0064001a',
      'editorError.foreground': '#e51400',
      'editorWarning.foreground': '#bf8803',
      'editorInfo.foreground': '#1a85ff',
    },
  },
};

// Enhanced C++ Language Features
export const cppLanguageFeatures = {
  // Standard library includes
  standardIncludes: [
    'iostream', 'vector', 'string', 'algorithm', 'map', 'set', 'queue', 'stack',
    'deque', 'list', 'array', 'memory', 'functional', 'numeric', 'iterator',
    'utility', 'chrono', 'random', 'cmath', 'cstdlib', 'cstring', 'cassert',
    'fstream', 'sstream', 'iomanip', 'regex', 'thread', 'mutex', 'future',
    'atomic', 'condition_variable', 'exception', 'stdexcept', 'typeinfo',
    'limits', 'climits', 'cfloat', 'cstdint', 'cstddef', 'cwchar', 'cctype',
    'tuple', 'optional', 'variant', 'any', 'string_view', 'filesystem',
  ],
  
  // C++ keywords
  keywords: [
    'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit',
    'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch',
    'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const',
    'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await',
    'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double',
    'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false',
    'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable',
    'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or',
    'or_eq', 'private', 'protected', 'public', 'reflexpr', 'register',
    'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof',
    'static', 'static_assert', 'static_cast', 'struct', 'switch', 'synchronized',
    'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef',
    'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
    'volatile', 'wchar_t', 'while', 'xor', 'xor_eq',
  ],
  
  // Common C++ snippets
  snippets: [
    {
      label: 'main',
      insertText: 'int main() {\n    ${1:// code}\n    return 0;\n}',
      description: 'Main function template',
    },
    {
      label: 'main_args',
      insertText: 'int main(int argc, char* argv[]) {\n    ${1:// code}\n    return 0;\n}',
      description: 'Main function with arguments',
    },
    {
      label: 'class_template',
      insertText: 'class ${1:ClassName} {\npublic:\n    ${1:ClassName}();\n    ~${1:ClassName}();\n    \n    ${2:// public methods}\n    \nprivate:\n    ${3:// private members}\n};',
      description: 'Class template with constructor and destructor',
    },
    {
      label: 'template_class',
      insertText: 'template<typename ${1:T}>\nclass ${2:ClassName} {\npublic:\n    ${2:ClassName}();\n    ~${2:ClassName}();\n    \nprivate:\n    ${3:// members}\n};',
      description: 'Template class definition',
    },
    {
      label: 'template_function',
      insertText: 'template<typename ${1:T}>\n${2:T} ${3:functionName}(${4:const T& param}) {\n    ${5:// implementation}\n}',
      description: 'Template function definition',
    },
    {
      label: 'namespace',
      insertText: 'namespace ${1:name} {\n    ${2:// content}\n}',
      description: 'Namespace definition',
    },
    {
      label: 'enum_class',
      insertText: 'enum class ${1:EnumName} {\n    ${2:VALUE1},\n    ${3:VALUE2}\n};',
      description: 'Scoped enumeration',
    },
    {
      label: 'unique_ptr',
      insertText: 'std::unique_ptr<${1:Type}> ${2:ptr} = std::make_unique<${1:Type}>(${3:args});',
      description: 'Unique pointer with make_unique',
    },
    {
      label: 'shared_ptr',
      insertText: 'std::shared_ptr<${1:Type}> ${2:ptr} = std::make_shared<${1:Type}>(${3:args});',
      description: 'Shared pointer with make_shared',
    },
    {
      label: 'lambda',
      insertText: 'auto ${1:lambda} = [${2:capture}](${3:params}) ${4:-> ReturnType} {\n    ${5:// implementation}\n};',
      description: 'Lambda function template',
    },
    {
      label: 'range_for',
      insertText: 'for (const auto& ${1:item} : ${2:container}) {\n    ${3:// process item}\n}',
      description: 'Range-based for loop',
    },
    {
      label: 'try_catch',
      insertText: 'try {\n    ${1:// code that might throw}\n} catch (const ${2:std::exception}& ${3:e}) {\n    ${4:// handle exception}\n}',
      description: 'Try-catch block',
    },
  ],
  
  // Common type hover information
  typeInfo: {
    'std::vector': 'Dynamic array container that can resize itself automatically',
    'std::string': 'String class for handling sequences of characters',
    'std::map': 'Associative container that contains key-value pairs with unique keys',
    'std::set': 'Associative container that contains a sorted set of unique objects',
    'std::queue': 'Container adapter that provides FIFO (first-in, first-out) data structure',
    'std::stack': 'Container adapter that provides LIFO (last-in, first-out) data structure',
    'std::unique_ptr': 'Smart pointer that owns and manages another object through a pointer',
    'std::shared_ptr': 'Smart pointer that retains shared ownership of an object',
    'std::weak_ptr': 'Smart pointer that holds a non-owning reference to an object',
    'std::function': 'General-purpose polymorphic function wrapper',
    'std::thread': 'Class that represents a single thread of execution',
    'std::mutex': 'Synchronization primitive that can be used to protect shared data',
    'std::future': 'Provides a mechanism to access the result of asynchronous operations',
    'std::promise': 'Provides a facility to store a value or an exception for asynchronous retrieval',
  },
};