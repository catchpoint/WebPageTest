import os
import sys

# add this directory and parent to sys.path for global import
path = os.path.dirname(__file__)
parent = os.path.dirname(path)
sys.path.append(path)
sys.path.append(parent)
