# File: docker/cpp-engine/Dockerfile
# Extension: (no extension - Dockerfile)

# Multi-stage build for C++ engine
FROM ubuntu:22.04 AS builder

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    curl \
    wget \
    pkg-config \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install LLVM and Clang (version 15)
RUN wget https://apt.llvm.org/llvm.sh && \
    chmod +x llvm.sh && \
    ./llvm.sh 15 && \
    rm llvm.sh

# Install additional LLVM tools
RUN apt-get update && apt-get install -y \
    llvm-15 \
    llvm-15-dev \
    llvm-15-runtime \
    clang-15 \
    clang-tools-15 \
    clang-15-doc \
    libclang-common-15-dev \
    libclang-15-dev \
    libclang1-15 \
    clang-format-15 \
    clang-tidy-15 \
    libc++-15-dev \
    libc++abi-15-dev \
    && rm -rf /var/lib/apt/lists/*

# Create symlinks for LLVM tools
RUN update-alternatives --install /usr/bin/llvm-config llvm-config /usr/bin/llvm-config-15 100 && \
    update-alternatives --install /usr/bin/clang clang /usr/bin/clang-15 100 && \
    update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-15 100 && \
    update-alternatives --install /usr/bin/clang-format clang-format /usr/bin/clang-format-15 100 && \
    update-alternatives --install /usr/bin/clang-tidy clang-tidy /usr/bin/clang-tidy-15 100

# Set working directory
WORKDIR /app

# Copy CMakeLists.txt and source files
COPY cpp-engine/CMakeLists.txt ./
COPY cpp-engine/conanfile.txt ./
COPY cpp-engine/src ./src
COPY cpp-engine/include ./include

# Install nlohmann/json
RUN apt-get update && apt-get install -y \
    nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create build directory and build
RUN mkdir build && cd build && \
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_CXX_COMPILER=clang++-15 \
        -DCMAKE_C_COMPILER=clang-15 \
        -GNinja && \
    ninja

# Production stage
FROM ubuntu:22.04 AS production

# Install runtime dependencies
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    libllvm15 \
    libclang-common-15-dev \
    libclang1-15 \
    libc++1-15 \
    libc++abi1-15 \
    clang-15 \
    clang-format-15 \
    clang-tidy-15 \
    g++ \
    gcc \
    curl \
    ca-certificates \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -s /bin/false -m -d /app cppengine

# Set working directory
WORKDIR /app

# Copy built executable and configuration
COPY --from=builder --chown=cppengine:cppengine /app/build/cpp_mastery_engine ./bin/
COPY --chown=cppengine:cppengine cpp-engine/config ./config

# Create necessary directories
RUN mkdir -p logs temp cache uploads && \
    chown -R cppengine:cppengine logs temp cache uploads

# Create default configuration if not exists
RUN if [ ! -f config/server.json ]; then \
    echo '{"server":{"host":"0.0.0.0","port":9000},"logging":{"level":"INFO"}}' > config/server.json; \
    fi

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Switch to non-root user
USER cppengine

# Expose port
EXPOSE 9000

# Start the engine
CMD ["./bin/cpp_mastery_engine", "--config", "config/server.json"]

# Development stage
FROM builder AS development

# Install additional development tools
RUN apt-get update && apt-get install -y \
    gdb \
    valgrind \
    strace \
    vim \
    nano \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Install Google Test and Benchmark
RUN apt-get update && apt-get install -y \
    libgtest-dev \
    libbenchmark-dev \
    && rm -rf /var/lib/apt/lists/*

# Build with debug symbols
RUN cd build && \
    cmake .. \
        -DCMAKE_BUILD_TYPE=Debug \
        -DCMAKE_CXX_COMPILER=clang++-15 \
        -DCMAKE_C_COMPILER=clang-15 \
        -GNinja && \
    ninja

# Create necessary directories
RUN mkdir -p logs temp cache uploads

# Expose port
EXPOSE 9000

# Start in development mode
CMD ["./build/cpp_mastery_engine", "--config", "config/server.json", "--verbose"]

# Testing stage
FROM development AS testing

# Copy test files
COPY cpp-engine/tests ./tests
COPY cpp-engine/benchmarks ./benchmarks

# Build tests
RUN cd build && ninja cpp_mastery_engine_tests

# Run tests
CMD ["./build/cpp_mastery_engine_tests"]

# Sandbox stage (for secure code execution)
FROM alpine:3.18 AS sandbox

# Install minimal runtime for C++ execution
RUN apk add --no-cache \
    g++ \
    gcc \
    musl-dev \
    linux-headers \
    && rm -rf /var/cache/apk/*

# Create sandbox user with no shell access
RUN adduser -D -s /sbin/nologin -h /tmp sandbox

# Set strict resource limits
RUN echo "sandbox soft nproc 32" >> /etc/security/limits.conf && \
    echo "sandbox hard nproc 32" >> /etc/security/limits.conf && \
    echo "sandbox soft nofile 64" >> /etc/security/limits.conf && \
    echo "sandbox hard nofile 64" >> /etc/security/limits.conf

# Create execution directory
RUN mkdir -p /app && chown sandbox:sandbox /app

# Switch to sandbox user
USER sandbox
WORKDIR /app

# Default command (overridden by execution engine)
CMD ["/bin/sh", "-c", "echo 'Sandbox ready'"]