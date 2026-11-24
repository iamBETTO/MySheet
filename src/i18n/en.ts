// Every English text MySheet shows (plans/translation.md), under a stable key "<part>.<what>", one file per part of the
// app in en/. Whole sentences with named slots ({page}, {n}); a text that depends on a count has plural forms ("one",
// "other"; Hebrew also has "two"). Translators: keep the slots as they are; their order may change.
import type { Message } from './types';
import { period } from './en/period';
import { importing } from './en/importing';
import { backup } from './en/backup';
import { settings } from './en/settings';
import { sheets } from './en/sheets';
import { activity } from './en/activity';
import { calendar } from './en/calendar';
import { budget } from './en/budget';
import { spending } from './en/spending';
import { home } from './en/home';
import { notice } from './en/notice';
import { parts } from './en/parts';
import { frame } from './en/frame';
import { arrange } from './en/arrange';
import { common } from './en/common';

export const en = {
  ...period,
  ...importing,
  ...backup,
  ...settings,
  ...sheets,
  ...activity,
  ...calendar,
  ...budget,
  ...spending,
  ...home,
  ...notice,
  ...parts,
  ...frame,
  ...arrange,
  ...common,
} satisfies Record<string, Message>;
