# syntax=docker/dockerfile:1.7
# Reproducible build of the cppmastery engine. Stages:
#   build  - compiles with GCC, runs the full test suite (the image fails to build if tests fail)
#   runtime - minimal Debian image containing only the statically linked CLI
#
#   docker build -t cppmastery-engine cpp-engine
#   echo 'int main(){ return 0; }' | docker run --rm -i cppmastery-engine analyze -

FROM debian:bookworm-slim@sha256:3d5df92588469a4c503adbead0e4129ef3f88e223954011c2169073af3412098 AS build
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake ninja-build git ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN cmake -S . -B build -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCPPMASTERY_BUILD_TESTS=ON \
        -DCMAKE_EXE_LINKER_FLAGS="-static" \
    && cmake --build build --parallel \
    && ctest --test-dir build --output-on-failure \
    && python3 eval/run_eval.py --cli build/cppmastery

FROM debian:bookworm-slim@sha256:3d5df92588469a4c503adbead0e4129ef3f88e223954011c2169073af3412098 AS runtime
LABEL org.opencontainers.image.title="cppmastery-engine" \
      org.opencontainers.image.source="https://github.com/SatvikPraveen/Cpp-Mastery-Hub" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.description="Dependency-free C++ analysis engine: lexer, metrics, rule engine, memory layout"
RUN useradd --system --uid 10001 --no-create-home engine
COPY --from=build /src/build/cppmastery /usr/local/bin/cppmastery
USER engine
ENTRYPOINT ["/usr/local/bin/cppmastery"]
CMD ["--help"]
