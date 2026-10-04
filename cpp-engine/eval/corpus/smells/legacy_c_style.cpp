// Seeded smells: modernize/macro-constant, modernize/typedef, memory/malloc-free (x2),
// modernize/c-random, security/shell-command, portability/bits-stdc++, correctness/float-equality.
#include <bits/stdc++.h>
#include <cstdlib>
#define BUFFER_SIZE 256
#define PI 3.14159

typedef unsigned long ulong;

double area(double r) { return PI * r * r; }

int main() {
    ulong n = BUFFER_SIZE;
    int* data = (int*)malloc(n * sizeof(int));
    for (ulong i = 0; i < n; ++i) data[i] = rand() % 100;
    double a = area(2.0);
    bool unit = a == 12.56636;
    free(data);
    if (unit) return system("echo ok");
    return 0;
}
