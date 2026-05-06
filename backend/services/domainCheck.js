const banks = require("../data/banks-cl.json");
const scammers = require("../data/scammers-cl.json");

const SCAMMER_DOMAINS = new Set(
  scammers.unauthorizedEntities.flatMap((e) => e.domains)
);

/**
 * Returns the bank name if the domain matches an official bank domain,
 * or null if the domain is not recognized.
 */
function findBank(domain) {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  for (const bank of banks.banks) {
    for (const d of bank.domains) {
      if (normalized === d || normalized.endsWith(`.${d}`)) {
        return bank.name;
      }
    }
  }
  return null;
}

/**
 * Checks a URL against the whitelist.
 * Returns { isSafe, bankName, reason }
 */
function checkDomain(url) {
  let hostname;
  try {
    hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return { isSafe: false, bankName: null, reason: "URL malformada" };
  }

  const bankName = findBank(hostname);
  if (bankName) {
    return { isSafe: true, bankName, reason: `Dominio oficial de ${bankName}` };
  }

  // Check CMF blacklist of unauthorized entities
  if (SCAMMER_DOMAINS.has(hostname)) {
    const entity = scammers.unauthorizedEntities.find((e) => e.domains.includes(hostname));
    return {
      isSafe: false,
      bankName: null,
      cmfAlert: true,
      reason: `Dominio reportado por la CMF como entidad no autorizada: "${entity?.name}"`,
    };
  }

  // Check known phishing patterns from CMF alerts
  for (const pattern of scammers.knownPhishingPatterns) {
    if (hostname.includes(pattern)) {
      return {
        isSafe: false,
        bankName: null,
        cmfAlert: true,
        reason: `El dominio contiene el patrón de phishing conocido "${pattern}"`,
      };
    }
  }

  // Check if hostname mimics a bank name (e.g. bci-seguridad.net)
  for (const bank of banks.banks) {
    for (const d of bank.domains) {
      const base = d.split(".")[0];
      if (hostname.includes(base) && !findBank(hostname)) {
        return {
          isSafe: false,
          bankName: null,
          reason: `El dominio imita a ${bank.name} pero no es el oficial (${d})`,
        };
      }
    }
  }

  return { isSafe: false, bankName: null, reason: "Dominio no reconocido como banco chileno oficial" };
}

module.exports = { checkDomain, findBank };
