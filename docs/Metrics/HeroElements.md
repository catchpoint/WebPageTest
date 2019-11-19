# Hero Elements

Hero elements enable you to measure when critical elements are displayed on screen. WebPageTest defines some default hero elements:

- **H1** - The largest `<h1>` element visible in the viewport. If no `<h1>` is visible, then the largest `<h2>` will be used instead.
- **Largest Image** - The largest `<img>` element visible in the viewport.
- **Largest Background Image** - The largest element of any type visible in the viewport that has a background image.

You can also specify your own hero elements. This can be done by:

- Adding the `elementtiming` attribute to any element. This approach is based on the [Hero Text Element Timing proposal](https://github.com/WICG/element-timing).
- Specifying element names and selectors in the WebPageTest UI. These can be specified in the **Custom Hero Element Selectors** text box within the **Custom** tab. The format is a JSON string of `{ "heroElementName": "elementSelector" }`, for example: `{ "intro": "p.introduction", "buyButton": ".item .buy" }`.

WebPageTest will also calculate two more hero metrics, based on the values of the other hero elements:

- **First Painted Hero** - The time that the first hero element is visible in the viewport.
- **Last Painted Hero** - The time that the last hero element is visible in the viewport.

## How hero elements are measured

Hero element rendering times are calculated as follows:

1. Identify the largest hero elements in the viewport.
2. Collect the dimensions and position of these elements, as well as any custom selectors and elements with the `elementtiming` attribute.
3. For each of the hero elements, crop the final video frame to use as a "fully rendered" reference.
4. Iterate over each video frame, applying the same crop and comparing it to the reference frame.
5. When a frame is found that is sufficiently similar to the reference, use the timestamp of that frame as the hero element render time.

## Limitations

### Only elements in the viewport can be measured

Since the hero element timings are determined by analysing video frames, only elements that appear in the viewport can be measured. The hero element detection is done in such a way that only part of the element must be visible.

### Animated content or pop-overs can interfere

When a hero element is animated or is covered by pop-over elements, the rendering times may not be accurate. This is because the "fully rendered" reference frame may have the hero element in a state that is different to when it first renders.
