import Link from "next/link";
import { fill, t } from "@/lib/i18n";
import { ITEMS, yearlySavingUsd } from "@/lib/plans";
import { site } from "@/lib/env";
import { TimelineDemo } from "@/components/TimelineDemo";
import { BuyButton } from "@/components/BuyButton";

export default function Home() {
  const plans = [
    { item: ITEMS.monthly, copy: t.pricing.monthly, note: null as string | null },
    { item: ITEMS.yearly, copy: t.pricing.yearly, note: fill(t.pricing.save, { n: yearlySavingUsd }) },
  ];

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero__text">
            <h1 className="hero__title">{t.hero.title}</h1>
            <p className="hero__lede">{t.hero.lede}</p>
            <div className="hero__actions">
              <Link className="btn btn--primary" href="#pricing">
                {t.hero.ctaPrimary}
              </Link>
              <Link className="btn btn--quiet" href="#tools">
                {t.hero.ctaSecondary}
              </Link>
            </div>
            <p className="hero__compat">{t.hero.compat}</p>
          </div>
          <TimelineDemo
            label={t.hero.demo.label}
            removed={t.hero.demo.removed}
            playLabel={t.hero.demo.play}
            pauseLabel={t.hero.demo.pause}
            sequence={t.hero.demo.sequence}
            tracks={t.hero.demo.tracks}
          />
        </div>
      </section>

      <section id="tools" className="section">
        <div className="wrap">
          <header className="section__head">
            <h2>{t.tools.title}</h2>
            <p>{t.tools.lede}</p>
          </header>
          <div className="tools__ai">
            <h3>{t.tools.ai.name}</h3>
            <p>{t.tools.ai.body}</p>
          </div>
          {t.tools.groups.map((group) => (
            <div key={group.name} className="tools__group">
              <h3 className="tools__group-name">{group.name}</h3>
              <dl className="tools">
                {group.items.map((tool) => (
                  <div key={tool.name} className="tools__row">
                    <dt>{tool.name}</dt>
                    <dd>{tool.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="tools__next">{t.tools.next}</p>
        </div>
      </section>

      <section className="section section--captions">
        <div className="wrap">
          <header className="section__head">
            <h2>{t.captions.title}</h2>
            <p>{t.captions.lede}</p>
          </header>
          <ul className="styles" role="list">
            {t.captions.styles.map((style, i) => (
              <li key={style.name} className={`styles__item styles__item--${i + 1}`}>
                <div className="styles__frame" aria-hidden="true">
                  <p className="styles__caption" dir="rtl">
                    {style.name === "Corniche" ? (
                      <>
                        <span>بلا ولا سكوت</span>
                        <span className="styles__latin" dir="ltr">no silence at all</span>
                      </>
                    ) : (
                      t.captions.sample.split(" ").map((w, j) => (
                        <span key={j} className={j === 1 ? "is-on" : undefined}>
                          {w}
                        </span>
                      ))
                    )}
                  </p>
                </div>
                <p className="styles__name" dir="ltr">{style.name}</p>
                <p className="styles__note">{style.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <header className="section__head">
            <h2>{t.steps.title}</h2>
          </header>
          <ol className="steps">
            {t.steps.items.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="section section--pricing">
        <div className="wrap">
          <header className="section__head">
            <h2>{t.pricing.title}</h2>
            <p>{t.pricing.lede}</p>
          </header>

          <div className="pricing">
            <div className="pricing__plans">
              {plans.map(({ item, copy, note }) => (
                <div key={item.id} className={`plan${item.id === "yearly" ? " plan--yearly" : ""}`}>
                  <h3 className="plan__name">{copy.name}</h3>
                  <p className="plan__price" dir="ltr">
                    <span className="plan__amount">${item.priceUsd}</span> <span className="plan__per">{copy.per}</span>
                  </p>
                  <p className="plan__note">{note ?? " "}</p>
                  <BuyButton
                    item={item.id}
                    label={fill(t.pricing.pay, { price: item.priceUsd })}
                    busyLabel={t.checkout.redirecting}
                    errors={t.checkout.errors}
                    variant={item.id === "yearly" ? "primary" : "quiet"}
                  />
                </div>
              ))}
            </div>

            <div className="pricing__details">
              <ul className="ticks">
                {t.pricing.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="pricing__fine">{t.pricing.whishNote}</p>
              <p className="pricing__fine">{t.pricing.noRenew}</p>
            </div>
          </div>

          {site.aiEditor && (
            <div className="credits-pack">
              <div>
                <h3>{t.pricing.credits.name}</h3>
                <p>{t.pricing.credits.body}</p>
              </div>
              <BuyButton
                item="credits1000"
                label={t.pricing.credits.pay}
                busyLabel={t.checkout.redirecting}
                errors={t.checkout.errors}
                variant="quiet"
              />
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="section">
        <div className="wrap">
          <header className="section__head">
            <h2>{t.faq.title}</h2>
          </header>
          <div className="faq">
            {t.faq.items.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
