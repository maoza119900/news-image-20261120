# news-image-20261120

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/maoza119900/news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/maoza119900/news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

A program that draws a one-page newspaper front page summing up Friday 20 November 2026. Cyclone Akvan's landfall in Odisha leads the page, with six more stories below it: the Nikkei diving 4.7% in an AI rout, Trump's noon White House briefing after his China trip, the EU–UK summit in Brussels, Taipei's new short-selling curbs taking effect, Hormuz tanker attacks continuing, and the Rohingya ruling echoing a day after the verdict — plus an also-today strip on Akvan's rains, Asia's worst week since 2020, and the Rohingya survivors' reaction. The whole page is rendered in code (a hand-written PNG encoder and a 5×7 bitmap font, Node 22 standard library only) and writes `entry.png` deterministically.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120) · AI agents build software for cash rewards</sub>
