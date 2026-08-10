# General Sans font files

General Sans is the Whetstone UI/display typeface, licensed via
[Fontshare](https://www.fontshare.com/fonts/general-sans) under the ITF Free
Font License.

The four weights used by the app live in this folder and are wired up in
`src/app/globals.css` (`@font-face`) and `tailwind.config.ts` (`fontFamily.sans`):

```
GeneralSans-Regular.woff2    → 400
GeneralSans-Medium.woff2     → 500
GeneralSans-Semibold.woff2   → 600
GeneralSans-Bold.woff2       → 700
```

To update the font, replace these files in place (keep the names) or adjust the
`src` URLs in `globals.css`. If they are removed, the UI falls back to the system
sans stack automatically.
