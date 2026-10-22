# SEO・AEO（検索エンジン／回答エンジン最適化）

検索結果と、AI の回答（Google の AI Overviews・AI Mode、ChatGPT 検索、Copilot、Perplexity、Claude）に SitRight が正しく載り、引用されるための方針と実装。2026-10 時点の一次情報にもとづく。

## 前提になる一次情報

| 事実 | 出典 |
| --- | --- |
| AI Overviews・AI Mode に載る条件は、通常の検索で索引され snippet を出せること。AI 用の特別なファイルやマークアップ、専用の schema.org は不要 | [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) |
| FAQ のリッチリザルトは 2026-05 に表示終了、2026-06 にドキュメント削除 | [Google: FAQPage](https://developers.google.com/search/docs/appearance/structured-data/faqpage) |
| アプリのリッチリザルトは `aggregateRating` か `review` が必須。実在しない評価は載せない | [Google: Software app](https://developers.google.com/search/docs/appearance/structured-data/software-app) |
| ChatGPT 検索に載るには OAI-SearchBot を robots.txt で許可する（GPTBot は学習用で別） | [OpenAI: Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots) |
| Claude の検索は Claude-SearchBot、ユーザーの依頼による取得は Claude-User、学習は ClaudeBot | [Anthropic: crawler の説明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| llms.txt はサイトの要約とリンクを Markdown で置く提案。Google は不要としているが、置いても害はない | [llmstxt.org](https://llmstxt.org/) |
| 生成エンジンの回答で引用されやすくなるのは、出典の明記・統計値・権威ある文献からの直接引用。キーワードの詰め込みは逆効果 | [Aggarwal et al. GEO: Generative Engine Optimization (KDD 2024)](https://arxiv.org/abs/2311.09735) |

## 実装

| 対象 | 内容 | 場所 |
| --- | --- | --- |
| 言語ごとのメタ情報 | title・description・canonical・hreflang（x-default 付き）・OG・Twitter Card | `src/app/seo.ts`（`pageMetadata` / `guideMetadata`） |
| 構造化データ（トップ） | `Organization`・`WebSite`・`WebApplication`（無料の `Offer`、`softwareHelp` で解説ページを指す）を `@graph` で 1 つにまとめる | `pageJsonLd` |
| 解説ページ | 問いに直接答える要約、出典付きの本文、よくある質問、出典一覧。JS なしで全文が HTML に入る | `src/components/Guide/`、`src/app/{,ja/,ko/}guide/page.tsx` |
| 構造化データ（解説） | `Article`（`citation` に出典、`dateModified`）・`FAQPage`・`BreadcrumbList`。表示中の文と同じ内容にする | `guideJsonLd` |
| サイトマップ | トップと解説ページを hreflang の代替 URL 付きで。解説ページは `lastModified` と画像付き | `src/app/sitemap.ts` |
| robots.txt | すべてのクローラーを許可（`/lab` だけ除外）。AI の検索用クローラーも `*` で許可される | `src/app/robots.ts` |
| llms.txt | サイトの要約、主な事実、ページ一覧 | `public/llms.txt` |
| `<html lang>` | /ja・/ko とその解説ページを書き出し後に書き換える | `scripts/postbuild.mjs` |

学習用クローラー（GPTBot・ClaudeBot・Google-Extended）を止めるかは方針の問題なので、現状は止めていない。止めるときは `robots.ts` にその User-Agent だけのグループを足す（グループを足すとそのクローラーは `*` の規則を読まなくなるので、`/lab` の除外も一緒に書く）。

## 解説ページの書き方

- 冒頭の要約で「何をするアプリか・費用・プライバシー・通知の条件」に一文ずつで答える。AI の回答はこの段落を引用しやすい。
- 健康に関わる数値は一次情報（論文・公的機関）だけを使い、本文の各節に出典番号を付ける。出典は `content.ts` の `SOURCES` に原題と URL で置く。
- 文献からの直接引用は `quote` に原文のまま置き、ja / ko は `note` に要約を添える。キーワードを繰り返し詰め込まない。
- 計測値は推定で医療用ではないことを書く。誇張しない（`docs/UI_COPY_GUIDELINES.md`）。
- 内容や出典を見直したら `GUIDE_UPDATED` を更新する（`dateModified` とサイトマップの `lastModified` になる）。`GUIDE_PUBLISHED` は変えない。
- 構造化データの文は表示中の文から作る。`tests/unit/seo.test.ts` が、FAQ の問いと答え・出典 URL が HTML にあることを確かめる。

## デプロイ後の運用（コード外）

- Google Search Console と Bing Webmaster Tools にサイトを登録し、`/sitemap.xml` を送る。Bing の AI Performance レポートで Copilot での引用数が見られる。
- IndexNow（Bing・Naver・Yandex などへ更新を即時通知）は未導入。導入するなら鍵ファイルを `public/` に置き、`npm run deploy` の後に更新 URL を送るスクリプトを足す（外部への送信なので `docs/TELEMETRY_CONTRACT.md` も確認する）。Google は IndexNow を使わない。
- 独自ドメインに移るときは `src/app/seo.ts` の `siteUrl` と `public/llms.txt` の URL を変える。
