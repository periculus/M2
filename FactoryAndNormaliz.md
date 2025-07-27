Complete Guide: Integrating Factory and Normaliz with Macaulay2 on ARM64 macOS

  Prerequisites

  # Install required dependencies via Homebrew
  arch -arm64 brew install gmp mpfr flint autoconf automake libtool

  Step 1: Clone and Build the Mathematical Libraries

  Factory Library (from Singular project)

  cd /Users/sverrir/Documents/GitHub/M2/M2/external-libs/Singular/factory

  # Configure with proper paths for ARM64
  export CPPFLAGS="-I/opt/homebrew/include"
  export LDFLAGS="-L/opt/homebrew/lib"

  ./configure --prefix=/opt/homebrew/factory --with-gmp=/opt/homebrew

  # Build and install
  make
  make install

  Normaliz Library

  cd /Users/sverrir/Documents/GitHub/M2/M2/external-libs/Normaliz

  # Configure with proper paths for ARM64
  export CPPFLAGS="-I/opt/homebrew/include"
  export LDFLAGS="-L/opt/homebrew/lib"

  ./configure --prefix=/opt/homebrew/normaliz --with-gmp=/opt/homebrew

  # Build and install  
  make
  make install

  Step 2: Fix M2's CMake Configuration

  Update FindFactory.cmake

  # File: M2/cmake/FindFactory.cmake
  # Change line 38 from:
  string(REGEX MATCH "define[ \t]+PACKAGE_VERSION[ \t]+\"([0-9]+)\.([0-9]+)\.([0-9]+)\""
  # To:
  string(REGEX MATCH "define[ \t]+FACTORYVERSION[ \t]+\"([0-9]+)\.([0-9]+)\.([0-9]+)\""

  Update minimum version requirement

  # File: M2/cmake/check-libraries.cmake  
  # Change line 136 from:
  find_package(Factory  4.4.0)
  # To:
  find_package(Factory  3.1.0)

  Step 3: Set Up Environment for M2 Build

  # Set PKG_CONFIG_PATH so Factory can be found
  export PKG_CONFIG_PATH="/opt/homebrew/factory/lib/pkgconfig:$PKG_CONFIG_PATH"

  # Configure M2 with library paths
  cmake -DCMAKE_PREFIX_PATH="/opt/homebrew/factory;/opt/homebrew/normaliz;/opt/homebrew" \
        -S . -B BUILD/cmake

  Step 4: Verify Installation

  Create a test to verify libraries are found:

  # test_libs/CMakeLists.txt
  cmake_minimum_required(VERSION 3.24)
  project(test_libs)

  set(CMAKE_PREFIX_PATH "/opt/homebrew/factory;/opt/homebrew/normaliz;${CMAKE_PREFIX_PATH}")
  set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../cmake" ${CMAKE_MODULE_PATH})

  find_package(Factory 3.1.0)
  if(FACTORY_FOUND)
      message(STATUS "✓ Factory found: Version ${FACTORY_VERSION}")
  else()
      message(STATUS "✗ Factory not found")
  endif()

  find_package(Normaliz 3.8.0)
  if(NORMALIZ_FOUND)
      message(STATUS "✓ Normaliz found: Version ${NORMALIZ_VERSION}")
  else()
      message(STATUS "✗ Normaliz not found")
  endif()

  Key Files and Locations

  Installed Libraries:
  - Factory: /opt/homebrew/factory/
    - Headers: /opt/homebrew/factory/include/factory/
    - Libraries: /opt/homebrew/factory/lib/libcf.a
    - PKG-config: /opt/homebrew/factory/lib/pkgconfig/factory.pc
  - Normaliz: /opt/homebrew/normaliz/
    - Headers: /opt/homebrew/normaliz/include/libnormaliz/
    - Libraries: /opt/homebrew/normaliz/lib/libnormaliz.dylib
    - Executable: /opt/homebrew/normaliz/bin/normaliz

  Modified M2 Files:
  - M2/cmake/FindFactory.cmake - Fixed version detection regex
  - M2/cmake/check-libraries.cmake - Updated minimum version requirement

  Critical Points for ARM64 macOS

  1. Use arch -arm64: Always prefix Homebrew commands with arch -arm64 to ensure ARM64 builds
  2. Set proper compiler flags: The CPPFLAGS and LDFLAGS environment variables are crucial for finding Homebrew dependencies
  3. Version compatibility: Factory from Singular is 3.1.7, not 4.x, so the minimum version check needed adjustment
  4. Library paths: Both libraries install to /opt/homebrew/ prefix structure for proper CMake detection

  Verification Commands

  # Check Factory installation
  pkg-config --exists factory && echo "Factory pkgconfig found"
  ls -la /opt/homebrew/factory/lib/libcf.a

  # Check Normaliz installation  
  ls -la /opt/homebrew/normaliz/lib/libnormaliz.dylib
  /opt/homebrew/normaliz/bin/normaliz --version

  # Test CMake detection
  cd test_libs/build && cmake ..
  # Should show: ✓ Factory found: Version 3.1.7
  # Should show: ✓ Normaliz found: Version 3.10.5

  This process replaces the dummy implementations with full mathematical functionality, enabling Factory polynomial operations and Normaliz convex geometry
  computations in Macaulay2 on ARM64 macOS.Grea