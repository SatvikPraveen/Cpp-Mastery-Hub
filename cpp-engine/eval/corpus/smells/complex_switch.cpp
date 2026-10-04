// Seeded smells: complexity/high-cyclomatic, complexity/deep-nesting, readability/goto,
// correctness/assignment-in-condition, correctness/empty-catch, modernize/c-style-cast.
#include <stdexcept>

int classify(int code, double ratio) {
    int result = 0;
    if (code = 1) result = 1;
    if (code > 0) {
        if (code < 100) {
            if (ratio > 0.5) {
                if (code % 2 == 0) {
                    while (code > 10) {
                        if (code % 3 == 0) result += 3; else result += 1;
                        code -= 7;
                    }
                }
            }
        }
    }
    switch (code) {
        case 2: result += 2; break;
        case 3: result += 3; break;
        case 4: result += 4; break;
        case 5: result += 5; break;
        case 6: result += 6; break;
        case 7: result += 7; break;
        default: break;
    }
    try {
        if (result > 50) throw std::runtime_error("too big");
    } catch (const std::exception&) {}
    if (ratio == 0.25) goto done;
    result = (int)ratio + (int)(result * 1.5);
done:
    return result;
}
