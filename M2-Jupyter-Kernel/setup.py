#!/usr/bin/env python3

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="macaulay2-jupyter-kernel",
    version="2.0.0",
    author="M2 Development Team",
    author_email="m2-dev@example.com",
    description="A modern, robust Jupyter kernel for Macaulay2",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Macaulay2/M2-Jupyter-Kernel",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: GPL License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Mathematics",
        "Framework :: Jupyter",
    ],
    python_requires=">=3.8",
    install_requires=[
        "ipykernel>=6.0.0",
        "jupyter-client>=7.0.0",
        "traitlets>=5.0.0",
        "pexpect>=4.8.0",
    ],
    extras_require={
        "dev": ["pytest", "black", "flake8", "mypy"],
    },
    entry_points={
        "console_scripts": [
            "install-m2-kernel=m2_kernel.install:main",
        ],
    },
    include_package_data=True,
    package_data={
        "m2_kernel": ["kernel.json", "logo-*.png", "static/*.js"],
    },
)