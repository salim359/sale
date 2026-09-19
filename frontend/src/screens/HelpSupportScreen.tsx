import PageHeader from "../components/PageHeader";

const FAQS = [
  {
    q: "How does sale find deals?",
    a: "Follow shops from Search. sale checks their watched pages and lists sales reported for today. Open a deal to see details scraped from that shop’s product page.",
  },
  {
    q: "Why don’t some items have a photo or price?",
    a: "sale only shows photos, prices, reviews, and categories that were found on the shop page. If the listing has none, nothing is filled in.",
  },
  {
    q: "What is Price Drops?",
    a: "Price Drops is a filter on items you already saved. A saved item appears there when its original sale discount is 30% or more. sale does not re-check the price later.",
  },
  {
    q: "How do I follow or unfollow a shop?",
    a: "Use Search, or open a shop and tap Follow. Favourites also appear on your Profile as My Favourite Shops.",
  },
  {
    q: "How do alerts work?",
    a: "Turn Price Alerts on from Profile. Notifications are stored in the sale notifications table and listed here when a watched shop has a sale.",
  },
];

export default function HelpSupportScreen() {
  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <h1 className="h1">Help & Support</h1>
        <p className="subtitle">
          sale watches shops you follow and shows sales as they appear. Here’s how the main pieces work.
        </p>

        <section className="info-block">
          <h2 className="h2">Getting started</h2>
          <ol className="info-steps">
            <li>Follow shops you care about.</li>
            <li>Check Home for today’s sales.</li>
            <li>Tap a deal for the scraped product page, or the heart to save it.</li>
            <li>Buy on the shop’s own website — sale is not a store.</li>
          </ol>
        </section>

        <section className="info-block">
          <h2 className="h2">Common questions</h2>
          <div className="faq-list">
            {FAQS.map((item) => (
              <details key={item.q} className="faq">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="info-block">
          <h2 className="h2">Contact</h2>
          <p>
            For questions about this app, email{" "}
            <a href="mailto:noufa@salescout.app">noufa@salescout.app</a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
