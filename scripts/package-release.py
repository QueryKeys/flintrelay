#!/usr/bin/env python3
"""Package tracked source and a SHA-256 checksum; never invoke a model."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    version = json.loads((root / '.claude-plugin/plugin.json').read_text())['version']
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?', version):
        parser.error('Invalid release version')
    names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')[:-1]
    files = {}
    for name in names:
        path = root / name
        if path.is_symlink() or not path.is_file() or any(part in {'.git', 'node_modules', 'types', '__pycache__', '.superpowers'} for part in Path(name).parts):
            parser.error('Unexpected tracked release path: ' + name)
        data = path.read_bytes()
        if re.search(rb'sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}', data):
            parser.error('Credential pattern in tracked source: ' + name)
        files[name] = data
    if not files or 'LICENSE' not in files or '.claude-plugin/marketplace.json' not in files:
        parser.error('Incomplete tracked release source')
    args.output.mkdir(parents=True, exist_ok=True)
    archive = args.output / ('flintrelay-' + version + '.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo('flintrelay/' + name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, data)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum = archive.with_suffix('.sha256')
    checksum.write_text(digest + '  ' + archive.name + '\n')
    print(json.dumps({'archive':str(archive), 'checksum':str(checksum), 'sha256':digest, 'files':len(files)}, indent=2))


if __name__ == '__main__':
    main()
