# Custom UI/UX & Responsive Design Guidelines

When outputting HTML, CSS, or UI component previews for mobile (phone) and tablet devices:

1. **Layout & Alignment Rules**:
   - **Device Viewports**: Always align and encapsulate phone and tablet previews within their exact standard aspect ratios and dimensions (Phone: max-width 375px–430px; Tablet: max-width 768px–834px).
   - **Ordering & Flow**: Arrange device previews sequentially or side-by-side using CSS Flexbox/Grid (`display: flex; gap: 2rem; align-items: flex-start; justify-content: center; flex-wrap: wrap;`).
   - **Structural Alignment**: Ensure internal elements (cards, navigation bars, buttons, headers, footers) inside each device mockup align correctly according to their respective device safe areas and boundaries.

2. **Visual Framing Constraints**:
   - Wrap phone and tablet UI components inside identifiable, fixed-size container classes (e.g., `.phone-preview`, `.tablet-preview`) to prevent stretching or overflowing.
   - Use `overflow-x: hidden` and `box-sizing: border-box` across all inner layout containers to ensure pixel-perfect positioning inside the device boundaries.
   - Set all media, flex items, and grid tracks to adjust dynamically within their respective device mockup limits without breaking layout alignment.
