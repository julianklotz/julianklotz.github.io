#!/usr/bin/env python3

import os

os.chdir(os.path.dirname(__file__))

js_root = "js"
js_out = "application/application.min.js"

out_file = os.path.join(js_root, js_out)
js_out_str = ""
js_files = [
    'vendor/zepto.min.js',
    'vendor/fx.js',
    'vendor/fx_methods.js',
    'vendor/underscore-min.js',
    'vendor/backbone-min.js',
    'application/application.js', # No worker files pls
]

for f in js_files:
    with open(os.path.join(js_root, f), 'r') as myfile:
        str = myfile.read()
        js_out_str += str

with open(out_file, 'w+') as myfile:
    myfile.write(js_out_str)
    myfile.close()





