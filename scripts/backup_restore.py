"""Non-destructive PostgreSQL restore drill into an explicitly named, empty database."""
import argparse
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
import psycopg

parser = argparse.ArgumentParser()
parser.add_argument("--source-env", default="DATABASE_URL")
parser.add_argument("--target-env", default="RESTORE_DATABASE_URL")
args = parser.parse_args()
source, target = os.environ[args.source_env], os.environ[args.target_env]
s, t = urlparse(source), urlparse(target)
if (s.hostname, s.port, s.path) == (t.hostname, t.port, t.path) or not t.path.lstrip("/").startswith("rasd_restore_"):
    raise SystemExit("Target must be a separate, explicitly named rasd_restore_* database.")
with psycopg.connect(target) as conn:
    if conn.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'").fetchone()[0]:
        raise SystemExit("Restore target must be empty.")
def run(tool, url, extra):
    endpoint = urlparse(url)
    env = os.environ.copy()
    from urllib.parse import unquote
    env["PGPASSWORD"] = unquote(endpoint.password or "")
    command = [tool, "-h", endpoint.hostname, "-p", str(endpoint.port or 5432), "-U", unquote(endpoint.username or ""), "-d", endpoint.path.lstrip("/"), *extra]
    subprocess.run(command, env=env, check=True, capture_output=True)
with tempfile.TemporaryDirectory(prefix="rasd-backup-") as directory:
    archive = Path(directory) / "database.dump"
    run("pg_dump", source, ["--format=custom", "--file", str(archive)])
    run("pg_restore", target, ["--no-owner", "--no-privileges", str(archive)])
    def fingerprint(url):
        result = {}
        with psycopg.connect(url) as conn:
            names = conn.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'platform_core_%' ORDER BY tablename").fetchall()
            for (name,) in names:
                from psycopg import sql
                rows = conn.execute(sql.SQL("SELECT row_to_json(t)::text FROM {} t ORDER BY id").format(sql.Identifier(name))).fetchall()
                result[name] = {"count": len(rows), "sha256": hashlib.sha256(json.dumps(rows).encode()).hexdigest()}
        return result
    original, restored = fingerprint(source), fingerprint(target)
    if original != restored:
        raise SystemExit("Restore row fingerprints differ.")
    print(json.dumps({"result": "PASS", "tables": original, "archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest()}, indent=2))

