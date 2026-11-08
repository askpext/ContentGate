// Copy to src/pages/v1/content/[...path].ts in an Astro SSR project.
// Configure a server adapter; do not prerender personalized article pages.
import type { APIRoute } from 'astro';
import { gate } from '../../../lib/gate'; // Your server-only configured instance.

export const prerender = false;
export const ALL: APIRoute = ({ request }) => gate.handle(request);
