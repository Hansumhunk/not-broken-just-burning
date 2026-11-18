"""Summarize actual Lighthouse JSON reports without inventing missing metrics."""
import json
import sys
from pathlib import Path

def value(report, audit):
    raw = report.get("audits", {}).get(audit, {}).get("numericValue")
    return None if not isinstance(raw, (int, float)) else raw

def display(raw, digits=0):
    return "unavailable" if raw is None else f"{raw:.{digits}f}"

def category(report, key):
    val = report.get("categories", {}).get(key, {}).get("score")
    return None if val is None else val * 100

def main():
    folder = Path(sys.argv[1])
    print("## Local Lighthouse laboratory snapshot (not production field data)")
    print("Two mobile runs per comparison; desktop and new hubs single snapshots; results may vary. Local HTTP excludes production-only analytics, CDN caching and HTTPS behavior. TBT is a lab proxy, not INP. Compare repeated runs before claiming durable improvement.")
    print("| Page / condition | Perf /100 | A11y /100 | SEO /100 | LCP ms | TBT ms | CLS | FCP ms |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|")
    reports = sorted(folder.glob("*.json"))
    if len(reports) != 12:
        raise SystemExit(f"Expected 12 reports; got {len(reports)}")
    for path in reports:
        data = json.loads(path.read_text())
        if data.get("runtimeError"):
            raise SystemExit(f"Failed audit: {path.name}: {data['runtimeError']}")
        cells = [path.stem, *[display(category(data, c)) for c in ("performance", "accessibility", "seo")],
                 display(value(data, "largest-contentful-paint")), display(value(data, "total-blocking-time")),
                 display(value(data, "cumulative-layout-shift"), 3), display(value(data, "first-contentful-paint"))]
        print("| " + " | ".join(cells) + " |")
    print("Field LCP, INP, CLS: unavailable until sufficient real-user data appears in CrUX/Search Console.")
if __name__ == "__main__":
    main()
