// Every Hebrew text (plans/translation.md, step 5), one file per part of the app in he/, keys matching en/. Drafted by
// Claude for the owner to check. A key missing here shows in English.
import type { Key } from './text';
import type { Message } from './types';
import { activity } from './he/activity';
import { arrange } from './he/arrange';
import { backup } from './he/backup';
import { budget } from './he/budget';
import { calendar } from './he/calendar';
import { common } from './he/common';
import { frame } from './he/frame';
import { home } from './he/home';
import { importing } from './he/importing';
import { notice } from './he/notice';
import { parts } from './he/parts';
import { period } from './he/period';
import { settings } from './he/settings';
import { sheets } from './he/sheets';
import { spending } from './he/spending';

export const he: Partial<Record<Key, Message>> = {
  ...activity,
  ...arrange,
  ...backup,
  ...budget,
  ...calendar,
  ...common,
  ...frame,
  ...home,
  ...importing,
  ...notice,
  ...parts,
  ...period,
  ...settings,
  ...sheets,
  ...spending,
};
