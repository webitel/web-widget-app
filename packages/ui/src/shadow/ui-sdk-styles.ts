// [Claude] ui-sdk's global CSS (styleguide variables, typography, Tailwind, component styles) adapted for a shadow root instead of being loaded into the host page.
import uiSdkCss from '@webitel/ui-sdk/dist/ui-sdk.css?inline';
import { upsertSheet } from './shadow-use-style';

const FONT_FACE_PATTERN = /@font-face\s*\{[^}]*\}/g;

let isInstalled = false;

// [Claude] @font-face declared inside a shadow root is not reliably loaded, so only the font rules go to the page.
const injectFontFaces = (css: string): void => {
	const style = document.createElement('style');
	style.setAttribute('data-webitel-widget', 'fonts');
	style.textContent = (css.match(FONT_FACE_PATTERN) ?? []).join('\n');
	document.head.append(style);
};

// [Claude] `:root` never matches inside a shadow root; the host element plays that role there. `:root.theme--dark` has to become `:host(.theme--dark)`, because the host only matches through the functional form.
const toShadowCss = (css: string): string =>
	css
		.replace(FONT_FACE_PATTERN, '')
		.replace(/:root(\.[\w-]+)/g, ':host($1)')
		.replace(/:root\b/g, ':host');

export const installUiSdkStyles = (): void => {
	if (isInstalled) {
		return;
	}
	isInstalled = true;
	injectFontFaces(uiSdkCss);
	// [Claude] Stops the site's inherited text styles (font, colour, letter-spacing, …) from flowing into the widget.
	upsertSheet(
		'webitel-host-reset',
		':host{all:initial;display:block;font-family:Montserrat,sans-serif}',
	);
	upsertSheet('webitel-ui-sdk-global', toShadowCss(uiSdkCss));
};
