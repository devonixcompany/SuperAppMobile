#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Alias/launcher for qr-generate.py so you can run:
  python3 generate_qr.py --text "..."
    python3 ./generate_qr.py --text "https://bw6z7nqh-8080.asse.devtunnels.ms/api/chargepoints/Devonix1/1/websocket-url" -o d
evonix1-connector1.png

python generate_qr.py --text "http://192.168.1.78:8080/api/chargepoints/Devonix1/1/websocket-url" -o d
evonix1-connector1.png

This loads and executes the main() from qr-generate.py, forwarding CLI args.
"""

import os
import sys
import importlib.util


def _run_qr_generator():
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.join(here, "qr-generate.py")

    if not os.path.exists(target):
        sys.stderr.write("Error: qr-generate.py not found next to generate_qr.py\n")
        sys.exit(1)

    spec = importlib.util.spec_from_file_location("qr_generate_module", target)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)

    # Call the original script's main() which uses argparse to parse sys.argv
    if hasattr(module, "main") and callable(module.main):
        module.main()
    else:
        sys.stderr.write("Error: qr-generate.py does not define main()\n")
        sys.exit(1)


if __name__ == "__main__":
    _run_qr_generator()