import { defineQueries } from '#database/app/client.ts';
import * as queries from './queries.ts';

export const db = defineQueries(queries);
