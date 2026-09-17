<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Proposed solution

KasiPilot is a WhatsApp-based digital business assistant that helps informal traders record sales, manage stock, and build reliable business records through simple text messages or voice notes.

Instead of requiring traders to use complicated accounting software, KasiPilot allows them to communicate naturally through a platform they already understand.

## How the solution works

1. The trader sends a WhatsApp message or voice note.
2. KasiPilot converts the voice note to text when necessary.
3. The AI identifies important transaction details such as the product, quantity, price, and transaction type.
4. The system validates the information.
5. The transaction is saved in the trader’s digital ledger.
6. Stock, revenue, and dashboard information are updated.
7. The trader receives a confirmation or clarification question.

### Example

Trader sends:

> “I sold four kotas at R35 each.”

KasiPilot records:

```text
Transaction type: Sale
Product: Kota
Quantity: 4
Unit price: R35
Total: R140
```

The trader then receives:

> “Recorded: 4 kotas sold at R35 each. Total sales: R140.”

If the message is unclear, KasiPilot should ask for confirmation:

> “Did you sell 4 kotas at R35 each, or was R35 the total amount?”

## Main features

### Conversational sales recording

Traders can record sales using ordinary language rather than completing complicated forms.

### Voice-note support

A trader can speak instead of typing, which is useful when they are busy serving customers or are more comfortable communicating verbally.

### Digital sales ledger

Each confirmed transaction is stored in an organised digital record that can be searched and reviewed later.

### Stock management

The system updates product quantities and can show which items are running low.

### Business dashboard

The trader can view:

- Daily sales.
- Revenue.
- Number of transactions.
- Best-selling products.
- Current stock levels.
- Low-stock items.
- Basic profit estimates.


### Automated alerts

KasiPilot can notify the trader when stock falls below a selected threshold.

### Readiness Passport

Over time, the system can generate a business profile based on verified trading activity, including:

- Sales history.
- Revenue trends.
- Stock movement.
- Business consistency.
- Possible compliance information.

This could help traders demonstrate business activity to suppliers, funders, banks, and ESD programmes.

## Solution flow

```text
Trader sends WhatsApp text or voice note
                    ↓
          Message received by webhook
                    ↓
         Voice converted to text if needed
                    ↓
       AI extracts structured transaction data
                    ↓
            System validates the details
                    ↓
       Sales and inventory records are updated
                    ↓
     Dashboard and alerts provide useful feedback
```

The WhatsApp Business Cloud API is suitable for this approach because incoming messages are delivered to the application through webhooks, which are HTTP requests sent to the project’s server.[^1]

## What makes the solution different?

KasiPilot’s main difference is not simply that it stores sales data. Its advantage is the way the information is captured.

Traditional business applications often require users to:

- Open an application.
- Navigate through several screens.
- Select products manually.
- Enter quantities and prices.
- Save the transaction.

KasiPilot reduces this process to a natural message:

> “I bought two boxes of bread and sold six loaves.”

The system then turns the conversation into structured business information.

## Hackathon prototype

For the hackathon, the solution should focus on a small but convincing prototype:

- Accept text messages and a limited number of voice notes.
- Recognise common transactions such as sales, purchases, and stock updates.
- Extract product, quantity, price, and transaction type.
- Save the information in a database.
- Display the results on a simple dashboard.
- Demonstrate one low-stock alert.
- Show a sample Readiness Passport.

Do not try to build the complete marketplace, banking integration, or full financial platform during the hackathon.

## Formal solution statement

> KasiPilot is a conversational business-management assistant that enables informal traders to record sales and stock updates through WhatsApp text or voice messages. The system uses AI to convert natural-language messages into validated digital transactions, updates the trader’s records, provides business insights and stock alerts, and gradually builds a verified business profile that can support access to funding, suppliers, and business-development opportunities.

## Short presentation version

> KasiPilot gives informal traders a simple way to manage their businesses through WhatsApp. Traders can send text messages or voice notes to record sales and stock updates. KasiPilot uses AI to interpret these messages, update a digital ledger, provide dashboard insights, send low-stock alerts, and build a business-readiness profile over time.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://developers.facebook.com/docs/whatsapp/cloud-api/overview/

[^2]: https://whatsappbusiness.com/developers/developer-hub/

[^3]: https://developers.facebook.com/docs/whatsapp/cloud-vs-onprem/

[^4]: https://github.com/WhatsApp/WhatsApp-Nodejs-SDK

[^5]: https://africa.com/meta-drives-r16-billion-economic-impact-for-south-african-businesses/

[^6]: https://wpp-cloud.com/docs/guides/webhooks

[^7]: https://meta-cloud-api-docs.dev.votewa.gov/

[^8]: https://cloud-api.azure.tsu.edu/

[^9]: https://developers.facebook.com/docs/whatsapp/webhooks/

[^10]: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/

[^11]: https://developers.facebook.com/docs/whatsapp/cloud-api/

[^12]: https://developers.facebook.com/docs/whatsapp/cloud-api/guides

[^13]: https://open.uct.ac.za/server/api/core/bitstreams/402bc0b2-0655-436c-8667-117bc6187b07/content

[^14]: https://alternation.ukzn.ac.za/wp-content/uploads/2025/10/02-mzingelwa-min.pdf

[^15]: https://bfaglobal.com/digital-spazas/insights/building-the-resilience-of-south-african-spazas-through-digitization/

