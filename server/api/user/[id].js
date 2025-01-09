import { test } from '../../db/users';

export default defineEventHandler(async (event) => {
  test();
});
