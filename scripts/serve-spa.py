#!/usr/bin/env python3
"""Serve a static single-page app with index.html fallback."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import os


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] == "/":
            self.send_response(302)
            self.send_header("Location", "/chart")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        request_path = self.path.split("?", 1)[0]
        if request_path in {"/index.html", "/ngsw.json", "/ngsw-worker.js"}:
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            self.path = "/index.html"
        return super().send_head()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve a static SPA directory.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=4200)
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()

    directory = Path(args.directory).resolve()
    if not directory.joinpath("index.html").is_file():
        raise SystemExit(f"index.html not found in {directory}")

    handler = lambda *handler_args, **handler_kwargs: SpaHandler(
        *handler_args,
        directory=str(directory),
        **handler_kwargs,
    )
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {directory} at http://{args.host}:{args.port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
