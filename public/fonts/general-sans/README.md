# General Sans font files

General Sans is the Whetstone UI/display typeface. It is licensed via
[Fontshare](https://www.fontshare.com/fonts/general-sans) and is **not**
redistributed in this repository.

The app is already wired for it: `src/app/globals.css` declares `@font-face`
rules pointing at this folder, and `tailwind.config.ts` lists `'General Sans'`
first in `fontFamily.sans`. Until the files below are present, the UI renders in
the system sans fallback; adding them activates General Sans with **no code
change** and no rebuild of config.

## Drop these files in here

Download the General Sans web bundle from Fontshare and copy the WOFF2 files,
renamed exactly as:

```
public/fonts/general-sans/
  GeneralSans-400.woff2   ← Regular
  GeneralSans-500.woff2   ← Medium
  GeneralSans-600.woff2   ← Semibold
  GeneralSans-700.woff2   ← Bold
```

That's it — reload and General Sans is live. (WOFF2 only is intentional; every
target browser supports it, matching the JetBrains Mono setup in the sibling
folder.)
