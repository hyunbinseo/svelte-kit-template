// TODO Check browser features in the layout load function
// Blocked by https://github.com/sveltejs/kit/issues/14678

const checkBrowserFeatures = () => {
	if (
		typeof [].toReversed === 'function' && // ES2023
		CSS.supports('selector(:has(a))')
	)
		return;
	window.stop();
	document.documentElement.innerHTML = '지원되지 않는 브라우저입니다.';
};

export const checkBrowserScript = `<script>(${checkBrowserFeatures})()</script>`;
