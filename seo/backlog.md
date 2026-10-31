# Backlog

Η σειρά είναι κατά αναμενόμενα sign-ups ανά ώρα δουλειάς, με το πιο αποδοτικό πρώτο. Κάθε daily run παίρνει το πρώτο θέμα που δεν είναι μπλοκαρισμένο.
Τα νούμερα είναι από το GSC, 90 ημέρες έως 2026-10-31, εκτός αν γράφει αλλιώς.

## Ανοιχτά

1. **Ανανέωση των γεγονότων στο `/blog/free-ai-tools-2026`.** 7.788 εμφανίσεις, θέση 8,6, 3 κλικ (CTR 0,04%). Οι αναζητήσεις είναι του τύπου "best free ai assistants chatgpt gemini claude copilot perplexity free plans 2026". Το κείμενο είναι "as of May 2026" και αναφέρει GPT-4o mini, Gemini 2.5 Pro κ.λπ., που είναι πιθανότατα ξεπερασμένα. Αλλαγή: επαλήθευση κάθε free tier από την επίσημη σελίδα τιμών, με πηγή και ημερομηνία "as of", και μετά νέος τίτλος προς "free AI plans compared", π.χ. "Best Free AI Assistants 2026: ChatGPT, Gemini, Claude Free Plans". Μόνο τότε αλλάζει και το `lastModified`.
2. **Ποια σελίδα στοχεύει το "claude free": `/free-claude-ai` ή `/blog/is-claude-ai-free`;** Και οι δύο κυνηγούν "claude sonnet 5.5 free" / "claude opus 5.5 free" (θέσεις 17-86). Δύο σελίδες για το ίδιο query είναι bug. Αλλαγή: ένα primary query για την καθεμία· η μία σελίδα κρατά το "is claude free / limits" και η άλλη το "free ways to use claude", με links της μίας προς την άλλη. Μετά, push από τη σελίδα 2 στη σελίδα 1 για το "claude opus 5.5 free" (θέση 32-40).
3. **Push από τη σελίδα 2 στη σελίδα 1 για το `/best-ai-chrome-extensions`.** Τα head terms είναι στις θέσεις 21-28: "ai chrome extensions" 311 εμφανίσεις, "ai extensions" 223, "best ai chrome extensions" 196, "best ai extension for chrome" 121. Αλλαγή: άνοιγμα των 3 πρώτων αποτελεσμάτων, σύγκριση (πλήθος εργαλείων, φρεσκάδα, μέθοδος δοκιμών) και προσθήκη ό,τι λείπει.
4. **CTR στο `/best-claude-chrome-extensions`.** "claude extensions": 1.962 εμφανίσεις, θέση 7,3, CTR 0,9%. Αλλαγή: δοκιμή νέου title/description (π.χ. αναφορά ότι το Claude in Chrome είναι μόνο για paid plans και ότι υπάρχει pay-per-use εναλλακτική) και μέτρηση ξανά σε 14 ημέρες.
5. **Παρακολούθηση του `/blog/summarize-web-page-with-ai` (άλλαξε 2026-10-31).** "summarize the current webpage": 1.508 εμφανίσεις, θέση 9,0, 0 κλικ. Έλεγχος CTR στις 2026-11-14. Επόμενο βήμα: ένα πραγματικό screenshot του Prophet να συνοψίζει μια σελίδα (θέλει υλικό από τον owner).
6. **Επαλήθευση του "ChatGPT's official extension cannot read your page at all"** (description του `/blog/chatgpt-vs-claude-chrome-extension`, 2.867 εμφανίσεις). Το OpenAI έχει πλέον Atlas και άλλα προϊόντα για browser. Έλεγχος με πηγή· αν δεν ισχύει, διόρθωση.
7. **"18 tools" σε όλο το site, ενώ ο κώδικας έχει 19 εργαλεία browser + web_search.** Ερώτηση στον owner ποιο νούμερο είναι το σωστό για το marketing, και μετά διόρθωση όλων των σελίδων με τη μία.
8. **Ανανέωση του `/compare/prophet-vs-claude-in-chrome`.** Το Claude in Chrome είναι πλέον γενικά διαθέσιμο σε Pro/Max/Team/Enterprise (support.claude.com/en/articles/12012173). Έλεγχος του "$25/user/month for Team", προσθήκη ημερομηνίας "as of" και της πηγής.
9. **Μία σελίδα για το "ai form filling".** `/use-cases/form-filling`: 183 εμφανίσεις, θέση 22. `/blog/ai-form-filling-automation`: 44 εμφανίσεις, θέση 58. Συγχώνευση με redirect: πριν το redirect, αναφορά στον owner (είναι σελίδες με εμφανίσεις).
10. **CTR στο `/best-ai-sidebar-extensions`.** "ai sidebar extension": 324 εμφανίσεις, θέση 9,1. Δοκιμή title/description.
11. **Το `/tools/ai-model-comparison` είναι στη θέση 21** (240 εμφανίσεις). Έλεγχος αν τα μοντέλα και οι τιμές είναι τρέχοντα· ανανέωση.
12. **Τιμές ανταγωνιστών στα `lib/seo/comparisons.ts` και `/best-*`** (Sider $8.99, Monica $9.90, Merlin $14.25, HARPA $15 κ.λπ.). Επαλήθευση από τις σελίδες τιμών τους, με ημερομηνία "as of".
13. **Κενό: "chatgpt atlas alternative" και "claudekit alternative".** Αφορά το Monthly: γράφεται μόνο αν μπορούμε να φτιάξουμε σελίδα καλύτερη από τα 5 πρώτα αποτελέσματα.
14. **Πηγή για το "Join 1,000+ users" στο Hero.** Χρειάζεται πηγή (π.χ. χρήστες στο Chrome Web Store), αλλιώς να αφαιρεθεί. Θέλει απόφαση του owner.

## Έγινε

- 2026-10-31: διόρθωση των ισχυρισμών για το Claude in Chrome στα `/best-ai-chrome-extensions` και `/blog/chatgpt-vs-claude-chrome-extension`.
- 2026-10-31: retarget του `/blog/summarize-web-page-with-ai` στο "summarize the current webpage".
- 2026-10-31: εσωτερικά links προς τα `/blog/summarize-web-page-with-ai`, `/compare/prophet-vs-copilot`, `/for/researchers`, `/blog/10-ways-to-use-ai-while-browsing`.
- 2026-10-31: το rate limit του free στο `/blog/free-ai-tools-2026` διορθώθηκε από 5/λεπτό σε 60/λεπτό, όπως λέει ο κώδικας.
