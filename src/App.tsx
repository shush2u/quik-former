import { Link, NavLink, Route, Routes } from "react-router";
import "@/App.css";

const primaryRoutes = [
  { to: "/", label: "Home", end: true },
  { to: "/builder", label: "Builder" },
  { to: "/fill", label: "Fill" },
  { to: "/responses", label: "Responses" },
  { to: "/settings", label: "Settings" },
];

const pageContent = {
  home: {
    eyebrow: "Local-first form workspace",
    title: "Quik Former",
    body: "Create reusable forms, fill them on this device, and keep your work ready for offline use.",
    actions: [
      { to: "/builder", label: "Start a form" },
      { to: "/responses", label: "View responses" },
    ],
  },
  builder: {
    eyebrow: "Builder",
    title: "Design reusable forms",
    body: "This route is ready for the form builder milestone: sections, fields, options, and revision snapshots will plug in here.",
    actions: [{ to: "/fill", label: "Preview fill mode" }],
  },
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
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="Quik Former home">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <span>Quik Former</span>
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          {primaryRoutes.map((route) => (
            <NavLink key={route.to} to={route.to} end={route.end}>
              {route.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="route-surface">
        <Routes>
          <Route index element={<PlaceholderPage page="home" />} />
          <Route path="builder" element={<PlaceholderPage page="builder" />} />
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
