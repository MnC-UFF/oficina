/* Cientista de Papel: settings for the online version. Leave a value empty ('') to turn that part off.
   placar: address of the Cloudflare Worker that counts the printed dolls (see placar/README.md),
           e.g. 'https://placar-cientista.SEU-NOME.workers.dev'
   ga:     Google Analytics measurement ID, e.g. 'G-XXXXXXXXXX'. With it set, the page asks for cookie consent
           first and loads Analytics only after "Aceito" (Google signals and ad personalisation stay off).
   gaHosts: Analytics runs only on these sites (so copies and tests elsewhere are not counted). */
window.CDP_CONFIG = {
  placar: 'https://placar-cientista.uff-mnc.workers.dev',
  ga: 'G-J74K39BFNH',
  gaHosts: ['mnc-uff.github.io'],
};
