import db0Driver from 'unstorage/drivers/db0';

export default defineNitroPlugin(() => {
  const storage = useStorage();

  const driver = db0Driver({
    database: useDatabase(),
  });

  storage.mount('db', driver);
});
