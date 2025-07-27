"""
Main entry point for the Macaulay2 Jupyter kernel.
"""

from ipykernel.kernelapp import IPKernelApp
from .kernel import M2Kernel

if __name__ == "__main__":
    IPKernelApp.launch_instance(kernel_class=M2Kernel)