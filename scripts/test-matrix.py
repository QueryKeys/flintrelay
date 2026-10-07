#!/usr/bin/env python3
"""Run native offline tests in isolated configurations, including persistence."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--claude', default='claude', help='Trusted Claude CLI executable; never sends a model prompt.')
    parser.add_argument('--profile', choices=['all', 'default', 'persisted', 'off'], default='all')
    args = parser.parse_args()
    executable = shutil.which(args.claude)
    if executable is None:
        parser.error('Claude executable not found')
    source = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix='model-router-tests-') as temp:
        root = Path(temp)
        environment = os.environ.copy()
        environment.update(CLAUDE_CONFIG_DIR=str(root / 'config'), DISABLE_TELEMETRY='1', DISABLE_ERROR_REPORTING='1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1')
        version = subprocess.run([executable, '--version'], check=True, capture_output=True, text=True, env=environment).stdout.strip()
        if version not in ['2.1.286 (Claude Code)', '2.1.290 (Claude Code)']:
            parser.error('The preview test matrix requires tested host 2.1.286 or 2.1.290; global installations are never changed.')
        profiles = ['default', 'persisted', 'off'] if args.profile == 'all' else [args.profile]
        for profile in profiles:
            target = root / profile
            shutil.copytree(source, target, ignore=shutil.ignore_patterns('.git', 'node_modules', '.superpowers', '__pycache__', 'types'))
            if profile == 'persisted':
                manifest = target / '.claude-plugin/plugin.json'
                data = json.loads(manifest.read_text())
                data['userConfig']['persist_metrics']['default'] = True
                manifest.write_text(json.dumps(data, indent=2))
                shutil.copyfile(target / 'tests/persistence.fixture.ts', target / 'tests/persistence.test.ts')
            if profile == 'off':
                manifest = target / '.claude-plugin/plugin.json'
                data = json.loads(manifest.read_text())
                data['userConfig']['mode']['default'] = 'off'
                manifest.write_text(json.dumps(data, indent=2))
                for test in (target / 'tests').glob('*.test.ts'):
                    test.unlink()
                shutil.copyfile(target / 'tests/off.fixture.ts', target / 'tests/off.test.ts')
            print('Native offline test profile:', profile, flush=True)
            subprocess.run([executable, 'plugin', 'validate', '--strict', '--json', str(target)], check=True, env=environment)
            subprocess.run([executable, 'plugin', 'test', str(target)], check=True, env=environment)


if __name__ == '__main__':
    main()
