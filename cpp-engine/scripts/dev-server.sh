#!/bin/bash

# File: cpp-engine/scripts/dev-server.sh
# Extension: .sh
# Location: cpp-engine/scripts/dev-server.sh

set -e

echo "Starting C++ Engine Development Server..."

# Create build directory if it doesn't exist
if [ ! -d "build" ]; then
    echo "Creating build directory..."
    mkdir build
fi

cd build

# Configure CMake for development
echo "Configuring CMake..."
cmake -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTS=ON -DBUILD_BENCHMARKS=ON ..

# Build the project
echo "Building project..."
make -j$(nproc)

# Run tests
echo "Running tests..."
ctest --output-on-failure

# Start the server in development mode
echo "Starting C++ Engine server..."
./CppMasteryHub --dev --port=9000 --log-level=debug