// Copy to app/v1/content/[...path]/route.ts.
import { gate } from '../../../../lib/gate'; // Your server-only configured instance.

export const dynamic = 'force-dynamic';
export const GET = gate.handle;
export const POST = gate.handle;
export const PUT = gate.handle;
export const PATCH = gate.handle;
export const DELETE = gate.handle;
export const HEAD = gate.handle;
export const OPTIONS = gate.handle;
