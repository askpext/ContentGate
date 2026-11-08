// LOCAL EVALUATION FIXTURES ONLY. These are dummy credentials, not deployment auth.
const readers = new Map([
  ['fixture-paid', { id: 'paid', expiresAt: Infinity }],
  ['fixture-free', { id: 'free', expiresAt: 0 }],
  ['fixture-expired', { id: 'expired', expiresAt: 1 }],
]);
const catalog = { id: 'story', title: 'A public headline', description: 'A genuine public synopsis.' };
const privateBody = 'CONTENTGATE_EVAL_PRIVATE_7B19: The subscriber edition.';
let reads = 0;

export function resetProviders() { reads = 0; }
export function bodyReads() { return reads; }

export async function authenticate(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (token === 'fixture-auth-error') throw new Error(privateBody);
  if (token === 'fixture-policy-error') return { id: 'policy-error', expiresAt: Infinity };
  return readers.get(token) ?? null;
}

export async function authorize({ user, contentId }) {
  if (user.id === 'policy-error') throw new Error(privateBody);
  return user.expiresAt > Date.now() && contentId !== 'restricted';
}

export async function getContent(id) {
  reads++;
  return id === 'missing' ? null : { ...catalog, id, body: privateBody };
}

export async function getMetadata(id) {
  return id === 'missing' ? null : { ...catalog, id };
}
