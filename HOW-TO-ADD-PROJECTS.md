# Adding a project to this profile

The **Released** list in the README is rebuilt automatically. You don't edit the table by hand.

## A project on the website (the normal way)

1. In the website's admin panel, open **Projects**, add the project and publish it.
   Give it an **icon** (128×128) and a **Chrome Web Store** button (or any other link) so the README has an icon and an Install button.
2. That's it. The README updates within a minute or two if the site has `GITHUB_PROFILE_TOKEN` set,
   otherwise at the next daily run (06:17 UTC).

To update it right away: **Actions → Update projects → Run workflow**.

Editing, reordering (featured first, then sort order) or unpublishing a project on the site changes the README the same way.

## A project that isn't on the website

Add it to [`extra-projects.json`](extra-projects.json) and commit. The README updates on push. These are listed after the website's projects.

```json
[
  {
    "title": "My Tool",
    "summary": "One sentence about what it does.",
    "url": "https://example.com/install",
    "button": "Install",
    "page": "https://github.com/ymdevsolution/my-tool",
    "icon": "https://example.com/icon.png"
  }
]
```

- `title` is required. Everything else is optional.
- `url` is the button link. `button` is its text and defaults to "Open".
- `page` is where the project's name links to. It defaults to `url`.
- `icon` can be a link (it is downloaded into `assets/projects/`) or a file you committed, e.g. `assets/projects/my-tool.png`.

## Connecting the website (one-time setup)

So the README updates the moment you publish, not once a day:

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**.
   Set **Repository access** to *Only select repositories* → `ymdevsolution/ymdevsolution`, and
   **Permissions → Contents** to *Read and write*.
2. On Render, add the token as the environment variable `GITHUB_PROFILE_TOKEN` on the site's service.
