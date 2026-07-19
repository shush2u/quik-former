import { Link, Navigate, NavLink, Route, Routes } from "react-router";
import { BuilderPage } from "@/features/builder/BuilderPage";
import { HomePage } from "@/features/home/HomePage";

const primaryRoutes = [
  { to: "/", label: "Home", end: true },
  { to: "/builder/new", label: "Builder" },
  { to: "/fill", label: "Fill" },
  { to: "/responses", label: "Responses" },
  { to: "/settings", label: "Settings" },
];

const pageContent = {
  fill: {
    eyebrow: "Fill mode",
    title: "Complete a form",
    body: "Fill mode will render an immutable form revision, validate answers, and save draft or submitted responses locally.",
    actions: [{ to: "/builder", label: "Back to builder" }],
  },
  responses: {
    eyebrow: "Responses",
    title: "Review saved work",
    body: "Submitted responses, imported response packages, and PDF export entry points will live on this route.",
    actions: [{ to: "/settings", label: "Open settings" }],
  },
  settings: {
    eyebrow: "Settings",
    title: "Manage this app",
    body: "PWA install state, import/export defaults, and local data controls will be organized here as the MVP grows.",
    actions: [{ to: "/", label: "Return home" }],
  },
};

type PageKey = keyof typeof pageContent;

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex flex-col items-start gap-3.5 border-b border-border bg-surface/90 px-[clamp(18px,5vw,56px)] py-[18px] backdrop-blur-2xl nav:flex-row nav:items-center nav:justify-between nav:gap-6">
        <Link
          className="inline-flex min-w-max items-center gap-2.5 font-bold text-strong no-underline"
          to="/"
          aria-label="Quik Former home"
        >
          <img
            className="size-8"
            src="/favicon.svg"
            alt=""
            width="32"
            height="32"
          />
          <span>Quik Former</span>
        </Link>
        <nav
          className="flex flex-wrap items-center justify-start gap-1.5 nav:justify-end"
          aria-label="Primary navigation"
        >
          {primaryRoutes.map((route) => (
            <NavLink
              key={route.to}
              to={route.to}
              end={route.end}
              className={({ isActive }) =>
                [
                  "rounded-md px-2.5 py-2 text-[0.92rem] leading-none no-underline transition-colors nav:px-3",
                  "hover:bg-control-hover hover:text-strong focus-visible:bg-control-hover focus-visible:text-strong",
                  isActive ? "bg-accent-soft text-accent-strong" : "text-muted",
                ].join(" ")
              }
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-[clamp(16px,4vw,48px)] pt-[20px] pb-[140px]">
        <Routes>
          <Route index element={<HomePage />} />
          <Route
            path="builder"
            element={<Navigate to="/builder/new" replace />}
          />
          <Route path="builder/new" element={<BuilderPage createNew />} />
          <Route path="builder/:formId" element={<BuilderPage />} />
          <Route path="fill" element={<PlaceholderPage page="fill" />} />
          <Route
            path="responses"
            element={<PlaceholderPage page="responses" />}
          />
          <Route
            path="settings"
            element={<PlaceholderPage page="settings" />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

function PlaceholderPage({ page }: { page: PageKey }) {
  const content = pageContent[page];

  return (
    <section className="placeholder-page" aria-labelledby={`${page}-title`}>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 id={`${page}-title`}>{content.title}</h1>
      <p className="lede">{content.body}</p>
      <div className="page-actions">
        {content.actions.map((action) => (
          <Link key={action.to} className="button-link" to={action.to}>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="placeholder-page" aria-labelledby="not-found-title">
      <p className="eyebrow">Not found</p>
      <h1 id="not-found-title">That route is not part of this workspace</h1>
      <p className="lede">
        Use the app navigation to return to the current Quik Former milestone.
      </p>
      <div className="page-actions">
        <Link className="button-link" to="/">
          Return home
        </Link>
      </div>
    </section>
  );
}

export default App;
