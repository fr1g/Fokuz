/**
 * `?debug=true` adds +5px to the mobile safe paddings (toolbar top padding,
 * collapsed panel tab spacing) via the `--debug-pad` CSS variable, so the
 * layout fix can be verified visually. See `.debug-layout` in index.css.
 */
export const DEBUG_LAYOUT =
  new URLSearchParams(window.location.search).get('debug') === 'true';
