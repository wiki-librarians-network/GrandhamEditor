# GrandhamEditor
A Wikidata user script for creating, editing and quality-checking Work and Edition items for books, with Malayalam and English support.

Part of the **Grandham Project** · WikiProject Books · Sahya Digital Conservation Foundation · Wiki Librarians Network
Author: Manoj Karingamadathil 
Edit summary tag: `via Grandham Editor (#GrandhamEditor)`

## Install

1. Save `GrandhamEditor.js` as `User:<YourName>/GrandhamEditor.js` on Wikidata.
2. Add to `Special:MyPage/common.js`:

```js
mw.loader.load('//www.wikidata.org/w/index.php?title=User:Manojk/GrandhamEditor.js&action=raw&ctype=text/javascript');
```

3. Reload. A **Grandham Editor** link appears in the Tools menu. On an item page (Q…) it opens with that item loaded.

## Input

| Input | How |
|---|---|
| QID list | Paste one QID per line |
| CSV / TSV master sheet | Paste or upload a file with a header row (use **⬇ sample master CSV** for the template) |
| Blank item | **＋ blank work** or **＋ blank edition** |

- Multiple values in one cell: separate with `|`.
- Item columns accept QIDs or plain text. Known words (`malayalam`, `india`, `novel`, `poetry`…) resolve automatically; other names appear as yellow chips to search or create.
- `type` column: `work`, `edition` or `both`. If a QID is given, the type is detected from P31.
- Sheet values are applied over the existing item for review; nothing is saved until you press Save.

## Data model

**Edition item**: P31 = Q3331189; P629 (work), P1476, P1680, P50, P98, P655, P407, P495, P393, P291, P123, P577, P872, P195, P1104, P996, P1957, P953. Optional: P2635, P957, P212, P243, P648.

**Work item**: P31 = Q47461344; P1476, P1680, P50, P98, P655, P407, P495, P571, P577, P135, P7937, P747. Optional: P921, P166, P179, P144, P941, P674, P840.

## Features

- **One row at a time** with Prev / Next navigation.
- **Create missing items** with **＋ new**: author, editor, translator, publisher, printer, publishing house, printing press. Labels and aliases in Malayalam and English, auto descriptions (e.g. "author from Kerala, India" / "കേരളത്തിൽനിന്നുള്ള ഒരു എഴുത്തുകാരൻ"), instance of, gender, citizenship or country. Duplicate check before creation.
- **Generate New Entry**: choose Work or Edition from the drop-down; a pop-up shows the form for that type, pre-filled from the current item, with cross-links.
- **Cross-linking**: P629 and P747 reciprocal links are added on save.
- **Quality checker**: title and language code, unlinked names, authors are human, P629 target is a written work, date formats, page counts, ISBN-10/13 checksums and agreement, OCLC, Open Library ID, URLs, reciprocal links, author and date consistency with the linked work.
- **Batch QC**: 🧪 checks every QID loaded and exports a CSV report.
- **Helpers**: ISBN-10 → ISBN-13, auto-fill descriptions, session log download.

## Options

- *Remove values missing from form*: off by default (the script only adds or updates).
- *Overwrite existing labels/descriptions*: off by default.
- *Auto-advance after save*.

## Master sheet columns

`type, qid, title, title_lang, subtitle, subtitle_lang, author, editor, translator, language, country, work_qid, edition_qids, inception, publication_date, form, movement, edition_number, place_of_publication, publisher, printer, collection, pages, commons_file, wikisource_index, url, parts, isbn10, isbn13, oclc, openlibrary, topic, award, series, based_on, inspired_by, character, narrative_location, label_ml, label_en, desc_ml, desc_en, alias_ml, alias_en`

Dates: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. ISBNs should be hyphenated.

## Notes

- The sample rows are demo data (placeholder publisher, made-up ISBNs). Do not save them as real items.
- Review generated counterparts before confirming; copied fields (title, creators, language, country, date) may need adjustment.
- Report issues or suggestions on the script's talk page.
