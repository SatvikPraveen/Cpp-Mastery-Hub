// Clean, modern C++: expected to produce zero warnings or errors.
#include <algorithm>
#include <memory>
#include <string>
#include <vector>

namespace sample {

inline constexpr std::size_t kDefaultCapacity = 16;

class Buffer {
public:
    explicit Buffer(std::size_t capacity = kDefaultCapacity) { data_.reserve(capacity); }

    void push(int value) { data_.push_back(value); }

    [[nodiscard]] int sum() const noexcept {
        int total = 0;
        for (const int v : data_) total += v;
        return total;
    }

    [[nodiscard]] std::size_t size() const noexcept { return data_.size(); }

private:
    std::vector<int> data_;
};

std::unique_ptr<Buffer> makeBuffer() { return std::make_unique<Buffer>(); }

}  // namespace sample

int main() {
    auto buffer = sample::makeBuffer();
    for (int i = 0; i < 10; ++i) buffer->push(i);
    constexpr int kExpectedSum = 45;
    return buffer->sum() == kExpectedSum ? 0 : 1;
}
