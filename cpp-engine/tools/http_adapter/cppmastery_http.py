#!/usr/bin/env python3
"""Thin HTTP adapter around the `cppmastery` CLI (ADR-0005).

It does exactly one thing: accept source text over HTTP, run the CLI as a subprocess with a
timeout and a body-size cap, and relay the CLI's JSON. It holds no state, needs only the
Python standard library, and never executes the submitted code.

Endpoints
    GET  /health             -> {"status":"ok","engine":"cppmastery 2.0.0 (...)"}
    GET  /version            -> same payload as /health
    GET  /rules              -> cppmastery rules --json
    POST /analyze            -> body {"code": str, "config": {max_cc, max_nesting, max_lines, disable: [..]}}
    POST /metrics            -> body {"code": str}
    POST /layout             -> body {"code": str, "abi": "lp64|llp64|ilp32", "pack": int}
    POST /tokens             -> body {"code": str}
    POST /execute            -> 501; code execution is not provided (see docs/research/threat-model.md)

Environment
    CPPMASTERY_BIN      path to the CLI (default: "cppmastery" on PATH)
    CPPMASTERY_PORT     listen port (default 9000)       CPPMASTERY_HOST  bind address (default 0.0.0.0)
    CPPMASTERY_MAX_BODY max request body in bytes (default 262144)
    CPPMASTERY_TIMEOUT  CLI timeout in seconds (default 5)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BIN = os.environ.get("CPPMASTERY_BIN", "cppmastery")
MAX_BODY = int(os.environ.get("CPPMASTERY_MAX_BODY", str(256 * 1024)))
TIMEOUT = float(os.environ.get("CPPMASTERY_TIMEOUT", "5"))
ALLOWED_ABI = {"lp64", "llp64", "ilp32"}
RULE_ID = re.compile(r"^[a-z]+/[a-z0-9+-]+$")


class EngineError(Exception):
    def __init__(self, status: HTTPStatus, message: str):
        super().__init__(message)
        self.status = status


def run_cli(args: list[str], stdin: str | None = None) -> str:
    try:
        proc = subprocess.run(
            [BIN, *args], input=stdin, capture_output=True, text=True, timeout=TIMEOUT, check=False
        )
    except FileNotFoundError as exc:
        raise EngineError(HTTPStatus.SERVICE_UNAVAILABLE, f"engine binary not found: {BIN}") from exc
    except subprocess.TimeoutExpired as exc:
        raise EngineError(HTTPStatus.GATEWAY_TIMEOUT, f"engine exceeded {TIMEOUT}s") from exc
    # Exit 1 means "diagnostics found" and still carries a full JSON report.
    if proc.returncode not in (0, 1):
        raise EngineError(HTTPStatus.BAD_GATEWAY, proc.stderr.strip() or f"engine exit {proc.returncode}")
    return proc.stdout


def analyze_args(body: dict) -> list[str]:
    args = ["analyze", "--json", "--fail-on", "never"]
    cfg = body.get("config") or {}
    for key, flag in (("max_cc", "--max-cc"), ("max_nesting", "--max-nesting"), ("max_lines", "--max-lines")):
        if key in cfg:
            value = cfg[key]
            if not isinstance(value, int) or value < 0 or value > 10_000:
                raise EngineError(HTTPStatus.BAD_REQUEST, f"config.{key} must be a small non-negative integer")
            args += [flag, str(value)]
    for rule in cfg.get("disable", []):
        if not isinstance(rule, str) or len(rule) > 64 or not RULE_ID.match(rule):
            raise EngineError(HTTPStatus.BAD_REQUEST, "config.disable entries must be rule ids")
        args += ["--disable", rule]
    return args + ["-"]


def layout_args(body: dict) -> list[str]:
    args = ["layout", "--json"]
    abi = body.get("abi", "lp64")
    if abi not in ALLOWED_ABI:
        raise EngineError(HTTPStatus.BAD_REQUEST, f"abi must be one of {sorted(ALLOWED_ABI)}")
    args += ["--abi", abi]
    if "pack" in body:
        pack = body["pack"]
        if not isinstance(pack, int) or pack not in (1, 2, 4, 8, 16):
            raise EngineError(HTTPStatus.BAD_REQUEST, "pack must be 1, 2, 4, 8 or 16")
        args += ["--pack", str(pack)]
    return args + ["-"]


class Handler(BaseHTTPRequestHandler):
    server_version = "cppmastery-http/1.0"

    def log_message(self, fmt: str, *args) -> None:  # one line per request, no client data
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _send(self, status: HTTPStatus, payload: str, content_type: str = "application/json") -> None:
        data = payload.encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _error(self, status: HTTPStatus, message: str) -> None:
        self._send(status, json.dumps({"error": message, "status": int(status)}))

    def do_GET(self) -> None:  # noqa: N802 (http.server naming)
        try:
            if self.path in ("/health", "/version"):
                version = run_cli(["version"]).strip()
                self._send(HTTPStatus.OK, json.dumps({"status": "ok", "engine": version}))
            elif self.path == "/rules":
                self._send(HTTPStatus.OK, run_cli(["rules", "--json"]))
            else:
                self._error(HTTPStatus.NOT_FOUND, "unknown endpoint")
        except EngineError as exc:
            self._error(exc.status, str(exc))

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                raise EngineError(HTTPStatus.BAD_REQUEST, "empty body")
            if length > MAX_BODY:
                raise EngineError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, f"body exceeds {MAX_BODY} bytes")
            raw = self.rfile.read(length)
            try:
                body = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise EngineError(HTTPStatus.BAD_REQUEST, "body must be JSON") from exc
            if not isinstance(body, dict) or not isinstance(body.get("code"), str):
                raise EngineError(HTTPStatus.BAD_REQUEST, 'body must be an object with a string "code"')
            code = body["code"]

            if self.path == "/analyze":
                out = run_cli(analyze_args(body), code)
            elif self.path == "/metrics":
                out = run_cli(["metrics", "--json", "-"], code)
            elif self.path == "/layout":
                out = run_cli(layout_args(body), code)
            elif self.path == "/tokens":
                out = run_cli(["tokens", "--json", "-"], code)
            elif self.path == "/execute":
                raise EngineError(
                    HTTPStatus.NOT_IMPLEMENTED,
                    "code execution is intentionally not provided by this engine; "
                    "see docs/research/threat-model.md for the sandbox requirements",
                )
            else:
                raise EngineError(HTTPStatus.NOT_FOUND, "unknown endpoint")
            self._send(HTTPStatus.OK, out)
        except EngineError as exc:
            self._error(exc.status, str(exc))


def main() -> int:
    host = os.environ.get("CPPMASTERY_HOST", "0.0.0.0")
    port = int(os.environ.get("CPPMASTERY_PORT", "9000"))
    if shutil.which(BIN) is None and not os.path.exists(BIN):
        sys.stderr.write(f"cppmastery_http: engine binary '{BIN}' not found\n")
        return 3
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    sys.stderr.write(f"cppmastery_http: serving on {host}:{port} using {BIN}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
