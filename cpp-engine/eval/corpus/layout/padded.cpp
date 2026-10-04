// Memory layout corpus: `Padded` wastes 8 bytes on LP64; `Tight` is already optimal.
#include <cstdint>

struct Padded {
    char tag;
    double value;
    char flag;
    int count;
};

struct Tight {
    double value;
    int count;
    char tag;
    char flag;
};

struct Nested {
    Padded p;
    std::uint16_t id;
    Tight t;
    const char* name;
};
