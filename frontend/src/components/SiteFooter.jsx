const PAGE_LINKS = [
  ["about", "About"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
  ["copyright", "Copyright & reports"],
];

export default function SiteFooter({ onNavigate, activePage }) {
  return (
    <footer className="site-footer">
      <nav aria-label="About RoomMitra and policies">
        {PAGE_LINKS.map(([page, label]) => (
          <button
            type="button"
            key={page}
            onClick={() => onNavigate(page)}
            aria-current={page === activePage ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="site-footer-credit">
        <small>© 2026 RoomMitra. All rights reserved.</small>
        <small>
          Created by <strong>Shubham Kumar</strong>
          <span aria-hidden="true"> · </span>
          <a href="https://www.instagram.com/shubham_kr45/" target="_blank" rel="noreferrer">
            Instagram @shubham_kr45
          </a>
        </small>
      </div>
    </footer>
  );
}
