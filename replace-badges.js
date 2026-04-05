const fs = require('fs');
const files = ['index.html', 'shop.html', 'cart.html', 'checkout.html', 'product.html', 'about.html', 'contact.html', 'wishlist.html'];

const regex = /<div class="footer-payments">\s*<span class="pay-badge">UPI<\/span>\s*<span class="pay-badge">VISA<\/span>\s*<span class="pay-badge">MasterCard<\/span>\s*<span class="pay-badge">NetBanking<\/span>\s*<\/div>/g;

const replace = `<div class="footer-payments">
          <span class="pay-badge" aria-label="UPI">
            <svg viewBox="0 0 24 24" width="32" height="18" fill="currentColor"><text x="1" y="18" font-family="sans-serif" font-weight="800" font-style="italic" font-size="16">UPI</text></svg>
          </span>
          <span class="pay-badge" aria-label="VISA">
            <svg viewBox="0 0 24 24" width="36" height="18" fill="currentColor"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg>
          </span>
          <span class="pay-badge" aria-label="MasterCard">
            <svg viewBox="0 0 24 24" width="36" height="18" fill="currentColor"><path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z"/></svg>
          </span>
          <span class="pay-badge" aria-label="NetBanking">
            <svg viewBox="0 0 24 24" width="28" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
        </div>`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, src.replace(regex, replace));
    console.log('Replaced ' + f);
  } else {
    console.log('Missing ' + f);
  }
});
