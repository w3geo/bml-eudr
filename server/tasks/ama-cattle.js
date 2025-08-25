export default defineTask({
  meta: {
    name: 'ama-cattle',
    description: 'Task for transmitting cattle data to AMA',
  },
  run({ payload, context }) {
    console.log('Running AMA cattle task with payload:', payload);
    return { result: payload };
  },
});
