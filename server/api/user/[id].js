import { getUser } from '../../db/users';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id || (event.method !== 'GET' && event.method !== 'PUT' && event.method !== 'DELETE')) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }

  // if (event.method === 'PUT') {
  //   const user = {
  //     id: id,
  //     ...(await readBody(event)),
  //   };
  //   const success = await putUser(user);
  //   if (!success) {
  //     throw createError({ status: 400, statusMessage: 'Bad Request' });
  //   }
  //   return await getUser(id);
  // }

  // if (event.method === 'DELETE') {
  //   const success = await deleteUser(id);
  //   if (!success) {
  //     throw createError({ status: 404, statusMessage: 'Not Found' });
  //   }
  //   return;
  // }

  let user;
  user = await getUser(id);
  if (!user) {
    throw createError({ status: 404, statusMessage: 'Not Found' });
  }
  return user;
});
