(() => {
  'use strict';

  // Separate member curriculum from the public Path overviews. This page is
  // available to a verified signed-in Flamewalker member, including Free.
  // Explicit Save is the only action that persists reflection text on device.
  const service = window.NBJBMemberService;
  const auth = window.NBJBAuth;
  if (!service || !auth?.user?.id) return;

  const stages = Object.freeze([
    {
      slug:'fire-reclamation',name:'Fire Reclamation',order:'01 · Name it',
      publicUrl:'path-fire-reclamation.html',
      lead:'Name what happened without allowing the event to make every decision about who you are next.',
      teaching:[
        {heading:'The event is not your identity',text:'When something painful takes over the story, it can begin answering questions it has no right to answer: Am I worthy? Can I trust anybody? Is this all I will ever be? Fire Reclamation starts by describing an event plainly. What happened and what changed belong on one line. The conclusion you drew about yourself belongs on another. Those lines can be related without being the same thing.'},
        {heading:'Survival habits can become expensive',text:'Staying hyper-alert, working harder, shutting down, or trying to control the next surprise may have helped you get through a difficult stretch. You can respect why a response developed and still ask whether it helps you now. You are not required to forgive, forget, or decide that the experience was somehow good.'},
        {heading:'Reclaim one piece of authority',text:'Your goal is not to solve the whole past. Choose one present decision that does not need to be handed over to the old event: where you put your attention, how you rest, what boundary you practice, or who gets access to your time. One observable action is more useful than a perfect explanation.'}
      ],
      deepDive:[
        {"heading":"When a story quietly becomes a verdict","text":"There are two different records after a painful chapter. One is the event record: what happened, when it happened, what changed, and what it cost. The other is a verdict that sometimes attaches itself to those events: “I was disposable,” “I can never trust again,” or “Everything I built was a lie.” The event record may describe genuine loss. The verdict reaches much further, claiming authority over your entire future.\n\nConsider a man whose marriage ends while he is trying to keep his work and fatherhood responsibilities steady. He can describe a separation, a changed schedule, financial pressure, and difficult conversations. Those things matter. But saying that he failed as a father or that every future relationship will end the same way takes a specific chapter and turns it into a universal sentence.\n\nWrite two headings: “What I can describe” and “What I started believing about myself.” You do not have to declare the second column false. For now, notice the difference between an observation and a belief that may deserve fresh examination."},
        {"heading":"A timeline is a tool—not a courtroom","text":"When experiences become tangled, memory often returns in fragments. One conversation brings up another, which brings up an earlier disappointment, until your mind is trying to solve several years at once. A simple timeline can help: before, during, and after. Name a few events in order, their observable consequences, and what information remains missing. You can leave gaps without filling them with guesses.\n\nUse five separate categories when needed: fact, evidence, feeling, interpretation, and unknown. “The conversation ended without an agreement” is not the same as “They never intended to listen.” The first may be observable. The second may feel persuasive, especially after repeated disappointment, but it is a broader conclusion.\n\nSeparating those categories does not require minimizing harm or ignoring patterns. It helps you identify what needs immediate action, what needs additional information, and what belongs in your private reflection rather than being treated as established fact. One accurately described event is a stronger foundation than a dramatic story that tries to explain everything."},
        {"heading":"Name the cost without making it your identity","text":"Costs can be concrete: missed time with a child, lost income, reduced sleep, strained health, damaged confidence, or an ability to relax that feels far away. Naming the cost matters because pretending it did not hurt makes it harder to understand what needs to change. But the cost is not the same as a permanent identity.\n\n“I lost confidence in that relationship” describes an injury. “I am incapable of loving well” describes the whole person. “I said something cruel and need to repair it” identifies behavior. “I am nothing but a bad man” makes the mistake an identity. Accountability asks you to own what you did and decide what to repair. It does not require erasing every other true thing about yourself.\n\nSome costs can be addressed with a plan. Others need time, support, or acceptance that you cannot reverse them. Fire Reclamation is not a promise that the past will be repaired. It is a refusal to keep adding an unnecessary identity sentence to a loss that is already difficult to carry."},
        {"heading":"The old alarm and the current room","text":"Under prolonged pressure, some people begin scanning constantly for the next problem. A delayed reply, a changed tone, an unfamiliar expense, or a quiet room can feel larger than it would have before. That attention may have served a protective purpose in a difficult period, but it can also make an ordinary present-day moment feel like a replay of the past.\n\nInstead of attacking yourself for having a strong reaction, investigate the immediate situation. What is happening in this moment? Is there an observable concern that needs action? What part of the intensity might come from an older experience? What information would help you tell the difference? A feeling deserves attention without automatically becoming the final explanation.\n\nFor a nonurgent situation, practice a short delay. Name the present fact, the feeling, and the action you could stand behind tomorrow. If there is an immediate threat, prioritize safety instead. If strong reactions repeatedly disrupt daily life, a qualified professional can offer support alongside this educational work."},
        {"heading":"Survival habits: useful skills or automatic commands?","text":"Some men become indispensable when life grows unpredictable. Others become silent, suspicious, constantly busy, fiercely independent, or unwilling to admit uncertainty. These habits may have helped them navigate real problems. The question is not whether the response once made sense. The question is whether it still serves their responsibilities and values today.\n\nWorking late can help protect a household during financial pressure. Working late every night because slowing down brings up grief has a different cost. Silence can prevent a needless argument. Silence in every safe relationship can make genuine connection almost impossible. Independence can be strength; refusing every offer of help can become an expensive form of isolation.\n\nChoose one survival habit you want to keep available as a tool rather than obey as a command. Ask: “When does this help me, and when does it start running my life?” Reclamation is not about becoming less capable. It is about gaining enough range to choose the response that fits the present situation."},
        {"heading":"Reclamation does not require forgiveness, revenge or a perfect explanation","text":"After a painful chapter, people may urge you to forgive, move on, turn it into a lesson, publicly expose everyone involved, or explain exactly what happened until others agree. None of those outcomes is a prerequisite for taking an honest next step. Sometimes an experience was simply harmful, and admitting that is more grounded than manufacturing a positive meaning for it.\n\nReclamation is different from making your entire future depend on another person admitting what you believe happened. Accountability, appropriate legal processes, and clear boundaries may still matter. Keep those in their proper places. Your rebuilding work also needs a part that does not depend on another adult's reaction.\n\nForgiveness, when someone chooses it, is not identical to reopening access, abandoning consequences, or pretending that no harm occurred. It is not a required assignment here. The nearer task is to decide what you can protect, repair, or change without surrendering the truth of your experience."},
        {"heading":"Case study: the provider who forgot he was a person","text":"A father keeps taking extra jobs after a relationship breakdown. The income helps stabilize the household, and the responsibility is real. Eventually he notices that working is also his way of avoiding grief. He can account for every invoice but struggles to answer a much simpler question: “What do I need when nobody needs me to solve something?”\n\nBoth truths matter. Providing can be honorable and necessary. It can also become a shield that leaves a man exhausted and disconnected from his own preferences. The appropriate response is not to abandon his obligations. It may be to protect a manageable period of rest, ask a friend for practical help, or decline a task that does not actually need to be his.\n\nThe reflection is not “Am I doing enough?” It is “What part of my worth have I been making conditional on being needed?” Identify one way to remain responsible without making usefulness the admission price for having a life of your own."},
        {"heading":"Case study: fatherhood under a changed routine","text":"Imagine a father whose parenting schedule has changed dramatically. He feels the loss of ordinary time with his child and a pressure to make every visit perfect. He may find himself replaying adult conflict when he most wants to be present. The past and its practical consequences matter, but the next available hour with his child is not helped by an endless mental argument.\n\nFire Reclamation asks him to separate what he can influence from what he cannot. He can make a simple plan, show up reliably, keep age-appropriate promises, and avoid asking his child to carry adult disputes. He cannot necessarily make another adult agree with his account of the past. He can handle legal obligations through the appropriate people without turning each parenting moment into another courtroom in his head.\n\nA useful question is: “What kind of father do I want my child to experience in the time we actually share?” An ordinary act of steady presence may be more meaningful than an impressive attempt to compensate for every minute that changed."},
        {"heading":"Case study: a setback that begins defining everything","text":"A man loses an important job, contract, or business opportunity. The immediate problem is serious: reduced income, unstable plans, and new obligations. Then the experience starts generating bigger statements: “I always fail,” “I am nobody without that work,” or “Trying again is pointless.” The facts require a plan; the global verdict does not help build one.\n\nMake three columns. In the first, list what changed and what deadlines are real. In the second, list the resources still available: skills, relationships, experience, equipment, and the ability to learn. In the third, put a first action that may make the situation even slightly more manageable. It could be a phone call, an expense review, or a conversation with someone who understands the industry.\n\nYou can grieve a setback and still have useful options. Reclamation begins when a genuine loss stops being treated as an exhaustive inventory of who you are."},
        {"heading":"Five core practices, now as choices you can repeat","text":"First, name one event plainly. Describe observable actions and consequences without claiming a motive you cannot know. Second, separate the cost from the verdict you made about yourself. You may have lost something important; that does not automatically mean you have lost your capacity to choose, care, work, or connect.\n\nThird, identify a survival response that activates when the old chapter comes back into view. Ask whether that response is protecting something real now or repeating an old rule automatically. Fourth, decide what the experience does not get to determine: perhaps how you treat a new person, when you rest, how you speak to your child, or whether you ask for help. Fifth, practice one form of release that does not require erasure: make a different decision while allowing the memory to remain part of your story.\n\nThese are not five badges to earn. A new setback may send you back to step one. The measure is not whether pain vanished; it is whether you gained even a little room between what happened and what you choose next."},
        {"heading":"A three-sentence exercise you can actually finish","text":"Before the longer questions below, try three sentences on paper or in one of the journal fields. Sentence one: “What happened was…” Keep the description concrete enough that you could understand it next month. Sentence two: “One cost I am still carrying is…” Name a real effect without turning it into a permanent judgment on your worth. Sentence three: “What this does not get to decide about me is…” Pick a choice within your control.\n\nFor example: “The relationship ended and my daily routine changed.” “I have lost sleep and have been questioning my judgment.” “I will not treat every new connection as if it must end in the same way.” These statements do not settle every disputed detail or require you to feel better immediately. They give you something accurate and usable from which to act.\n\nIf three sentences are too much today, start with one. Accuracy matters more than eloquence. The lesson is meant to leave you more oriented, not overwhelmed by an obligation to retell your entire history."},
        {"heading":"Integration: carry one decision into the next seven days","text":"Choose one moment when the old story tends to take over: receiving an unexpected message, hearing criticism, looking at money, being alone after a long workday, or noticing that someone has not responded. Decide in advance on one small action that reflects the person you are choosing to become. You might pause before responding, write the present facts before drawing conclusions, protect a short period of rest, or ask a trusted person for support.\n\nWhen you look back at the week, do not grade your healing. Ask whether the action was realistic, what you observed, and whether you want to repeat it or make it smaller. Discovering that a goal was too ambitious is information, not proof that you failed. A workable action is one you can actually perform under ordinary pressure.\n\nFire Reclamation does not deny the fire. It refuses to hand that fire every vote about the future. Name what happened. Respect what it cost. Keep the truth. Reclaim the next decision."},
      ],
      questions:[
        {label:'What happened that I am ready to describe plainly?',hint:'Start with observable events and consequences. You do not have to write every detail.'},
        {label:'What did it cost me, and what conclusion about myself may I have attached to that cost?',hint:'For example, losing trust is different from being incapable of trusting.'},
        {label:'What is one part of my future that this event does not get to decide?',hint:'Name a choice you can actually influence, not something another person must do.'}
      ]
    },
    {
      slug:'guardian',name:"The Guardian's Path",order:'02 · Protect',
      publicUrl:'path-guardian.html',
      lead:'Protect what matters through steady choices and boundaries—not control over another person.',
      teaching:[
        {heading:'A boundary governs your behavior',text:'A boundary is not “You must stop being difficult.” It is “If the conversation becomes insulting, I will pause it and return when we can speak respectfully.” The difference matters: one attempts to command somebody else, while the other defines the action you can take. Clear boundaries make responsibility visible without demanding obedience.'},
        {heading:'The Guardian Code is a conduct test',text:'Trust, Honor, Respect, Honesty, and Loyalty are not weapons or loyalty tests. Ask whether your own response earns trust, protects dignity, stays truthful, and serves what is real. Loyalty is not a requirement to surrender safety or self-respect. A Guardian can protect without possessing, disagree without humiliating, and say no without cruelty.'},
        {heading:'Steadiness is part of protection',text:'Before answering a heated message or entering a predictable argument, identify what actually needs a response now. A delay can be responsible when it protects judgment. A limit is useful only if you can carry it out safely and consistently—not if it is a threat you cannot or should not enforce.'}
      ],
      deepDive:[
      {
            "heading": "The difference between a boundary and a threat",
            "text": "A useful boundary defines what you will do to protect your safety, time, dignity, or responsibilities. A threat tries to force somebody else's behavior by promising punishment. They can sound similar in an argument, but they lead to very different patterns. “I will end this call if insults continue” describes a choice within your control. “You will regret speaking to me that way” escalates the conflict without stating a workable limit.\n\nTry writing the behavior, your line, and the action you can safely take. Then ask if you can actually follow through. If the action depends on controlling someone else, rewrite it until it belongs to you."
      },
      {
            "heading": "The Guardian Code under pressure",
            "text": "Trust, Honor, Respect, Honesty, and Loyalty matter most when you're activated, not only when life is peaceful. Imagine receiving a message you consider unfair. You might be tempted to respond with every accusation you've held for months. The code offers another standard: preserve the message, address the practical issue, communicate the relevant facts, and decide what really needs a response.\n\nThat is not weakness or pretending the message was acceptable. It is choosing conduct you can still stand beside tomorrow. Loyalty to a person should never require abandoning honesty, safety, or a child's well-being."
      },
      {
            "heading": "Practice protection without permanent armor",
            "text": "A boundary that protects you can create room for connection; permanent suspicion often closes that room entirely. Choose one setting in which you are over-explaining, over-accommodating, or over-defending. What would a shorter and more respectful limit sound like? What would you do if the limit were ignored? What would you do if the other person respected it?\n\nBoth outcomes give useful information. You are practicing discernment rather than assuming every relationship is dangerous or every request must be granted. The practical result is steadiness: a line you understand, a response you control, and room to reassess when new information arrives."
      }
],
      questions:[
        {label:'What specific behavior is crossing one of my limits?',hint:'Describe an observable action, not a judgment about somebody’s character.'},
        {label:'What boundary would describe my own response instead of trying to control theirs?',hint:'Try an “If X happens, I will do Y” statement.'},
        {label:'Which Guardian value do I want my next response to demonstrate?',hint:'Trust, honor, respect, honesty, loyalty, or a combination.'}
      ]
    },
    {
      slug:'sacred-mirror',name:'Sacred Mirror Work',order:'03 · Examine',
      publicUrl:'path-sacred-mirror.html',
      lead:'Examine your choices without turning accountability into an attack on your worth.',
      teaching:[
        {heading:'Observation is not interpretation',text:'“A message went unanswered” describes an event. “They wanted to humiliate me” describes an interpretation. Your feeling about an event may be intense and important, but it does not automatically settle every unknown. Separating fact, feeling, interpretation, and unknown creates room to make a decision with clearer eyes.'},
        {heading:'Accountability is behavioral',text:'You can acknowledge a harsh response, a broken promise, or a boundary you failed to hold without deciding that your whole identity is defective. Accountability asks what you did and what repair might be possible. Shame says you are nothing but the mistake. The first can lead to action; the second tends to keep you stuck.'},
        {heading:'Look for a standard you can live by',text:'Imagine someone you care about made the same mistake under similar stress. Would you insist their entire future be defined by it? Apply a fair standard to yourself. Then name a change you can actually practice—without taking responsibility for another person’s behavior.'}
      ],
      deepDive:[
      {
            "heading": "A useful mirror has four columns",
            "text": "Imagine a man who sees an unanswered message and immediately thinks he is being deliberately ignored. In a four-column exercise, the observation is that the message is unanswered. The feeling might be hurt or anger. The interpretation is that the silence was intentional. The unknown is what happened on the other end. The feeling matters, but none of these four categories should be swapped for another.\n\nThis practice protects you from two extremes: dismissing your instincts entirely or treating your first interpretation as a final verdict. It also makes any later conversation clearer because you can name what you actually experienced."
      },
      {
            "heading": "Responsibility without swallowing another person's choices",
            "text": "After a conflict, self-reflection can become self-punishment. You may notice one thing you handled poorly and then take responsibility for the entire relationship. Or you may feel so wronged that you cannot examine your own behavior at all. Both shortcuts steal the chance to learn.\n\nTry naming one action you own, one action that another person owns, and one consequence that remains uncertain. Then ask what repair or adjustment is actually available to you. Accountability works best when the assignment is precise: an apology, a clearer boundary, a changed routine, or a decision not to repeat the same reaction."
      },
      {
            "heading": "Replace shame sentences with behavioral commitments",
            "text": "“I always ruin everything” does not tell you what to do differently. “When I am overwhelmed, I interrupt before listening” identifies a pattern that can be practiced and changed. One is a broad identity attack; the other names a behavior.\n\nChoose a sentence you repeat when you feel ashamed. Rewrite it as an observation and an action without excusing harm. For instance, “I withdrew when I should have said I needed a pause; next time I will explain that I am taking twenty minutes and return when I said I would.” This is the difference between using the mirror as a weapon and using it as a tool."
      }
],
      questions:[
        {label:'What did I directly observe, and what meaning did I add afterward?',hint:'Separate a fact from an assumption; include an unknown if one remains.'},
        {label:'What part of my own response can I take responsibility for without accepting blame for everything?',hint:'Be specific about behavior, not identity.'},
        {label:'What would an honest repair or healthier choice look like next time?',hint:'Think of something within your control.'}
      ]
    },
    {
      slug:'masculine-restoration',name:'Masculine Restoration',order:'04 · Rebuild',
      publicUrl:'path-masculine-restoration.html',
      lead:'Rebuild direction and strength without making work, invulnerability, or control your entire identity.',
      teaching:[
        {heading:'The collapse of a role is not the loss of a man',text:'A job, a relationship, a daily parenting routine, or the ability to provide in the old way may change without your worth disappearing. When the familiar role falls apart, the temptation is to work twice as hard or become impossible to reach. Restoration asks what kind of strength still serves you under the conditions you actually have.'},
        {heading:'Six practical anchors',text:'Steadiness, direction, strength with restraint, protection with boundaries, responsibility with self-respect, and brotherhood with connection are behaviors to practice—not a masculinity score. You do not have to master all six today. Identify the anchor under greatest strain and one everyday action that would make it more reliable.'},
        {heading:'Choose responsibility without self-punishment',text:'An honest rebuilding plan leaves room for limits, rest, and help. Providing is meaningful, but it is not the price of belonging. Leadership involves owning your actions and asking for what is necessary, not hiding every need behind an image of toughness.'}
      ],
      deepDive:[
      {
            "heading": "Rebuilding after the provider identity cracks",
            "text": "A man can lose work, a relationship, or the daily routine that once made him feel useful. It may seem that his identity has disappeared with the role. Restoration begins by separating what he contributed from what he is worth. His skills, judgment, loyalty, ability to learn, and capacity for care are not erased by a change in circumstances.\n\nWrite down one role that has changed, one value that remains, and one practical contribution you can make this week. The third item need not be impressive. Reliability in an ordinary task is often a stronger foundation than an ambitious promise made to escape shame."
      },
      {
            "heading": "The six anchors in ordinary behavior",
            "text": "Steadiness is the pause between activation and response. Direction is knowing what deserves attention rather than chasing every crisis. Strength with restraint is being capable of force without needing to display it. Protection with boundaries is caring for what matters without taking ownership of another adult. Responsibility with self-respect means making repair without humiliation. Brotherhood is being able to give and receive support.\n\nThese anchors should produce observable conduct. Instead of telling yourself to be more disciplined, name a repeatable behavior: check the calendar before agreeing, call a friend once a week, take a walk before replying, or ask for one clear adjustment to a schedule."
      },
      {
            "heading": "From old armor to useful strength",
            "text": "Armor has a place. Emotional shutdown, nonstop work, and extreme self-reliance may have helped a man keep functioning in hard conditions. But habits designed for survival do not always belong in every relationship, home, or conversation. You can be a protector and still need rest. You can lead and still admit that you lack information.\n\nPick one situation in which your strongest habit becomes costly. What does it protect? What does it prevent? Then choose an alternative response you can practice safely. Restoration is not a return to an old performance of masculinity. It is building a more flexible, responsible version that can carry real weight without losing connection."
      }
],
      questions:[
        {label:'Which role or identity has felt unstable, and what value of mine remains even if that role changes?',hint:'Separate the role from the person doing it.'},
        {label:'Which of the six anchors most needs attention now, and how is that showing up in my daily behavior?',hint:'Choose just one anchor rather than grading the whole person.'},
        {label:'What would one small act of strength with restraint look like this week?',hint:'Keep the action realistic and measurable.'}
      ]
    },
    {
      slug:'voice-of-fire',name:'Voice of Fire',order:'05 · Speak',
      publicUrl:'path-voice-of-fire.html',
      lead:'Recover a truthful voice without mistaking intensity for clarity or confrontation for courage.',
      teaching:[
        {heading:'Expression and persuasion are different',text:'You may have learned to stay silent to avoid punishment, or to explain yourself for hours in the hope someone would finally agree. Voice of Fire invites a third option: state your experience and your needs clearly, while accepting that you cannot control whether another person agrees. An honest sentence does not require a courtroom-length defense.'},
        {heading:'Truth should survive the next morning',text:'The strongest communication is often shorter, calmer, and more precise than emotional discharge. Ask what belongs to you to say, what is fair and accurate, and what audience needs to hear it. Privacy can protect integrity. Not every story should become a public post, and not every conflict requires another confrontation.'},
        {heading:'Practice a sentence you can stand beside',text:'A usable statement often includes an observation, a feeling or need, and a specific request or limit. If sharing would create danger, practice privately or seek appropriate support instead. Reclaiming voice includes the right to pause, write, or decide not to engage.'}
      ],
      deepDive:[
      {
            "heading": "Choose whether the goal is expression, agreement, or relief",
            "text": "You may rehearse a conversation because you want to be understood. You may want the other person to admit something, or you may simply want the pressure inside you to stop. Those are different goals. Before speaking, identify which one is driving your words. The other person may disagree even when your statement is accurate, and you cannot make agreement a condition of your self-respect.\n\nTry beginning with a description and a request rather than a verdict: “I noticed we have not discussed this concern. I would like us to choose a time to do that.” This keeps your voice connected to an action you can influence."
      },
      {
            "heading": "Truth and timing belong in the same decision",
            "text": "An accurate statement can still be delivered at a time, place, or volume that makes the outcome worse. Posting publicly during an argument may create lasting consequences unrelated to the issue you wanted addressed. Speaking in front of children, during an unsafe confrontation, or while intensely activated can also turn a valid need into an unproductive fight.\n\nAsk whether the truth is yours to tell, whether the audience needs it, and whether your delivery matches your values. Sometimes the strongest use of a reclaimed voice is writing privately, documenting cleanly, delaying a response, or saying a short boundary without an explanation tour."
      },
      {
            "heading": "The two-sentence practice",
            "text": "Write the full version of what you want to say, then underline the concrete observation and the actual request. Reduce those to two sentences. Sentence one names what you experienced without assuming motive. Sentence two describes what you need or will do next. The rest can stay in your private notebook if it is not necessary for the conversation.\n\nFor example: “When our plans changed without discussion, I felt unprepared.” “For future changes that affect me, I need a message before the deadline whenever possible.” You can remain firm without rehearsing every injury. Voice of Fire is not about winning the loudest argument. It is about speaking with enough accuracy and restraint to protect what you mean."
      }
],
      questions:[
        {label:'What is something important I have wanted to say but have not said clearly?',hint:'Name your experience or need without assigning a hidden motive to someone else.'},
        {label:'Am I trying to express myself, persuade someone, or release pressure—and how does that change my words?',hint:'A clear intention makes a stronger statement.'},
        {label:'What is a shorter, more grounded version of what I want to communicate?',hint:'Try two or three sentences you could stand beside tomorrow.'}
      ]
    },
    {
      slug:'circle-of-flame',name:'Circle of the Flame',order:'06 · Connect',
      publicUrl:'path-circle-of-the-flame.html',
      lead:'Build belonging without disappearing into rescuing, performance, or dependence.',
      teaching:[
        {heading:'Connection should leave room for two people',text:'After betrayal or isolation, closeness can feel risky. The answer is neither instant trust nor permanent armor. Healthy connection develops through repeatable conduct, clear agreements, and the freedom to disagree. Belonging is not worth much when the price is silence or self-erasure.'},
        {heading:'Trust grows in layers',text:'You do not need to give a new person every private detail to be honest. Notice whether they respect a small no, handle disagreement without humiliation, keep ordinary commitments, and allow you to have other relationships. Consistency over time provides better information than quick declarations of loyalty.'},
        {heading:'Participation is not rescuing',text:'Helping friends and community can be meaningful. Yet if every conversation makes you the fixer, referee, or emotional container, you may be repeating an old role. Choose a small act of connection where you can offer something authentic without taking ownership of another adult’s life.'}
      ],
      questions:[
        {label:'Where do I feel most able to be myself without performing or earning my place?',hint:'Consider a person, group, or situation and what makes it feel different.'},
        {label:'What signals would tell me that trust is growing at a healthy pace?',hint:'Look for observable conduct and respect for limits.'},
        {label:'Where am I over-giving or withdrawing, and what balanced connection could I try instead?',hint:'One small invitation, boundary, or honest check-in is enough.'}
      ]
    }
  ]);

  const bySlug = Object.fromEntries(stages.map(item => [item.slug,item]));
  const slug = new URLSearchParams(location.search).get('stage') || '';
  const chapter = Object.prototype.hasOwnProperty.call(bySlug,slug) ? bySlug[slug] : null;
  const byId = id => document.getElementById(id);
  const set = (id,text) => { const element=byId(id); if(element) element.textContent=text; };
  if (!chapter) { byId('path-stage-error').hidden=false; return; }
  byId('path-stage-content').hidden=false;

  // Render only approved static curriculum using textContent. Never inject
  // user answers into HTML or publish them to the repo, analytics, or API.
  set('path-stage-heading',chapter.name + '. Your work starts here.');
  set('path-stage-subtitle','The member experience: understand the lesson, reflect on your real situation, and choose a next action.');
  set('path-stage-title',chapter.name);
  set('path-stage-order',chapter.order);
  set('path-stage-lead',chapter.lead);
  byId('path-stage-public-link').href=chapter.publicUrl;
  const next=stages[(stages.findIndex(item=>item.slug===slug)+1)%stages.length];
  byId('path-stage-next-link').href='member-path-stage.html?stage='+encodeURIComponent(next.slug);
  byId('path-stage-next-link').textContent='Next: '+next.name+' →';

  function make(tag,text,className) {
    const node=document.createElement(tag);
    if (text!==undefined) node.textContent=text;
    if (className) node.className=className;
    return node;
  }
  // Mirror only the public, already published stage foundations. Bringing
  // those chapters into the Hub avoids downgrading the member experience.
  // This static source does not include private lesson manuscripts or answers.
  const foundation=window.NBJBPathFoundations?.[slug]?.blocks || [];
  const foundationsNode=byId('path-stage-foundation-blocks');
  foundation.forEach(block=>{
    const node=make(block.kind==='heading'?'h3':block.kind==='quote'?'blockquote':'p',
      block.text,block.kind==='heading'?'path-stage-foundation-heading':
        block.kind==='quote'?'path-stage-foundation-quote':'path-stage-foundation-prose');
    foundationsNode.append(node);
  });
  const depth=Array.isArray(chapter.deepDive)?chapter.deepDive:[];
  const teaching=byId('path-stage-teaching-blocks');
  [...chapter.teaching, ...depth].forEach((section,index)=>{
    const block=make('section',undefined,'path-stage-teaching-block');
    block.id='path-stage-teaching-'+(index+1);
    block.append(make('h3',section.heading));
    String(section.text||'').split(/\n\s*\n/).filter(Boolean).forEach(text=>
      block.append(make('p',text)));
    teaching.append(block);
  });
  const questions=byId('path-stage-questions');
  const fields=chapter.questions.map((item,index)=>{
    const row=make('div',undefined,'path-stage-question');
    const label=make('label',(index+1)+'. '+item.label);
    const textarea=make('textarea');
    textarea.id='path-stage-answer-'+(index+1);
    textarea.name='reflection-'+(index+1);
    textarea.rows=3;
    textarea.maxLength=1200;
    textarea.placeholder='My answer, in my own words…';
    label.htmlFor=textarea.id;
    const hint=make('p',item.hint);
    row.append(label,hint,textarea);
    questions.append(row);
    return {item,textarea};
  });
  const stateSelect=byId('path-stage-progress');
  const focusButton=byId('path-stage-set-focus');
  function refreshFocus() {
    const state=service.load();
    const selected=state.journey.focus===chapter.name;
    set('path-stage-focus-caption',selected?'Current focus on your Dashboard':'Exploring this stage does not change your current focus.');
    focusButton.textContent=selected?'Current focus selected':'Set as my current focus';
    focusButton.disabled=selected;
    stateSelect.value=state.journey.progress[chapter.name]||'not-started';
  }
  refreshFocus();
  const status=byId('path-stage-result');
  stateSelect.addEventListener('change',()=>{
    const result=service.setStageProgress(chapter.name,stateSelect.value);
    status.textContent=result.ok?'Practice status updated on this device.':'Your browser blocked saving the practice status.';
    refreshFocus();
  });
  focusButton.addEventListener('click',()=>{
    const result=service.setFocus(chapter.name);
    status.textContent=result.ok?'This stage is now your current focus on the Dashboard.':'Your browser blocked saving the current focus.';
    refreshFocus();
  });
  function answers(){
    return fields.map(({item,textarea},index)=>({
      index:index+1,prompt:item.label,response:String(textarea.value||'').trim()
    })).filter(entry=>entry.response);
  }
  function buildJournal(){
    const journal=answers();
    const small=String(byId('path-stage-next-action').value||'').trim();
    if(!journal.length&&!small)return null;
    const full=[
      'FLAMEWALKER · MY PATH REFLECTION',
      chapter.name.toUpperCase(),
      '',
      ...journal.flatMap(item=>[item.index+'. '+item.prompt,item.response,'']),
      ...(small?['MY NEXT SMALL ACTION',small,'']:[]),
      'Saved intentionally in My Work on this device.'
    ].join('\n');
    return {journal,small,full};
  }
  function savedHistory(){
    const entries=service.listEntries('Path Reflection').filter(entry=>entry.data?.stageKey===slug);
    set('path-stage-last-saved',entries.length
      ? 'You have '+entries.length+' saved Path reflection'+(entries.length===1?'':'s')+
        ' for this stage in My Work on this browser. You can return to any of them.'
      : 'No Path reflection for this stage has been saved in My Work on this device yet.');
  }
  savedHistory();
  // The Save action is explicit: neither typing nor opening a stage creates a
  // journal entry, modifies the selected stage, or marks the stage practiced.
  byId('path-stage-form').addEventListener('submit',event=>{
    event.preventDefault();
    const result=buildJournal();
    if(!result){
      status.textContent='Add at least one reflection or one small action before saving.';
      return;
    }
    const record=service.recordToolEntry('Path Reflection',{
      title:chapter.name+' · Guided Reflection',
      summary:result.journal.length+' of '+chapter.questions.length+
        ' guided questions answered'+(result.small?' · next action included':'')+'. Open for the full entry.',
      tags:['Flamewalker','My Path',chapter.name],
      data:{
        stageKey:slug,stageName:chapter.name,
        worksheet:result.full,
        journalEntries:[
          ...result.journal.map(item=>({prompt:item.prompt,response:item.response})),
          ...(result.small?[{prompt:'One small action I can control next',response:result.small}]:[])
        ],
        smallAction:result.small
      }
    });
    if(!record.ok){
      status.textContent='Your browser could not save this reflection. Copy your work before leaving this page.';
      return;
    }
    if(byId('path-stage-update-next-action').checked&&result.small){
      const actionUpdate=service.update({journey:{nextAction:result.small}});
      status.textContent=actionUpdate.ok
        ? 'Saved one Path Reflection in My Work and updated your Next Honest Action on the Dashboard.'
        : 'Saved your reflection in My Work, but the Dashboard action could not be updated.';
    }else{
      status.textContent='Saved one organized Path Reflection in My Work on this device. No action or progress was changed.';
    }
    byId('path-stage-open-work').hidden=false;
    savedHistory();
  });
  byId('path-stage-copy').addEventListener('click',async()=>{
    const journal=buildJournal();
    if(!journal){status.textContent='Write at least one answer or next action before copying.';return;}
    try {
      if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(journal.full);
      status.textContent='Copied the organized reflection. Paste it somewhere private if you want a separate copy.';
    }catch(_){
      status.textContent='Copy is unavailable in this browser. You can select your answers manually or choose Save to My Work.';
    }
  });
  // A saved journal remains in My Work; unsaved drafts are intentionally
  // cleared when the page is closed or refreshed rather than uploaded.
})();
