#!/usr/bin/env python3
"""Verify an unchanged Backend checkout against one owned disposable PostgreSQL container."""
import collections
import datetime
import json
import os
import pathlib
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE = pathlib.Path('/tmp/thaifood-backend-verify-20261114')
CONTAINER = 'thaifood-backend-qa-20261114'
SHA = 'a8c0d78f76220f596a1646913685021ccfdc83f8'
REPORT = ROOT / 'results.json'
report = {'status': 'running', 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'clientTimezone': 'Asia/Bangkok', 'repository': 'Sukrit310/thaifood-backend',
          'expectedRevision': SHA, 'commands': [], 'cleanup': {}, 'productionAccessed': False,
          'backendSourceEdited': False, 'backendDeployed': False}
env = os.environ.copy()
env.pop('DATABASE_URL', None)
env.pop('TEST_DATABASE_URL', None)
env.update(GOCACHE='/tmp/thaifood-backend-qa-go-build', GOMODCACHE='/tmp/thaifood-backend-qa-go-mod',
           GOPATH='/tmp/thaifood-backend-qa-go', CGO_ENABLED='1')


def save():
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


def output(args):
    return subprocess.check_output(args, cwd=SOURCE, env=env, text=True, stderr=subprocess.PIPE).strip()


def inspect():
    return json.loads(output(['docker', 'inspect', CONTAINER]))[0]


def run(name, args, json_tests=False):
    destination = ROOT / (name + ('.jsonl' if json_tests else '.txt'))
    started = time.monotonic()
    print('RUN ' + ' '.join(args), flush=True)
    with destination.open('w') as stream:
        process = subprocess.run(args, cwd=SOURCE, env=env, stdout=stream, stderr=subprocess.STDOUT)
    result = {'command': args, 'exitCode': process.returncode, 'elapsedSeconds': round(time.monotonic() - started, 2),
              'log': destination.name}
    if json_tests:
        tests, packages = [], []
        for line in destination.read_text().splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get('Action') in ('pass', 'fail', 'skip'):
                (tests if event.get('Test') else packages).append(event)
        result['topLevelPassed'] = sum(e['Action'] == 'pass' and '/' not in e['Test'] for e in tests)
        result['subtestsPassed'] = sum(e['Action'] == 'pass' and '/' in e['Test'] for e in tests)
        result['skippedTests'] = [e['Package'] + '/' + e['Test'] for e in tests if e['Action'] == 'skip']
        result['failedTests'] = [e['Package'] + '/' + e['Test'] for e in tests if e['Action'] == 'fail']
        result['packages'] = [{k: e[k] for k in ('Package', 'Action', 'Elapsed') if k in e} for e in packages]
        result['roleTestPasses'] = dict(collections.Counter(e['Package'] + '/' + e['Test'] for e in tests
                                                         if e['Action'] == 'pass' and ('MemberRole' in e['Test'] or 'MemberRoles' in e['Test'])))
    report['commands'].append(result)
    save()
    print(json.dumps(result), flush=True)
    if process.returncode:
        raise RuntimeError(name + ' failed; inspect ' + destination.name)
    if json_tests and (result['skippedTests'] or result['failedTests'] or result['topLevelPassed'] == 0):
        raise RuntimeError(name + ' must run real tests with zero failures/skips')
    return result


owned = False
try:
    report['revision'] = output(['git', 'rev-parse', 'HEAD'])
    assert report['revision'] == SHA, 'Checkout revision differs from inspected Backend source'
    assert output(['git', 'status', '--porcelain']) == '', 'Backend checkout must be unchanged'
    state = inspect()
    assert state['Config']['Labels'].get('codex.task') == 'thaifood-backend-verification-20261114', 'Container ownership label mismatch'
    owned = True
    deadline = time.monotonic() + 45
    while state['State'].get('Health', {}).get('Status') != 'healthy':
        assert time.monotonic() < deadline, 'Temporary PostgreSQL health check timed out'
        time.sleep(1)
        state = inspect()
    bindings = state['NetworkSettings']['Ports']['5432/tcp']
    assert len(bindings) == 1 and bindings[0]['HostIp'] == '127.0.0.1', 'Test DB must bind only to loopback'
    port = int(bindings[0]['HostPort'])
    env['TEST_DATABASE_URL'] = f'postgres://qa:local-test-only@127.0.0.1:{port}/thaifood_test?sslmode=disable'
    report['database'] = {'type': 'disposable Docker PostgreSQL', 'image': state['Config']['Image'],
                          'imageId': state['Image'], 'host': '127.0.0.1', 'database': 'thaifood_test',
                          'productionCredentialsLoaded': False}
    report['database']['version'] = output(['docker', 'exec', CONTAINER, 'psql', '-U', 'qa', '-d', 'thaifood_test', '-Atc', 'SELECT version()'])
    report['toolchain'] = output(['go', 'version'])
    print(json.dumps({'revision': report['revision'], 'toolchain': report['toolchain'], 'database': report['database']}), flush=True)
    full = run('race-all', ['go', 'test', '-race', '-count=1', '-timeout=5m', '-json', './...'], True)
    required = ['thaifood-backend/store/TestUpdateMemberRoleGuards/self_demotion_of_last_admin',
                'thaifood-backend/store/TestUpdateMemberRoleConcurrentCrossDemotions',
                'thaifood-backend/store/TestUpdateMemberRoleRechecksActorAfterLockWait',
                'thaifood-backend/integration/TestAdminMemberRolesConcurrentCrossDemotions',
                'thaifood-backend/integration/TestAdminMemberRoles']
    assert all(full['roleTestPasses'].get(name) == 1 for name in required), 'Required real DB role tests must pass'
    # Repeat these scheduling-sensitive cases deliberately; no production traffic.
    stress = run('race-concurrency-20', ['go', 'test', '-race', '-count=20', '-timeout=5m', '-json',
                                       './store', './integration', '-run',
                                       'Test(UpdateMemberRoleConcurrentCrossDemotions|UpdateMemberRoleRechecksActorAfterLockWait|AdminMemberRolesConcurrentCrossDemotions)$'], True)
    assert stress['topLevelPassed'] == 60, 'Three concurrency cases must each complete twenty times'
    run('vet', ['go', 'vet', './...'])
    run('build', ['go', 'build', './...'])
    report['temporarySchemasRemaining'] = output(['docker', 'exec', CONTAINER, 'psql', '-U', 'qa', '-d', 'thaifood_test', '-Atc',
                                                  "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'api_test_%' OR nspname LIKE 'thaifood_store_%'"])
    assert report['temporarySchemasRemaining'] == '0', 'All test schemas must be cleaned up'
    report['backendSourceUnchanged'] = output(['git', 'status', '--porcelain']) == ''
    assert report['backendSourceUnchanged'], 'Checks must leave Backend source unchanged'
    report['status'] = 'passed'
except Exception as error:
    report['status'] = 'failed'
    # Exceptions contain command/log names, never an environment/credential dump.
    report['failure'] = str(error)
    print('FAILED ' + str(error), file=sys.stderr, flush=True)
finally:
    if owned:
        stopped = subprocess.run(['docker', 'stop', '--time', '10', CONTAINER], capture_output=True, text=True)
        report['cleanup']['containerStopped'] = stopped.returncode == 0
        listing = subprocess.run(['docker', 'container', 'ls', '--all', '--filter',
                                  'label=codex.task=thaifood-backend-verification-20261114',
                                  '--format', '{{.Names}}'], capture_output=True, text=True)
        report['cleanup']['daemonListingSucceeded'] = listing.returncode == 0
        report['cleanup']['temporaryContainerRemoved'] = listing.returncode == 0 and CONTAINER not in listing.stdout.splitlines()
        if not all(report['cleanup'].values()):
            report['status'] = 'cleanup_unverified'
    report['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save()
    print(json.dumps({'status': report['status'], 'cleanup': report['cleanup'], 'report': str(REPORT)}), flush=True)
sys.exit(0 if report['status'] == 'passed' else 1)
