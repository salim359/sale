import BrandLogo from "../components/BrandLogo";
import PageHeader from "../components/PageHeader";

export default function AboutScreen() {
  return (
    <div className="screen">
      <div className="scroll">
        <PageHeader back />
        <div className="about-app">
          <BrandLogo height={36} />
          <h1 className="h1">About sale</h1>
          <p className="subtitle">
            Your favourite shops. We’ll let you know when it’s on sale.
          </p>
        </div>

        <section className="info-block">
          <h2 className="h2">What sale is</h2>
          <p>
            sale is a watcher, not a shop. Follow stores from the catalog, see sales detected on
            their pages, save the ones you want, and jump to the real product page to buy.
          </p>
        </section>

        <section className="info-block">
          <h2 className="h2">Where the data comes from</h2>
          <p>
            Shops and daily sales come from the live Sale Scout catalog. Item photos, descriptions,
            reviews, and categories are read from the shop’s own pages when those pages have them.
          </p>
        </section>

        <section className="info-block">
          <h2 className="h2">Version</h2>
          <p>sale 0.1.0</p>
        </section>
      </div>
    </div>
  );
}
