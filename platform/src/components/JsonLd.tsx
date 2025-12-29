import React from 'react';

export default function JsonLd() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://safedocs.com';

    const organizationData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "SafeDocs",
        "url": appUrl,
        "logo": `${appUrl}/logo.png`,
        "sameAs": [
            "https://twitter.com/safedocs",
            "https://linkedin.com/company/safedocs"
        ],
        "description": "Enterprise-grade document security powered by AI and CDR technology."
    };

    const productData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "SafeDocs Platform",
        "operatingSystem": "Web",
        "applicationCategory": "CybersecurityApplication",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "1250"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
            />
        </>
    );
}
