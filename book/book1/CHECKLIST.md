# Image quality checklist

Check every Flux image before it goes into a page. If any of these show up, the
image is rejected and regenerated — do not try to fix it in code.

- [ ] Wrong number of wheels, doubled parts or melted details
- [ ] Gray shading or solid black areas that code cleanup can't fix
- [ ] Letters, numbers or fake writing
- [ ] Faces, people or hands
- [ ] Parts cut off or touching the image edge
- [ ] Lines broken or too thin to color inside

## Regenerating a rejected image

Delete the file and re-run just that key. Nothing else is touched, because
anything already in `art/` is skipped:

```
ONLY=a06 node book/scripts/generate-images.mjs
```

Every image uses seed 42 so the style stays consistent across the book. That
also means a straight re-run returns the same picture, so a redo needs either a
different seed or a sharper subject line:

```
SEED=43 ONLY=a06 node book/scripts/generate-images.mjs
```

Prefer fixing the subject line when the image failed for a describable reason
("two cabs", "wheels merged"), and prefer a new seed when the prompt was fine
and Flux simply drew it badly.
