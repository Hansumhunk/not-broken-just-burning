# NBJB Engagement Architecture

Version 0.6 establishes how Not Broken Just Burning turns a one-time visitor into a returning participant without pretending that unfinished infrastructure already exists.

## Current engagement loop

```text
DISCOVER
  ↓
READ / RECOGNIZE
  ↓
REFLECT
  ↓
USE A TOOL
  ↓
CHOOSE A NEXT STEP
  ↓
WALK THE PATH
  ↓
JOIN / PARTICIPATE
  ↓
RETURN
```

## Join means participation, not enrollment

The current Join page must not imply that:

- a visitor created an account
- NBJB stored their identity
- they entered a certification program
- they joined a therapeutic group
- they owe loyalty to a founder, leader, or organization
- they are receiving email updates when no email backend exists

A Flamewalker is a movement identity for someone doing the work of reclamation. It is not a rank or credential.

## Current engagement features

- Join the Movement page
- optional browser-only Flamewalker commitment
- site-wide Join navigation
- site-wide Support & Safety link
- site-wide Privacy & Data Use link
- clear return paths from stories to tools and from tools to the Path
- explicit disclosure that email updates are not active yet

## Email/newsletter integration requirements

Do not add a functioning email signup form until a real provider is selected and the following are defined:

1. what fields are collected
2. why each field is needed
3. consent language
4. unsubscribe process
5. retention/deletion behavior
6. provider privacy terms
7. whether double opt-in is used
8. how spam/bot submissions are handled
9. what appears in the Privacy & Data Use page
10. how email content is kept separate from sensitive reflection-tool entries

NBJB should never send the contents of Forge, Pattern Map, Check-In, Boundary Builder, One Stone, or similar reflection tools into the newsletter system by default.

## Contact architecture requirements

A future contact form should define separate reasons for contact, such as:

- general questions
- speaking/media
- collaboration
- technical/site feedback
- business inquiries

The contact page must clearly state that it is not monitored as a crisis channel and should route urgent safety concerns to Support & Safety instead.

## Safety boundary

NBJB is educational and reflective. It is not crisis response, diagnosis, treatment, legal representation, or proof of motive/abuse/wrongdoing.

The Support & Safety page should remain easy to reach from every page.

## Privacy default

Collect less. Explain more.

Current interactive tools are deliberately client-side and should remain that way unless there is a clear, reviewed reason to store user entries.

## Pre-launch engagement checklist

- [ ] Select real email/newsletter provider
- [ ] Update Privacy & Data Use for that provider
- [ ] Add working signup with clear consent
- [ ] Test unsubscribe flow
- [ ] Add non-crisis contact channel
- [ ] Test Support & Safety links
- [ ] Review every CTA for truthful wording
- [ ] Confirm no private journal/legal content is exposed
- [ ] Confirm no third-party private names appear unintentionally
