import { useSelector } from "react-redux";
import { selectIsAdmin, selectIsAuthenticated } from "../auth/authSlice";
import { useGetMyScreenAccessQuery } from "./screenAccessApi";

const EMPTY = [];

/**
 * الشاشات المخفية للمستخدم الحالي (deny-list يحددها الأدمن).
 * الأدمن مش بتتخفى عنه أي شاشة. لو الطلب فشل بنفضل على السلوك الحالي.
 */
export default function useHiddenScreens() {
  const isAdmin = useSelector(selectIsAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { data } = useGetMyScreenAccessQuery(undefined, {
    skip: isAdmin || !isAuthenticated,
  });
  return isAdmin ? EMPTY : data?.hiddenScreens || EMPTY;
}
