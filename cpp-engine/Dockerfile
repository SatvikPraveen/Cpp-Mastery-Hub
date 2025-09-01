# File: cpp-engine/Dockerfile
# Extension: (no extension)
# Location: cpp-engine/Dockerfile

# Multi-stage build for C++ Engine
FROM ubuntu:22.04 AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    pkg-config \
    libssl-dev \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install LLVM and Clang
RUN wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - \
    && echo "deb http://apt.llvm.org/jammy/ llvm-toolchain-jammy-17 main" > /etc/apt/sources.list.d/llvm.list \
    && apt-get update \
    && apt-get install -y \
        llvm-17-dev \
        libclang-17-dev \
        clang-17 \
        libclang-cpp17-dev \
    && rm -rf /var/lib/apt/lists/*

# Install additional libraries
RUN apt-get update && apt-get install -y \
    nlohmann-json3-dev \
    libgtest-dev \
    libgmock-dev \
    libbenchmark-dev \
    && rm -rf /var/lib/apt/lists/*

# Development stage
FROM base AS development
WORKDIR /app

# Copy source code
COPY . .

# Create build directory and configure
RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTS=ON -DBUILD_BENCHMARKS=ON .. && \
    make -j$(nproc)

EXPOSE 9000

CMD ["./build/CppMasteryHub", "--dev", "--port=9000"]

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=OFF -DBUILD_BENCHMARKS=OFF .. && \
    make -j$(nproc)

# Production stage
FROM ubuntu:22.04 AS production
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libstdc++6 \
    libc6 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash --uid 1001 cppuser

# Copy built application
COPY --from=builder --chown=cppuser:cppuser /app/build/CppMasteryHub /app/
COPY --from=builder --chown=cppuser:cppuser /app/config /app/config

# Create required directories
RUN mkdir -p cache logs tmp && chown -R cppuser:cppuser cache logs tmp

# Switch to non-root user
USER cppuser

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

CMD ["./CppMasteryHub", "--port=9000", "--log-level=info"]

# Test stage
FROM development AS test
WORKDIR /app

# Build with tests
RUN cd build && make -j$(nproc)

# Run tests
CMD ["ctest", "--test-dir", "build", "--output-on-failure"]