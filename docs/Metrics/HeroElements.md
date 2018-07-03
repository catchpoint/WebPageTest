# Hero Elements

Hero elements enable you to measure when critical elements are displayed on screen. WebPageTest defines some default hero elements:

- **H1** - The largest `<h1>` element visible in the viewport. If no `<h1>` is visible, then the largest `<h2>` will be used instead.
- **Largest Image** - The largest `<img>` element visible in the viewport.
- **Largest Background Image** - The largest element of any type visible in the viewport that has a background image.

You can also specify your own hero elements. This can be done by:

- Adding the `elementtiming` attribute to any element. This approach is based on the [Hero Text Element Timing proposal](https://docs.google.com/document/d/1sBM5lzDPws2mg1wRKiwM0TGFv9WqI6gEdF7vYhBYqUg/edit?usp=sharing).
- Specifying element names and selectors in the WebPageTest UI. These can be specified in the **Custom Hero Element Selectors** text box within the **Custom** tab. The format is a JSON string of `{ "heroElementName": "elementSelector" }`, for example: `{ "intro": "p.introduction", "buyButton": ".item .buy" }`.
