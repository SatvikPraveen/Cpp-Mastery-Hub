"""End-to-end tests for the HTTP adapter against the real CLI.

Run by CTest (`cli.http_adapter`) with CPPMASTERY_BIN pointing at the freshly built binary:
    CPPMASTERY_BIN=build/dev/cppmastery python3 -m unittest tools/http_adapter/test_http_adapter.py
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class AdapterTest(unittest.TestCase):
    proc: subprocess.Popen
    base: str

    @classmethod
    def setUpClass(cls) -> None:
        port = free_port()
        env = dict(os.environ, CPPMASTERY_HOST="127.0.0.1", CPPMASTERY_PORT=str(port),
                   CPPMASTERY_MAX_BODY="4096", CPPMASTERY_TIMEOUT="5")
        cls.proc = subprocess.Popen([sys.executable, os.path.join(HERE, "cppmastery_http.py")], env=env,
                                    stderr=subprocess.PIPE)
        cls.base = f"http://127.0.0.1:{port}"
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.base + "/health", timeout=0.5)
                return
            except (urllib.error.URLError, ConnectionError):
                if cls.proc.poll() is not None:
                    raise RuntimeError(cls.proc.stderr.read().decode())
                time.sleep(0.05)
        raise RuntimeError("adapter did not start")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.proc.terminate()
        cls.proc.wait(timeout=5)

    def request(self, path: str, body: dict | None = None, raw: bytes | None = None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.base + path, data=data, method="POST" if data is not None else "GET",
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as err:
            return err.code, json.loads(err.read())

    def test_health_and_rules(self):
        status, body = self.request("/health")
        self.assertEqual(status, 200)
        self.assertTrue(body["engine"].startswith("cppmastery "))
        status, body = self.request("/rules")
        self.assertEqual(status, 200)
        self.assertEqual(len(body["rules"]), 20)

    def test_analyze_returns_report_even_with_errors(self):
        status, body = self.request("/analyze", {"code": "int main(){ char b[8]; gets(b); }"})
        self.assertEqual(status, 200)
        self.assertEqual(body["schema"], "cppmastery.analysis/1")
        self.assertEqual(body["summary"]["errors"], 1)

    def test_analyze_config_is_forwarded_and_validated(self):
        code = "void f(){ goto x; x: ; }"
        status, body = self.request("/analyze", {"code": code, "config": {"disable": ["readability/goto"]}})
        self.assertEqual(status, 200)
        self.assertEqual(body["summary"]["total"], 0)
        status, body = self.request("/analyze", {"code": code, "config": {"max_cc": "ten"}})
        self.assertEqual(status, 400)
        status, body = self.request("/analyze", {"code": code, "config": {"disable": ["rm -rf /"]}})
        self.assertEqual(status, 400)

    def test_layout_and_metrics(self):
        status, body = self.request("/layout", {"code": "struct S { char a; double b; char c; int d; };", "abi": "lp64"})
        self.assertEqual(status, 200)
        self.assertEqual(body["structs"][0]["suggested"]["bytes_saved"], 8)
        status, body = self.request("/layout", {"code": "struct S{};", "abi": "lp99"})
        self.assertEqual(status, 400)
        status, body = self.request("/metrics", {"code": "int main() { return 0; }"})
        self.assertEqual(status, 200)
        self.assertEqual(len(body["functions"]), 1)

    def test_rejections(self):
        status, body = self.request("/analyze", raw=b"not json")
        self.assertEqual(status, 400)
        status, body = self.request("/analyze", {"code": 42})
        self.assertEqual(status, 400)
        status, body = self.request("/analyze", {"code": "x" * 5000})
        self.assertEqual(status, 413)
        status, body = self.request("/execute", {"code": "int main(){}"})
        self.assertEqual(status, 501)
        status, body = self.request("/nope")
        self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main()
