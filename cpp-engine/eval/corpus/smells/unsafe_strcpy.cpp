// Seeded smells: security/unsafe-c-function (x2), memory/raw-new-delete (x2),
// readability/using-namespace-std, modernize/null-macro, performance/endl.
#include <cstring>
#include <iostream>
using namespace std;

struct Record {
    char name[32];
    int* scores;
};

Record* make(const char* src) {
    Record* r = new Record;
    strcpy(r->name, src);
    r->scores = NULL;
    return r;
}

int main(int argc, char** argv) {
    if (argc < 2) return 1;
    char buf[64];
    strcat(buf, argv[1]);
    Record* r = make(buf);
    cout << r->name << endl;
    delete r;
    return 0;
}
