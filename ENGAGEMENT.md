# NBJB Engagement Architecture

Version 0.7 continues the engagement architecture by adding a real public contact channel and launch validation without pretending unfinished subscriber infrastructure already exists.

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
CONTACT / RETURN
```

## Join means participation, not enrollment

The current Join page must not imply that:

- a visitor created an account
- NBJB stored their identity
- they entered a certification program
- they joined a therapeutic group
- they owe loyalty to a founder, leader, or organization
- they are receiving newsletter updates when no subscriber backend exists

A Flamewalker is a movement identity for someone doing the work of reclamation. It is not a rank or credential.

## Current engagement features

- Join the Movement page
- optional browser-only Flamewalker commitment
- site-wide Join navigation
- site-wide Contact, Support & Safety, and Privacy & Data Use routes
- clear return paths from stories to tools and from tools to the Path
- official public contact inbox: `notbrokenjustburning@gmail.com`
- explicit disclosure that newsletter signup is not active yet

## Public contact architecture

The official inbox is:

**notbrokenjustburning@gmail.com**

The public Contact page routes:

- general questions
- speaking, media, and collaboration inquiries
- technical/site feedback

The Contact page clearly states that the inbox is not continuously monitored and is not an emergency, crisis, medical, legal, or domestic-violence response channel.

Email contact is **not** newsletter consent. A person who sends one message must not be silently enrolled in marketing or update emails.

## Email/newsletter integration requirements

Do not add a functioning newsletter signup form until a real provider is selected and the following are defined:

1. what fields are collected
2. why each field is needed
3. consent language
4. unsubscribe process
5. retention/deletion behavior
6. provider privacy terms
7. whether double opt-in is used
8. how spam/bot submissions are handled
9. what appears in the Privacy & Data Use page
10. how subscriber data is kept separate from sensitive reflection-tool entries and ordinary contact email

NBJB should never send the contents of Forge, Pattern Map, Check-In, Boundary Builder, One Stone, or similar reflection tools into the newsletter system by default.

## Safety boundary

NBJB is educational and reflective. It is not crisis response, diagnosis, treatment, legal representation, or proof of motive/abuse/wrongdoing.

The Support & Safety page should remain easy to reach from every page.

## Privacy default

Collect less. Explain more.

Current interactive tools are deliberately client-side and should remain that way unless there is a clear, reviewed reason to store user entries.

Ordinary contact email is processed through Gmail/Google and is documented separately from browser-only reflection tools.

## Pre-launch engagement checklist

- [ ] Select real email/newsletter provider
- [ ] Update Privacy & Data Use for that provider
- [ ] Add working signup with clear consent
- [ ] Test unsubscribe flow
- [x] Add non-crisis contact channel
- [x] Document contact-email privacy behavior
- [ ] Test Support & Safety links across final deployed site
- [ ] Review every CTA for truthful wording
- [ ] Confirm no private journal/legal content is exposed
- [ ] Confirm no third-party private names appear unintentionally
