# Clubs builder reference data

`fc27.json` contains the public calculator tables observed at https://fcpro.club/ on 2026-11-09: archetypes, attribute costs and limits, unlock requirements, level rewards, body modifiers, facilities and mastery bonuses. Images under `public/builder` are the corresponding archetype and PlayStyle symbols used by that reference.

The calculation engine and ALTAIR interface are implemented locally. No reference application bundle is needed at runtime. This is a versioned snapshot, not an automatic feed and not independently certified against the game. Changes to game balancing require updating these tables and regression fixtures.

Shared builds use version 3 of the URL-fragment schema. The fragment contains the selected archetype, attributes, level, body settings, PlayStyles, specialization, facilities and mastery. It is validated before use; no account or server-side build storage is required. Local drafts use browser storage.
