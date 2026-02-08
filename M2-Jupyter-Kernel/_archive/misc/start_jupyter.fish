#!/usr/bin/env fish
# Start Jupyter Lab with M2 kernel

# Set the working directory
cd (dirname (status --current-filename))

# Use venv Python directly
echo "Starting Jupyter Lab with M2 kernel..."
./venv/bin/jupyter lab

# Alternative if you want to use the system jupyter with venv kernel:
# jupyter lab