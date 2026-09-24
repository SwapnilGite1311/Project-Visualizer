# MVP user testing plan

## Goal

Find out, with 15–20 real users working on real code:

1. Can people understand an unfamiliar Python project faster with Project Visualizer than without it?
2. Do **Explain this** and **What breaks if I change this?** help, and do people trust them?
3. Would they pay for it, and how much?

## Participants

15–20 people in total:

| Group | Minimum | Why |
| --- | --- | --- |
| AI-assisted builders (use Cursor, Claude, Copilot, Lovable… to write most of their code) | 8 | The main target: they ship code they did not fully write. |
| Python data / ML people (notebooks, scripts, pipelines) | 4 | Large share of Python users; notebook support is new. |
| Experienced developers (3+ years, work on shared codebases) | 3 | Check that the map and impact analysis hold up for demanding users. |

Each participant brings a Python project of their own (or one they recently had to understand). Keep a spare open-source project ready for anyone who cannot share their code.

## Method

- 45-minute remote sessions (video call with screen sharing), one participant at a time, recorded with consent.
- Think-aloud: the participant says what they are thinking while working; the facilitator does not help unless the participant is stuck for more than 2 minutes (note it as a fail).
- One facilitator runs the session; a second person (if available) takes notes in `sessions-log.md` during the call.
- The participant installs the app from the real installer on their own machine (task 1). AI uses a key the team provides, so that cost is not a barrier.
- Script: `session-script.md`. Recruiting: `recruiting.md`.

## Tasks

1. **Install** the app from the installer link and start it.
2. **Open their own project** (folder, Git URL or snippet).
3. **Find the main entry**: "Where does this program start running?"
4. **Explain a confusing function**: pick a function they find hard to understand and get an explanation.
5. **Check what breaks before a change**: pick something they would like to change and find out what depends on it.
6. **Rate usefulness** from 1 (useless) to 5 (I need this) for: the map, Explain, What breaks?, Search, Insights.

## Metrics

- **Task success** per task: pass / pass with help / fail.
- **Time** per task (minutes, from the recording).
- **Usefulness ratings** (1–5) per feature, averaged per participant group.
- **Would-pay answers**: yes / no, and the monthly amount they name without prompting.
- Counts of confusion moments ("what does this mean?", long silences) per screen, to rank problems in `findings.md`.

## Incentive

Every participant gets an early-supporter lifetime discount on the paid plan, or a small gift card (their choice). Thank them by email within 24 hours and tell them when the next version ships.
