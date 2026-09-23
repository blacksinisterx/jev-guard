import os

JEV_PROVIDER = os.environ.get("JEV_PROVIDER", "mock")
JEV_MODEL = os.environ.get("JEV_MODEL", "jev-latest")
JEV_BLOCK_ABOVE = float(os.environ.get("JEV_BLOCK_ABOVE", "0.75"))
JEV_ALLOW_BELOW = float(os.environ.get("JEV_ALLOW_BELOW", "0.25"))
