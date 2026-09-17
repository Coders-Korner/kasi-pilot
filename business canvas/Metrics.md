<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Metrics

KasiPilot’s success should be measured by whether traders **adopt it, use it consistently, trust the records, and gain real business value**. The most important metrics should focus on the trader’s journey rather than only counting downloads or messages.

## North-star metric

### Verified active traders

> **The number of traders who record at least five confirmed business transactions through KasiPilot within a 30-day period.**

This is a strong primary metric because it measures more than registration. It shows that traders are:

- Onboarded.
- Using the product.
- Recording real business activity.
- Confirming that the system is useful enough to return to.


## Core success metrics

### 1. User acquisition

Measures whether KasiPilot is reaching its target customers.

Track:

- Number of traders contacted.
- Number of traders registered.
- Number of traders successfully onboarded.
- Number of active distributor or community partnerships.
- Number of traders acquired through each channel.
- Cost of acquiring one active trader.


### 2. Activation

Activation measures whether a new user experiences the product’s core value.

Define an activated trader as someone who:

> Completes onboarding and successfully records three confirmed transactions within the first seven days.

Formula:

$$
\text{Activation rate} =
\frac{\text{Users who complete activation}}{\text{Total registered users}}
\times 100
$$

For the hackathon pilot, a realistic target could be:

- 80% of registered traders complete onboarding.
- 70% record at least one transaction.
- 50–60% record three or more transactions in their first week.

Activation is more useful than registrations because it shows whether the product actually works for new users. Product-analytics guidance commonly treats activation, engagement, retention, and conversion as key stages in measuring product value.[^1]

### 3. Engagement and usage

Track how often traders use the service and which features they use.

Important measures:

- Average transactions recorded per trader per week.
- Number of active traders per day and per month.
- Percentage of transactions submitted by voice note.
- Percentage submitted by text.
- Number of stock updates.
- Number of daily or weekly summaries requested.
- Number of low-stock alerts generated.
- Percentage of alerts opened or acknowledged.

A useful definition of an active trader is:

> A trader who submits or confirms at least one valid business transaction during a seven-day period.

### 4. Retention

Retention measures whether traders continue using KasiPilot after trying it.

Track:

- Seven-day retention.
- Thirty-day retention.
- Percentage of traders active in consecutive weeks.
- Number of traders who stop using the system.
- Reasons for inactivity.

Formula:

$$
\text{Retention rate} =
\frac{\text{Users active during a later period}}{\text{Users activated during the original period}}
\times 100
$$

For an early pilot, the most important question is:

> Do traders continue recording business activity after the first demonstration?

### 5. AI and transaction accuracy

Accuracy is one of KasiPilot’s most important technical metrics. If the system records incorrect quantities, prices, or products, traders may quickly lose trust.

Track:

- Percentage of messages correctly classified.
- Percentage of transactions correctly extracted.
- Product-recognition accuracy.
- Quantity-extraction accuracy.
- Price-extraction accuracy.
- Percentage of transactions requiring correction.
- Percentage of unclear messages sent for confirmation.
- Average time from message receipt to confirmation.

A useful accuracy formula is:

$$
\text{Transaction accuracy} =
\frac{\text{Correctly recorded transactions}}{\text{Transactions reviewed}}
\times 100
$$

For the prototype, manually review at least 50–100 test messages. Measure whether the system correctly identifies:

- Transaction type.
- Product.
- Quantity.
- Unit price.
- Total amount.

Do not measure only whether the AI returned valid JSON. The important question is whether the **business meaning** was correct.

### 6. Business impact

These metrics determine whether KasiPilot improves the trader’s business.

Track:

- Percentage of traders using sales records weekly.
- Percentage of traders checking stock information.
- Number of stock-outs reported before and after using KasiPilot.
- Time spent on recordkeeping before and after adoption.
- Percentage of traders who can identify their daily sales.
- Percentage of traders who can identify their best-selling products.
- Percentage of traders who report improved confidence in business decisions.
- Number of traders generating a Readiness Passport.

Research on community retail support programmes has measured outcomes such as whether shop owners maintain purchase and sales records, regularly track profit and loss, and use stock-management practices.[^2]

### 7. Customer satisfaction and trust

A product can have high usage but still fail if users do not trust it.

Ask traders:

- Was KasiPilot easy to use?
- Did it understand your message?
- Did you trust the recorded transaction?
- Did the dashboard help you understand your business?
- Would you recommend it to another trader?
- What made you stop using it, if applicable?

Useful measures:

- User satisfaction rating.
- Percentage of traders willing to recommend the product.
- Number of complaints.
- Number of disputed transactions.
- Number of privacy concerns.
- Percentage of users who understand how their data is used.


### 8. Partner and business metrics

These metrics measure whether distributors, funders, and ESD programmes see value.

Track:

- Number of partnership discussions.
- Number of signed pilot agreements.
- Number of active partner organisations.
- Number of traders referred by each partner.
- Distributor order-processing time.
- Reduction in manual data collection.
- Number of businesses assessed through the Readiness Passport.
- Partner satisfaction.
- Revenue per active trader or per partner.

WhatsApp Business analytics can provide measures such as messages sent, messages received, messages delivered, conversations, and conversation costs.  These should support the product metrics but should not replace them. A large number of messages does not necessarily mean that traders are receiving business value.[^3][^4]

## Recommended pilot targets

For a first pilot with 20–50 traders, use targets such as:


| Area | Pilot target |
| :-- | --: |
| Traders onboarded | 20–50 |
| Onboarding completion | At least 80% |
| Activated traders | At least 60% |
| Monthly active traders | At least 70% of onboarded users |
| Transactions recorded | At least 500 total |
| Correct transaction extraction | At least 90% on supported scenarios |
| Transactions requiring correction | Less than 10–15% |
| Seven-day retention | At least 60% |
| Thirty-day retention | At least 40–50% |
| Traders receiving a summary | At least 50% |
| Traders reporting improved recordkeeping | At least 70% |
| Pilot partner commitments | At least one distributor or trader association |

These are proposed pilot goals, not proven industry benchmarks. You should adjust them after testing with real users.

## Simple measurement plan

### Before the pilot

Ask traders:

- How do you currently record sales?
- How long does recordkeeping take?
- How often do you experience stock-outs?
- Can you calculate daily revenue?
- Have you previously used a business-management application?
- What concerns do you have about sharing business information?


### During the pilot

Automatically record:

- User registrations.
- Messages received.
- Transactions processed.
- Confirmations sent.
- Corrections made.
- Stock alerts.
- Dashboard visits.
- Active users.
- Failed or unclear messages.


### After the pilot

Ask:

- Did KasiPilot save you time?
- Did it help you understand your sales?
- Did it help you manage stock?
- Did you experience fewer stock-outs?
- Would you continue using it?
- Would you pay for it, or would you expect a distributor or programme to sponsor it?
- Which feature was most useful?
- Which feature was confusing?


## Best metrics for the presentation

Do not place every metric on one slide. Use five headline metrics:

1. **Adoption:** Number of traders onboarded.
2. **Activation:** Percentage recording three transactions in seven days.
3. **Usage:** Average confirmed transactions per active trader.
4. **Accuracy:** Percentage of transactions correctly interpreted.
5. **Impact:** Percentage of traders reporting improved sales or stock visibility.

## Business canvas version

> **Key metrics:** Active traders, onboarding and activation rate, transactions recorded, transaction accuracy, voice-note usage, weekly and monthly retention, stock alerts acted upon, reduction in stock-outs, time saved on recordkeeping, user satisfaction, partner adoption, and number of Readiness Passports generated.

## Short presentation version

> KasiPilot will measure success through the number of active traders, onboarding and retention rates, transactions recorded, AI extraction accuracy, stock-alert usage, and improvements in recordkeeping. During the pilot, we will compare traders’ ability to track sales and stock before and after using KasiPilot, while collecting user feedback and monitoring whether distributors or support organisations are willing to continue the partnership.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://amplitude.com/explore/analytics/product-analytics-guide

[^2]: http://www.jobsfund.org.za/docs/2021-06 JF Learning Series Emerging Community Retail Businesses Paper 2.pdf

[^3]: https://developers.facebook.com/docs/whatsapp/business-management-api/analytics/

[^4]: https://whatsappbusiness.com/wp-content/uploads/2026/04/How-to-Measure-Campaign-Effectiveness-with-the-WhatsApp-Business-Platform.pdf

[^5]: https://business.whatsapp.com/blog/how-to-get-started-with-whatsapp-business-api

[^6]: https://whatsappbusiness.com/blog/measure-whatsapp-campaign-effectiveness/

[^7]: https://mixpanel.com/wp-content/uploads/2023/11/eBook_Guide-to-Product-Metrics.pdf

[^8]: https://www.basedash.com/startup-metrics/product-metrics

[^9]: https://cdn.prod.website-files.com/622d3d1f98d09af01f927fb9/640f4a4993d5dabfc06797fb_speedinvest-pirates-the-ultimate-guide-to-startup-metrics.pdf

[^10]: https://support.chatarchitect.com/books/meta-whatsapp/page/viewing-metrics-developer-documentation/revisions/126

[^11]: https://static1.squarespace.com/static/5facca71a363746603c14e78/t/64e44447f945e07a9b6f6b9f/1692681295909/The+Amplitude+Guide+to+Product+Metrics.pdf

[^12]: https://www.fullsession.io/blog/product-engagement-metrics/

[^13]: https://productfolio.com/key-product-metrics/

[^14]: https://www.theproductconsortium.com/articles/product-101-activation-retention-engagement

[^15]: https://bfaglobal.com/digital-spazas/insights/digital-innovations-to-build-the-resilience-of-south-african-spazas-the-case-of-yebo-fresh-and-vuleka/

