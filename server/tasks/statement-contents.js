export default defineTask({
  meta: {
    name: 'statement-contents',
    description: 'Delete statement copies that are expired or whose statement is invalidated',
  },
  async run() {
    await deleteExpiredStatementContents();

    const sdIds = await listStatementContentIds();
    const invalidated = [];
    // TRACES returns at most 100 statements per getSd call.
    for (let i = 0; i < sdIds.length; i += 100) {
      try {
        const { statements, error } = await retrieveSd(sdIds.slice(i, i + 100));
        if (error) {
          console.error('Statement contents: retrieving statements from TRACES failed:', error);
          continue;
        }
        invalidated.push(...(statements ?? []).filter(isInvalidated).map((s) => s.sdId));
      } catch (e) {
        // TRACES busy - the remaining statements will be checked by the next run.
        console.error('Statement contents: retrieving statements from TRACES failed:', e);
      }
    }
    await deleteStatementContents(invalidated);

    return { result: { checked: sdIds.length, deleted: invalidated.length } };
  },
});
