"""
Installation script for the Macaulay2 Jupyter kernel.
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Optional

import jupyter_client


def get_kernel_spec() -> dict:
    """Get the kernel specification."""
    return {
        "argv": [
            sys.executable,
            "-m",
            "m2_kernel",
            "-f",
            "{connection_file}"
        ],
        "display_name": "Macaulay2",
        "language": "macaulay2",
        "codemirror_mode": "macaulay2",
        "file_extension": ".m2",
        "mimetype": "text/x-macaulay2"
    }


def install_kernel_spec(user: bool = True, prefix: Optional[str] = None, 
                       kernel_name: str = "macaulay2") -> None:
    """
    Install the Macaulay2 kernel specification.
    
    Args:
        user: Install for current user only
        prefix: Installation prefix
        kernel_name: Name for the kernel
    """
    # Get package directory
    package_dir = Path(__file__).parent
    
    # Create temporary directory for kernel spec
    spec_dir = Path.cwd() / f"temp_kernel_spec_{kernel_name}"
    
    try:
        # Create spec directory
        spec_dir.mkdir(exist_ok=True)
        
        # Write kernel.json
        kernel_spec = get_kernel_spec()
        with open(spec_dir / "kernel.json", "w") as f:
            json.dump(kernel_spec, f, indent=2)
        
        # Copy logo files if they exist
        logo_files = ["logo-32x32.png", "logo-64x64.png"]
        for logo_file in logo_files:
            src_logo = package_dir / logo_file
            if src_logo.exists():
                shutil.copy2(src_logo, spec_dir / logo_file)
        
        # Install kernel spec
        if prefix:
            install_dest = jupyter_client.kernelspec.install_kernel_spec(
                str(spec_dir), kernel_name=kernel_name, prefix=prefix
            )
        else:
            install_dest = jupyter_client.kernelspec.install_kernel_spec(
                str(spec_dir), kernel_name=kernel_name, user=user
            )
        
        print(f"Installed Macaulay2 kernel to: {install_dest}")
        
        # Verify installation
        try:
            km = jupyter_client.kernelspec.KernelSpecManager()
            spec = km.get_kernel_spec(kernel_name)
            print(f"Kernel '{kernel_name}' installed successfully!")
            print(f"Display name: {spec.display_name}")
            print(f"Language: {spec.language}")
        except Exception as e:
            print(f"Warning: Could not verify installation: {e}")
        
    finally:
        # Clean up temporary directory
        if spec_dir.exists():
            shutil.rmtree(spec_dir)


def remove_kernel_spec(kernel_name: str = "macaulay2") -> None:
    """
    Remove the Macaulay2 kernel specification.
    
    Args:
        kernel_name: Name of the kernel to remove
    """
    try:
        km = jupyter_client.kernelspec.KernelSpecManager()
        km.remove_kernel_spec(kernel_name)
        print(f"Removed kernel '{kernel_name}'")
    except Exception as e:
        print(f"Error removing kernel: {e}")
        sys.exit(1)


def list_kernels() -> None:
    """List all installed kernels."""
    try:
        km = jupyter_client.kernelspec.KernelSpecManager()
        specs = km.get_all_specs()
        
        print("Installed kernels:")
        for name, spec in specs.items():
            display_name = spec['spec'].get('display_name', name)
            language = spec['spec'].get('language', 'unknown')
            print(f"  {name:20} {display_name:25} ({language})")
            
    except Exception as e:
        print(f"Error listing kernels: {e}")
        sys.exit(1)


def check_m2_installation() -> bool:
    """Check if Macaulay2 is properly installed."""
    import subprocess
    
    # Try to find M2 executable
    try:
        result = subprocess.run(
            ["M2", "--version"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if result.returncode == 0:
            print("✓ Macaulay2 found and working")
            print(f"  Version info: {result.stdout.strip()}")
            return True
        else:
            print("✗ Macaulay2 found but not working properly")
            print(f"  Error: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("✗ Macaulay2 not found in PATH")
        print("  Please install Macaulay2 and ensure 'M2' is in your PATH")
        return False
    except subprocess.TimeoutExpired:
        print("✗ Macaulay2 found but timed out")
        return False
    except Exception as e:
        print(f"✗ Error checking Macaulay2: {e}")
        return False


def check_jupyter_installation() -> bool:
    """Check if Jupyter is properly installed."""
    try:
        import jupyter_client
        import ipykernel
        
        print("✓ Jupyter components found")
        print(f"  jupyter-client: {jupyter_client.__version__}")
        print(f"  ipykernel: {ipykernel.__version__}")
        return True
    except ImportError as e:
        print(f"✗ Missing Jupyter components: {e}")
        return False


def main():
    """Main installation script."""
    parser = argparse.ArgumentParser(
        description="Install the Macaulay2 Jupyter kernel"
    )
    
    parser.add_argument(
        "--user", 
        action="store_true",
        help="Install for current user only (default)"
    )
    
    parser.add_argument(
        "--system", 
        action="store_true",
        help="Install system-wide (requires admin privileges)"
    )
    
    parser.add_argument(
        "--prefix", 
        type=str,
        help="Installation prefix"
    )
    
    parser.add_argument(
        "--name", 
        type=str, 
        default="macaulay2",
        help="Kernel name (default: macaulay2)"
    )
    
    parser.add_argument(
        "--remove", 
        action="store_true",
        help="Remove the kernel instead of installing"
    )
    
    parser.add_argument(
        "--list", 
        action="store_true",
        help="List all installed kernels"
    )
    
    parser.add_argument(
        "--check", 
        action="store_true",
        help="Check installation requirements"
    )
    
    args = parser.parse_args()
    
    # Handle different actions
    if args.list:
        list_kernels()
        return
    
    if args.check:
        print("Checking installation requirements...")
        print()
        
        jupyter_ok = check_jupyter_installation()
        print()
        m2_ok = check_m2_installation()
        print()
        
        if jupyter_ok and m2_ok:
            print("✓ All requirements satisfied!")
            print("You can now install the kernel with: install-m2-kernel --user")
        else:
            print("✗ Some requirements are missing. Please install them first.")
            sys.exit(1)
        return
    
    if args.remove:
        remove_kernel_spec(args.name)
        return
    
    # Install kernel
    print(f"Installing Macaulay2 kernel '{args.name}'...")
    
    # Determine installation mode
    user_install = not args.system
    if args.user:
        user_install = True
    
    try:
        install_kernel_spec(
            user=user_install, 
            prefix=args.prefix, 
            kernel_name=args.name
        )
        
        print()
        print("Installation complete!")
        print()
        print("Next steps:")
        print("1. Start Jupyter: jupyter notebook  or  jupyter lab")
        print("2. Create a new notebook")
        print("3. Select 'Macaulay2' as the kernel")
        print()
        print("For help, see: https://github.com/Macaulay2/M2-Jupyter-Kernel")
        
    except Exception as e:
        print(f"Installation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()