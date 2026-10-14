/* Catch-all for live features that aren't connected yet. Answering with JSON (instead of an HTML 404)
   keeps the rest of the site's live features (votes, polls, price reports) working. */
import { fail } from "./_lib/http.js";
const soon = () => fail("This live feature is being connected and will be available soon.", 503);
export const GET = soon, POST = soon;
