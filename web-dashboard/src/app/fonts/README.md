# Self-hosted dashboard fonts

These font files are copied from the corresponding installed
`@expo-google-fonts` packages used by `mobile-app`:

- Fraunces 400, 500, and 600 from `@expo-google-fonts/fraunces` 0.4.1
- Inter 400, 500, 600, and 700 from `@expo-google-fonts/inter` 0.4.2
- Newsreader 400 normal and italic from `@expo-google-fonts/newsreader` 0.4.1

Each family is distributed under the SIL Open Font License 1.1. Its family-
specific copyright notice and license text are retained in the matching
`*-OFL-1.1.txt` file in this directory.

The dashboard loads these files through `next/font/local` in
`../layout.tsx`. Keep the configured files, weights, and license notices in
sync when changing the typography.
