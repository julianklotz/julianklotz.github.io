#! /usr/bin/env python3

import os
import sys
from os import walk
import subprocess
from shlex import quote


GPX_DIR = 'gpx'
GEOJSON_DIR = 'geojson'


os.chdir(os.path.dirname(sys.argv[0])) 


f = []
for (dirpath, dirnames, filenames) in walk( GPX_DIR ):
    f.extend(filenames)
    break

for file_name in f:
	if( file_name.endswith('.gpx') ):
	
		source =  os.path.abspath( os.path.join(GPX_DIR, file_name) )
		target = quote( os.path.abspath( os.path.join(GEOJSON_DIR, file_name + ".geojson") ) )
		subprocess.run( ['togeojson', source, '>', target] )
