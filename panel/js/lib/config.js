// Panel configuration. The public key must match LICENSE_PUBLIC_KEY on the server.
module.exports = {
  apiBase: "https://www.postkitlb.com",
  licensePublicKey: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAENcQjg48EdF/vGxWegL0P48I7j9Ia
JieSEMz8cukieEQv4G+M3xsXpOGJddzUeUi64oxcrbR7zS0KiONNYdLSmQ==
-----END PUBLIC KEY-----`,
  /** How often the panel re-checks the licence with the server. */
  checkEveryMs: 24 * 60 * 60 * 1000,
};
