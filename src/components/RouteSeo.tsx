import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { DICT, useI18n, type Lang } from "@/i18n";

const BASE = "https://swingrights.app";

/** Each route's text lives in the i18n dict as seo.<id>.title / seo.<id>.desc (dict/misc.ts). */
type Page = { id: string; noindex?: boolean };

const PAGES: Record<string, Page> = {
  "/": { id: "home" },
  "/report": { id: "report" },
  "/track": { id: "track" },
  "/rights": { id: "rights" },
  "/privacy": { id: "privacy" },
  "/signin": { id: "signin", noindex: true },
  "/recover": { id: "recover", noindex: true },
  "/intake": { id: "intake", noindex: true },
};

const REPORT_PATH: Record<Lang, string> = { th: "/report", en: "/report/en", my: "/report/my", km: "/report/km", lo: "/report/lo" };

const FALLBACK: Page = { id: "fallback", noindex: true };

/** Dict text in one given language (a /report/:lang page keeps its own language, whatever the UI is set to). */
const pick = (key: string, l: Lang) => {
  const e = DICT[key];
  return e ? (e[l] ?? e.en ?? e.th) : key;
};

export function RouteSeo() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const isReport = /^\/report(?:\/(?:en|my|km|lo))?\/?$/.test(pathname);
  const routeLang = (pathname.match(/^\/report\/(en|my|km|lo)\/?$/)?.[1] as Lang | undefined) ?? (pathname === '/report' ? 'th' : lang);
  const page = isReport ? PAGES["/report"] : (PAGES[pathname] ?? FALLBACK);
  const metaLang = isReport ? routeLang : lang;
  const meta = { title: pick(`seo.${page.id}.title`, metaLang), description: pick(`seo.${page.id}.desc`, metaLang), noindex: page.noindex };
  const url = `${BASE}${pathname}`;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {isReport && (Object.entries(REPORT_PATH) as [Lang, string][]).map(([code, path]) => (
        <link key={code} rel="alternate" hrefLang={code} href={`${BASE}${path}`} />
      ))}
      {isReport && <link rel="alternate" hrefLang="x-default" href={`${BASE}/report`} />}
      {meta.noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
