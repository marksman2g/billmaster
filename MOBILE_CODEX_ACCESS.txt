# BillMaster Phone, Tablet, and Codex Access

This is the practical path for working on or using BillMaster when you are away from the Windows computer.

## What Works Today

### Use BillMaster From Phone Or iPad

Open the hosted app:

```text
https://marksman2g.github.io/billmaster/
```

Once the Supabase publishable key is added to `billmaster-config.js`, you can sign in from Android, iPad, Windows, or another browser and pull the same cloud workspace.

### Edit The App From Phone Or iPad

Use GitHub in a browser:

```text
https://github.com/marksman2g/billmaster
```

For a lightweight editor, open:

```text
https://github.dev/marksman2g/billmaster
```

For a stronger cloud computer, open the repo in GitHub Codespaces, then run:

```bash
node scripts/serve-billmaster.js --port 4176
```

Open the forwarded port preview to see BillMaster.

## Codex From Phone Or Tablet

OpenAI says Codex is rolling into the ChatGPT mobile app for iOS and Android, with Windows host support still coming soon:

```text
https://openai.com/index/work-with-codex-from-anywhere/
```

The practical mobile path is:

1. Open the ChatGPT mobile app.
2. Look for Codex in the tools or sidebar.
3. Connect it to GitHub when prompted.
4. Use the BillMaster repo as the source of truth.

Important limitation: the local live-host connection for controlling a computer is not the same thing as the hosted BillMaster app. If the phone/tablet Codex option cannot connect to this Windows machine, use GitHub plus Codespaces as the workaround until Windows live-host access is available.

## Best Working Setup For BillMaster

1. Keep GitHub as the main source of truth.
2. Keep GitHub Pages as the public prototype link.
3. Use Supabase Auth and `billmaster_workspaces` for cross-device saved data.
4. Use Codespaces when you need a cloud development computer from a phone or tablet.
5. Later, move private beta hosting to Vercel or Netlify.

## Next Required Step

Paste the full Supabase publishable key into:

```text
billmaster-config.js
```

Do not paste the service role key into the web app.
