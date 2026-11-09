# Penny — a voice AI money assistant (hackathon demo)

An iPhone simulator running a banking app with **Penny**, a voice assistant you can talk to about your money. It runs on Claude with tool use, and the forecasts are calculated in code.

## Run it

```bash
npm install
cp .env.example .env      # then paste your ANTHROPIC_API_KEY
npm start                 # → http://localhost:3000
```

Use **Chrome or Edge** on a laptop because speech recognition needs it. Allow microphone access when the browser asks. Safari works too, and in Firefox you can type instead of talking.

**Demo tip:** use headphones and turn on **⋯ → Interrupt by voice**. Then you can talk over Penny as you would with Siri. Without headphones her mic is closed while she speaks, so she can't hear herself. Tap the orb to interrupt her.

## What's in it

| Feature | Where |
|---|---|
| Floating **Penny** button opens a 352px call panel over the dashboard | `penny.js` |
| Animated orb with idle / listening (reacts to your mic) / thinking / speaking states | `penny.js` → `drawOrb` |
| Start/end call, mute, minimise to the **Dynamic Island** with a live call timer | `penny.js` |
| Live subtitles: your words as you speak, and Penny's words highlighted as she says them | `penny.js` |
| Typed input, suggested questions, larger text (Aa), expandable conversation history | `index.html` / `penny.js` |
| Real LLM (Claude) with tools and the full conversation kept as context | `server.js` (`/api/chat`) |
| **Financial time travel**: forecasts from bills, salary, essentials ±20% and the buffer | `data.js` → `forecast()` |
| Live forecast chart: expected line, what-if line, likely range, buffer, payday, assumptions | `app.js` → `renderForecast` |
| Scenarios are previews only and never change the real balance | `state.scenario` is separate from `Bank.accounts` |
| Penny drafts an email to a provider → you edit it → you or Penny send it after you confirm | `draft_email` / `send_email` tools |
| **Post-call action cards**: email the summary, add tasks to Reminders, email the provider (or book a callback) | `/api/wrapup` + `renderPostCall` |
| Optional ElevenLabs voice (`ELEVENLABS_API_KEY`) | `server.js` → `/api/tts` |

### Claude's tools
`run_forecast`, `clear_forecast_scenario`, `get_transactions`, `plan_savings_goal`, `set_minimum_buffer`, `draft_email`, `send_email`, `add_reminders`, `show_screen`.

Claude also gets a live JSON snapshot of the account. It includes balances, bills, salary dates, the pay-cycle and week-on-week comparisons, subscriptions, a ranked list of **financial pressures** and the baseline forecast. That lets Penny give specific, accurate answers, such as "what's stressing me most?" → the energy bill that rose 41%.

## New in v2
- **16 languages with real speech**: English, Spanish, Arabic, French, Polish, Urdu, Hindi, Punjabi, Bengali, Chinese, Portuguese, Romanian, Italian, German, Turkish and Welsh. Penny switches listening, voice and replies, either from Settings or when you start talking in another language. In the browser, she can only speak a language your computer has a voice for. On a Mac, add voices in System Settings → Accessibility → Spoken Content → System voice → Manage Voices. With ElevenLabs, every language works.
- **Matches the user**: there are four demo people (Leen 27, Margaret 74, Jayden 17, Amira 34) and an "About you" form. Penny's tone, pace and examples adapt to each person.
- **Voices and personality**: choose a female or male voice, a specific voice, a style (warm, calm, upbeat, funny or straight-talking) and a speed. You can also type a custom personality, such as "friendly bestie" or "wise grandparent".
- **Strictly money-only**: anything else gets a short "that's not really my business" and a steer back to money.
- **Upload a bill** (📄 Bill button, photo or PDF): Penny reads it and shows a plain-language breakdown card in your language, then explains it out loud.
- **Benefits checker**: rule-based screening for around 25 UK benefits, discounts and bonuses (2025/26 rates). The rules are in code so the AI can't invent amounts. Try Margaret or Amira.
- **Money skills**: 8 lessons with quizzes based on NatWest guides, with XP. Penny can also quiz you out loud.
- **Personal banner**: shows rotating "Penny noticed" spending alerts worked out from your data.

## A 2-minute demo script

1. Tap **Penny** and the green call button. Ask: *"Can I afford a £200 trip?"*
   The chart shows a pink what-if line. Penny explains that £1,250 minus about £1,000 reserved leaves £250, the trip would leave £50, and that's under the £100 buffer. Then she offers options.
2. *"What if my salary is three days late?"* The rent on the 1st now lands before payday, and the chart dips into the overdraft.
3. *"What's stressing my budget the most?"* Penny names the Bright Energy price rise.
4. *"Can you email them and ask if they can lower it?"* An editable draft opens. Change a word, then say *"Yes, send it"*, and a toast confirms it was sent.
5. *"What's the weather?"* Penny politely steers you back to money.
6. End the call. The post-call card appears: **Send summary to email**, **Add tasks to Reminders**, **Email Bright Energy**.

## Notes
- The default model is `claude-opus-5-5` at `low` effort. Set `PENNY_MODEL=claude-haiku-5-5` for the lowest voice latency.
- Server-side refusal fallback (`fallbacks: "default"`) is on, so a declined request is retried on another model.
- All data is fictional and generated relative to today's date, so the demo always looks current.
