import test from "node:test";
import assert from "node:assert/strict";
import { isRouteNotFound, ROUTE_MISSING_MESSAGE } from "./routeNotFound.js";

test("detects the backend route-not-found answer", () => {
  assert.equal(
    isRouteNotFound({ status: 404, data: { errorCode: "Request.RouteNotFound" } }),
    true,
  );
});

test("ignores a normal 404 for a missing record and other errors", () => {
  assert.equal(isRouteNotFound({ status: 404, data: { errorCode: "Invoice.NotFound" } }), false);
  assert.equal(isRouteNotFound({ status: 500, data: { errorCode: "Request.RouteNotFound" } }), false);
  assert.equal(isRouteNotFound(undefined), false);
});

test("message is Arabic and non-empty", () => {
  assert.match(ROUTE_MISSING_MESSAGE, /[\u0600-\u06FF]/);
});
