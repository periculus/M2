cmake_minimum_required(VERSION 3.24)
project(test_libs)

# Add our library paths
set(CMAKE_PREFIX_PATH "/opt/homebrew/factory;/opt/homebrew/normaliz;${CMAKE_PREFIX_PATH}")

# Set module path for custom find modules
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}" ${CMAKE_MODULE_PATH})

# Test finding Factory
find_package(Factory 3.0.0)
if(FACTORY_FOUND)
    message(STATUS "✓ Factory found:")
    message(STATUS "  Version: ${FACTORY_VERSION}")  
    message(STATUS "  Include dir: ${FACTORY_INCLUDE_DIR}")
    message(STATUS "  Libraries: ${FACTORY_LIBRARIES}")
else()
    message(STATUS "✗ Factory not found")
endif()

# Test finding Normaliz  
find_package(Normaliz 3.8.0)
if(NORMALIZ_FOUND)
    message(STATUS "✓ Normaliz found:")
    message(STATUS "  Version: ${NORMALIZ_VERSION}")
    message(STATUS "  Include dir: ${NORMALIZ_INCLUDE_DIR}")
    message(STATUS "  Libraries: ${NORMALIZ_LIBRARIES}")
    message(STATUS "  Executable: ${NORMALIZ_EXECUTABLE}")
else()
    message(STATUS "✗ Normaliz not found")
endif()