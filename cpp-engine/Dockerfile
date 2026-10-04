# syntax=docker/dockerfile:1.7
# Reproducible build of the cppmastery engine. Stages:
#   build  - compiles with GCC, runs the full test suite (the image fails to build if tests fail)
#   runtime - minimal Debian image containing only the statically linked CLI
#
#   docker build -t cppmastery-engine cpp-engine
#   docker run --rm -p 9000:9000 cppmastery-engine                 # HTTP adapter on :9000
#   echo 'int main(){ return 0; }' | docker run --rm -i cppmastery-engine analyze -   # CLI

FROM debian:bookworm-slim@sha256:3783cc01769c7b2b1b83a5c5ad96c815348e28ed7da68e2e3687004faa906251 AS build
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

FROM debian:bookworm-slim@sha256:3783cc01769c7b2b1b83a5c5ad96c815348e28ed7da68e2e3687004faa906251 AS runtime
LABEL org.opencontainers.image.title="cppmastery-engine" \
      org.opencontainers.image.source="https://github.com/SatvikPraveen/Cpp-Mastery-Hub" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.description="Dependency-free C++ analysis engine: lexer, metrics, rule engine, memory layout"
RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home engine
COPY --from=build /src/build/cppmastery /usr/local/bin/cppmastery
COPY --from=build /src/tools/http_adapter/cppmastery_http.py /usr/local/bin/cppmastery-http
COPY --from=build /src/tools/http_adapter/entrypoint.sh /usr/local/bin/cppmastery-entrypoint
USER engine
EXPOSE 9000
ENV CPPMASTERY_BIN=/usr/local/bin/cppmastery CPPMASTERY_PORT=9000 CPPMASTERY_HOST=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD ["python3", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:9000/health', timeout=3).status == 200 else 1)"]
# Default: serve the HTTP adapter. Pass CLI arguments instead to use the tool directly, e.g.
#   docker run --rm -i cppmastery-engine analyze -
ENTRYPOINT ["/usr/local/bin/cppmastery-entrypoint"]
CMD ["serve"]
