# NBJB Analytics Policy

## Purpose

The analytics layer exists to answer a small set of editorial and operational questions:

- How many visitors reach the public site each day?
- How many pageviews does the site receive?
- Which pages and lesson tracks attract attention?
- Which public resources receive little or no use?
- Which referrers or broad traffic sources bring people to NBJB?

It is not intended to identify individual visitors or inspect the contents of private reflection fields.

## Provider

PostHog Cloud, using the public website project **NBJB Website Analytics**.

## Production collection profile

- Cookieless mode: always
- Server hash mode: stateless
- Raw IP retention: disabled
- Person identification: disabled / anonymous only
- Interaction autocapture: disabled
- Pageview capture: enabled
- Session replay: disabled
- Heatmaps: disabled
- Automatic exception capture: disabled
- Console-log capture: disabled
- Performance/network capture: disabled
- Surveys: disabled
- Browser privacy signals: Global Privacy Control and Do Not Track skip analytics loading
- Host scope: notbrokenjustburning.com and www.notbrokenjustburning.com only

## Reflection-content boundary

The Forge, Flame Check-In, Pattern Map, Boundary Builder, One Stone Planner, Flamewalker commitment, and similar tools remain client-side. Do not add analytics calls that send textarea/input values, generated reflection text, clipboard contents, email contents, medical/legal details, or other sensitive user-entered material.

## Editorial use

Use aggregate page-level analytics to improve information architecture, prioritize content, and find neglected material. A page with low traffic may need better internal linking, clearer naming, or may simply serve a narrow audience. Traffic alone is not a measure of truth, quality, or human value. Humanity has already produced enough dashboards pretending otherwise.

## Change control

Any future expansion beyond aggregate pageview analytics should update:

1. this policy
2. privacy.html
3. README.md
4. the static-site validation guardrails

before or alongside the code change.
