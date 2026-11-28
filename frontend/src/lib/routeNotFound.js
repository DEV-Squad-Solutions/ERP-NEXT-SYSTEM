// The API answers 404 with errorCode "Request.RouteNotFound" when the frontend
// calls an endpoint the deployed backend version does not have yet.
export const ROUTE_MISSING_MESSAGE =
  "هذه الميزة غير متوفرة في نسخة السيرفر الحالية. يلزم تحديث الباك اند.";

export function isRouteNotFound(error) {
  return (
    error?.status === 404 &&
    error?.data?.errorCode === "Request.RouteNotFound"
  );
}
