import '@valibot/i18n/ko';
import { setGlobalConfig } from 'valibot';

// Universal hooks run on the server and the client, see specs/09-app-shell.md
// Only a fallback: the messages echo the input and read unnaturally, so
// user-facing actions keep their own messages.
// See https://github.com/open-circle/valibot/issues/1679
setGlobalConfig({ lang: 'ko' });
