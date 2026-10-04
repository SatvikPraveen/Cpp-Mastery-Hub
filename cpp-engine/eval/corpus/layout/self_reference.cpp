// Fuzzer regression seed: self-referential and redefined structs. Every reorder suggestion must
// be no larger than the original layout.
struct S { char c; S inner; };
struct T { char c; int x; };
struct U { T t; char d; };
struct T { double big; char c; };
