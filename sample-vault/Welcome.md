---
tags: [start]
---
# Welcome to Cortado

This is a **sample vault**. It mixes Markdown notes with standalone HTML guides.

- Open the [[Interactive Sorting]] guide, which runs JavaScript.
- Try [[Color Theory|the colour mixer]] next.
- See your [reading list](Notes/Reading%20List.md) or [[Ideas#Later]].
- This link goes nowhere: [[Missing Note]].

![Diagram](Guides/assets/diagram.svg)

## Code

```js
const greet = (name) => `Hello, ${name}!`;
console.log(greet('iPad'));
```

## A table

| Shortcut | Action |
| --- | --- |
| ⌘K | Quick open |
| ⌘W | Close tab |
| ⌘\ | Toggle sidebar |

## Tasks

- [x] Sync the vault
- [ ] Read every guide

## Diagram

```mermaid
graph LR
  Drive[Google Drive] -->|Sync| Device[iPad storage]
  Device --> Tabs[Tabs]
```

## Maths

Euler's identity $e^{i\pi} + 1 = 0$ costs $5 less than a coffee.

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

A footnote reference.[^1]

[^1]: Footnotes work too.
