#!/usr/bin/env python3
"""Test process monitoring and smart timeout in a notebook-like environment."""

import subprocess
import json
import time
import os
import sys

# Sample notebook content
notebook_content = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["# Test Process Monitoring and Smart Timeout\n", "Testing the new features"]
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": ["%status"]
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "-- Set short timeout\n",
                "%timeout=5\n",
                "-- Run CPU intensive computation\n",
                "R = QQ[x,y,z,w];\n",
                "I = ideal(random(3,R), random(3,R), random(3,R), random(3,R));\n",
                "print \"Starting intensive computation...\";\n",
                "for i from 1 to 20 do (\n",
                "    if i % 5 == 0 then print(\"Still computing... iteration \" | toString(i));\n",
                "    gb I;\n",
                ");\n",
                "print \"Computation completed!\""
            ]
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": ["%status on"]
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "-- Another computation to see status widget\n",
                "J = ideal(x^4, y^4, z^4, w^4, x*y*z*w);\n",
                "gb J"
            ]
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": ["%status off"]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Macaulay2",
            "language": "macaulay2",
            "name": "macaulay2"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

# Save test notebook
test_notebook = "/tmp/test_process_monitor.ipynb"
with open(test_notebook, 'w') as f:
    json.dump(notebook_content, f, indent=2)

print(f"Created test notebook: {test_notebook}")
print("\nTo test the features:")
print("1. Start Jupyter Lab: jupyter lab")
print(f"2. Open the notebook: {test_notebook}")
print("3. Run the cells and observe:")
print("   - %status magic showing process statistics")
print("   - Smart timeout extending execution beyond 5 seconds")
print("   - Status widget showing CPU usage in real-time")
print("\nKey features to verify:")
print("- Cell 2: Should show current M2 process stats")
print("- Cell 3: Should run longer than 5s timeout due to smart timeout")
print("- Cell 4-6: Should show/hide status widget with CPU monitoring")