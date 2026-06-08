#!/usr/bin/env python3

import os, time, sys, datetime

def sources():
	path = './src/'
	return [os.path.join(base, f) for base, folders, files in os.walk(path) for f in files if f.endswith('.js')]

def build():
	path = './www/fsm.js'
	data = '\n'.join(open(file, 'r', encoding='utf-8').read() for file in sources())
	with open(path, 'w') as f:
		f.write(data)
	print(f'built {path} ({len(data)} bytes) at {datetime.datetime.now()}')

def stat():
	return [os.stat(file).st_mtime for file in sources()]

def monitor():
	a = stat()
	while True:
		time.sleep(0.5)
		b = stat()
		if a != b:
			a = b
			build()

if __name__ == '__main__':
	build()
	if '--watch' in sys.argv:
		monitor()
