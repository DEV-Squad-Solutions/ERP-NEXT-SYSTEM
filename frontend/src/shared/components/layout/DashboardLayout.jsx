import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUserId } from "../../../features/auth/authSlice";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import TopNav from "./TopNav";
import PageLoader from "./PageLoader";
import PrintHeader from "./PrintHeader";
import PagePrintBar from "./PagePrintBar";
import UnauthorizedPage from "../UnauthorizedPage";
import useHiddenScreens from "../../../features/screenAccess/useHiddenScreens";
import { isPathHidden } from "../../../features/screenAccess/screenList";
import { getDir } from "../../../i18n";
import { usePhone } from "../../../utils/viewport";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [layout, setLayout] = useState(() => localStorage.getItem("layout") === "top" ? "top" : "side");
  // Sidebar pin: pinned = always open (260px); unpinned = icon rail that opens on hover/focus. Saved per user.
  const userId = useSelector(selectUserId);
  const pinKey = `sidebarPinned:${userId ?? "anon"}`;
  const [pinned, setPinned] = useState(() => localStorage.getItem(pinKey) === "1");
  useEffect(() => { setPinned(localStorage.getItem(pinKey) === "1"); }, [pinKey]);
  const togglePin = () => {
    setPinned((v) => {
      localStorage.setItem(pinKey, v ? "0" : "1");
      return !v;
    });
  };
  const phone = usePhone();
  // On a phone the 56px side rail eats the screen: use the drawer (menu button) instead.
  const isTop = layout === "top" || phone;
  const switchLayout = () => {
    const next = layout === "top" ? "side" : "top";
    localStorage.setItem("layout", next);
    setLayout(next);
  };
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  // The page area must never drift sideways (focus or wide content can scroll it): pin it back.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    el.scrollLeft = 0;
    const pin = () => { if (el.scrollLeft !== 0) el.scrollLeft = 0; };
    el.addEventListener("scroll", pin, { passive: true });
    return () => el.removeEventListener("scroll", pin);
  }, [pathname]);
  const hiddenScreens = useHiddenScreens();

  return (
    <div
      dir={getDir()}
      className={[
        "h-screen",
        "w-full",
        "overflow-hidden",
        "bg-paper",
        "text-ink-800",
        "dark:bg-ink-950",
        "dark:text-white",
        "isolate",
        "print:h-auto print:overflow-visible",
      ].join(" ")}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div className="contents print:hidden"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} hideOnDesktop={isTop} onSwitchLayout={switchLayout} pinned={pinned} onTogglePin={togglePin} /></div>

      {/* =====================================================
          MAIN APPLICATION AREA
      ===================================================== */}

      <div
        className={[
          "flex h-full min-w-0 print:block print:h-auto print:ms-0",
          "flex-col",
          "transition-[margin]",
          "duration-300",
          "ease-[cubic-bezier(0.22,1,0.36,1)]",
          isTop ? "" : pinned ? "ms-[260px]" : "ms-[56px] sm:ms-[72px]",
        ].join(" ")}
      >
        {/* ===================================================
            NAVBAR
        =================================================== */}

        <div className="contents print:hidden">
          <Navbar onMenuClick={() => setIsSidebarOpen(true)} showMenuButton={isTop} />
          {isTop && <TopNav onSwitchLayout={switchLayout} />}
        </div>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <main
          ref={mainRef}
          className={[
            "relative",
            "flex-1",
            "min-h-0",
            "min-w-0",
            "overflow-x-hidden",
            "overflow-y-auto",
            "print:h-auto print:overflow-visible print:bg-white",
            "custom-scroll",
            "bg-gray-50",
            "dark:bg-ink-950",
          ].join(" ")}
        >
          {/* subtle page background */}

          <div
            aria-hidden="true"
            className={[
              "pointer-events-none",
              "absolute inset-0",
              "-z-0",
              "overflow-hidden",
            ].join(" ")}
          >
            <div
              className={[
                "absolute start-0 top-0",
                "h-56 w-56",
                "rounded-full",
                "bg-primary-500/[0.025]",
                "blur-3xl",
                "dark:bg-primary-500/[0.018]",
              ].join(" ")}
            />

            <div
              className={[
                "absolute bottom-0 end-0",
                "h-64 w-64",
                "rounded-full",
                "bg-primary-500/[0.018]",
                "blur-3xl",
                "dark:bg-primary-500/[0.012]",
              ].join(" ")}
            />
          </div>

          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <div
            className={[
              "relative z-10",
              "min-h-full",
              "p-3",
              "sm:p-4",
              "lg:p-5",
              "xl:p-6",
            ].join(" ")}
          >
            <PrintHeader mainRef={mainRef} />
            <PagePrintBar mainRef={mainRef} pathname={pathname} />
            <Suspense fallback={<PageLoader />}>
              <div key={pathname} className="page-enter">
                {isPathHidden(pathname, hiddenScreens) ? (
                  <UnauthorizedPage />
                ) : (
                  <Outlet />
                )}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
