import { initializeStorage } from './storage.js';
import urlShortener from './url-shortener.js';

const DEFAULT_ALLOWED_SITES = [
    '*://*.www.9anime.to/*',
    '*://*.www.forbes.com/*'
];

const STATIC_AD_SERVERS = [
    'partner.googleadservices.com',
    'googlesyndication.com',
    'google-analytics.com',
    'doubleclick.net',
    'facebook.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'analytics.twitter.com',
    'amazon-adsystem.com',
    'scorecardresearch.com',
    "*://partner.googleadservices.com/*",
	"*://*.googlesyndication.com/*",
	"*://*.google-analytics.com/*",
	"*://creative.ak.fbcdn.net/*",
	"*://*.adbrite.com/*",
	"*://*.exponential.com/*",
	"*://*.quantserve.com/*",
	"*://*.scorecardresearch.com/*",
	"*://*.zedo.com/*",
	"*://*.smartadserver.com/*",
	"*://*.revrtb.com/*",
	"*://*.run-syndicate.com/*",
	"*://*.c.bebi.com/*",
	"*://*.source.bidgear.com/*",
	"*://*.demand.bidgear.com/*",
	"*://*.smartyads.com/*",
	"*://*.adconstructor.com/*",
	"*://*.addispenser.com/*",
	"*://*.adbutler.com/*",
	"*://*.adjuggler.com/*",
	"*://*.adlantis.com/*",
	"*://*.adnologies.com/*",
	"*://*.adplugg.com/*",
	"*://*.adpreference.com/*",
	"*://*.adserversolutions.com/*",
	"*://*.adspeed.com/*",
	"*://*.adspirit.com/*",
	"*://*.adtech.com/*",
	"*://*.advertiseserve.com/*",
	"*://*.adzerk.com/*",
	"*://*.aerserv.com/*",
	"*://*.appnexus.com/*",
	"*://*.broadstreetads.com/*",
	"*://*.djaxadserver.com/*",
	"*://*.epom.com/*",
	"*://*.exads.com/*",
	"*://*.flashtalking.com/*",
	"*://*.madserve.com/*",
	"*://*.moceanmobile.com/*",
	"*://*.mopub.com/*",
	"*://*.clippersoft.com/*",
	"*://*.adserver.com/*",
	"*://*.nexage.com/*",
	"*://*.noprimetime.com/*",
	"*://*.openx.com/*",
	"*://*.operative.com/*",
	"*://*.obitopenadserver.com/*",
	"*://*.otlix.com/*",
	"*://*.pointroll.com/*",
	"*://*.revive-adserver.com/*",
	"*://*.rightmedia.com/*",
	"*://*.rubiconproject.com/*",
	"*://*.sitescout.com/*",
	"*://*.smaato.com/*",
	"*://*.smartadserver.com/*",
	"*://*.spiralaxis.com/*",
	"*://*.tradedoubler.com/*",
	"*://*.ultraadserver.com/*",
	"*://*.valuead.com/*",
	"*://*.viewzd.com/*",
	"*://*.outbrainimg.com/*",
	"*://*.outbrain.com/*",
	"*://*.searchmulty.com/*",
	"*://*.worldofwarships.com/*",
	"*://*.adrecover.com/*",
	"*://*.ads.doubleclick.net/*",
	"*://*.s.ytimg.com/*",
	"*://*.ad.youtube.com/*",
	"*://*.ads.youtube.com/*",
	"*://*.clients1.google.com/*",
	"*://*.dts.innovid.com/*",
	"*://*.googleads4.g.doubleclick.net/*",
	"*://*.pagead2.googlesyndication.com/*",
	"*://*.pixel.moatads.com/*",
	"*://*.rtd.tubemogul.com/*",
	"*://*.s.innovid.com/*",
	"*://*.pubads.g.doubleclick.net/*",
	"*://*.ssl.google-analytics.com/*",
	"*://*.www-google-analytics.l.google.com/*",
	"*://*.stats.g.doubleclick.net/*",
	"*://*.clients.l.google.com/*",
	"*://*.pagead.l.doubleclick.net/*",
	"*://*.www-googletagmanager.l.google.com/*",
	"*://*.googleadapis.l.google.com/*",
	"*://*.s0.2mdn.net/*",
	"*://*.googleads.g.doubleclick.net/*",
	"*://*.files.adform.net/*",
	"*://*.secure-ds.serving-sys.com/*",
	"*://*.securepubads.g.doubleclick.net/*",
	"*://*.s.youtube.com/*",
	"*://*.2975c.v.fwmrm.net/*",
	"*://*.static.doubleclick.net/*",
	"*://*.googleadservices.com/*",
	"*://*.ad-g.doubleclick.net/*",
	"*://*.ad.doubleclick.net/*",
	"*://*.ad.mo.doubleclick.net/*",
	"*://*.doubleclick.net/*",
	"*://*.pagead.googlesyndication.com/*",
	"*://*.pagead1.googlesyndication.com/*",
	"*://*.www.googleadservices.com/*",
	"*://*.analytic-google.com/*",
	"*://*.www.analytic-google.com/*",
	"*://*.www.googletagservices.com/*",
	"*://*.fwmrm.net/*",
	"*://*.innovid.com/*",
	"*://*.2mdn.net/*",
	"*://*.r8.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r8---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r6.sn-4g5ednll.googlevideo.com/*",
	"*://*.r6.sn-4g5edney.googlevideo.com/*",
	"*://*.r6.sn-4g5ednek.googlevideo.com/*",
	"*://*.r6.sn-4g5ednee.googlevideo.com/*",
	"*://*.r6.sn-4g5edn7e.googlevideo.com/*",
	"*://*.r6.sn-4g5e6nez.googlevideo.com/*",
	"*://*.r6---sn-4g5ednll.googlevideo.com/*",
	"*://*.r6---sn-4g5edney.googlevideo.com/*",
	"*://*.r6---sn-4g5ednek.googlevideo.com/*",
	"*://*.r6---sn-4g5ednee.googlevideo.com/*",
	"*://*.r6---sn-4g5edn7e.googlevideo.com/*",
	"*://*.r6---sn-4g5e6nez.googlevideo.com/*",
	"*://*.r5.sn-h0jeenek.googlevideo.com/*",
	"*://*.r5.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r5.sn-4g5ednsz.googlevideo.com/*",
	"*://*.r5.sn-4g5ednsy.googlevideo.com/*",
	"*://*.r5.sn-4g5ednsr.googlevideo.com/*",
	"*://*.r5.sn-4g5ednsl.googlevideo.com/*",
	"*://*.r5.sn-4g5ednsd.googlevideo.com/*",
	"*://*.r5.sn-4g5edns6.googlevideo.com/*",
	"*://*.r5.sn-4g5ednly.googlevideo.com/*",
	"*://*.r5.sn-4g5edn7s.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nzl.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nze.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nz7.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nss.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r5.sn-4g5e6ns7.googlevideo.com/*",
	"*://*.r5.sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r5.sn-4g5e6nls.googlevideo.com/*",
	"*://*.r5.sn-4g5e6ney.googlevideo.com/*",
	"*://*.r5.sn-4g5e6n7r.googlevideo.com/*",
	"*://*.r5.sn-4g5e6n7k.googlevideo.com/*",
	"*://*.r5---sn-h0jeenek.googlevideo.com/*",
	"*://*.r5---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r5---sn-4g5ednsz.googlevideo.com/*",
	"*://*.r5---sn-4g5ednsy.googlevideo.com/*",
	"*://*.r5---sn-4g5ednsr.googlevideo.com/*",
	"*://*.r5---sn-4g5ednsl.googlevideo.com/*",
	"*://*.r5---sn-4g5ednsd.googlevideo.com/*",
	"*://*.r5---sn-4g5edns6.googlevideo.com/*",
	"*://*.r5---sn-4g5ednly.googlevideo.com/*",
	"*://*.r5---sn-4g5edn7s.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nzl.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nze.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nz7.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nss.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r5---sn-4g5e6ns7.googlevideo.com/*",
	"*://*.r5---sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r5---sn-4g5e6nls.googlevideo.com/*",
	"*://*.r5---sn-4g5e6ney.googlevideo.com/*",
	"*://*.r5---sn-4g5e6n7r.googlevideo.com/*",
	"*://*.r5---sn-4g5e6n7k.googlevideo.com/*",
	"*://*.r4.sn-4g5ednz7.googlevideo.com/*",
	"*://*.r4.sn-4g5ednsy.googlevideo.com/*",
	"*://*.r4.sn-4g5ednsk.googlevideo.com/*",
	"*://*.r4.sn-4g5ednsd.googlevideo.com/*",
	"*://*.r4---sn-4g5ednz7.googlevideo.com/*",
	"*://*.r4---sn-4g5ednsy.googlevideo.com/*",
	"*://*.r4---sn-4g5ednsk.googlevideo.com/*",
	"*://*.r4---sn-4g5ednsd.googlevideo.com/*",
	"*://*.r3.sn-4g5ednz7.googlevideo.com/*",
	"*://*.r3.sn-4g5ednss.googlevideo.com/*",
	"*://*.r3.sn-4g5ednsd.googlevideo.com/*",
	"*://*.r3.sn-4g5ednls.googlevideo.com/*",
	"*://*.r3.sn-4g5ednll.googlevideo.com/*",
	"*://*.r3.sn-4g5ednee.googlevideo.com/*",
	"*://*.r3.sn-4g5edned.googlevideo.com/*",
	"*://*.r3.sn-4g5edne7.googlevideo.com/*",
	"*://*.r3.sn-4g5edne6.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nzz.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nzs.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nle.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nld.googlevideo.com/*",
	"*://*.r3---sn-4g5ednz7.googlevideo.com/*",
	"*://*.r3---sn-4g5ednss.googlevideo.com/*",
	"*://*.r3---sn-4g5ednsd.googlevideo.com/*",
	"*://*.r3---sn-4g5ednls.googlevideo.com/*",
	"*://*.r3---sn-4g5ednll.googlevideo.com/*",
	"*://*.r3---sn-4g5ednee.googlevideo.com/*",
	"*://*.r3---sn-4g5edned.googlevideo.com/*",
	"*://*.r3---sn-4g5edne7.googlevideo.com/*",
	"*://*.r3---sn-4g5edne6.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nzz.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nzs.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nle.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nld.googlevideo.com/*",
	"*://*.r2.sn-hp57kn6e.googlevideo.com/*",
	"*://*.r2.sn-h0jeln7e.googlevideo.com/*",
	"*://*.r2.sn-h0jeener.googlevideo.com/*",
	"*://*.r2.sn-h0jeen76.googlevideo.com/*",
	"*://*.r2.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r2.sn-4g5ednly.googlevideo.com/*",
	"*://*.r2.sn-4g5ednls.googlevideo.com/*",
	"*://*.r2.sn-4g5ednle.googlevideo.com/*",
	"*://*.r2.sn-4g5ednee.googlevideo.com/*",
	"*://*.r2.sn-4g5edned.googlevideo.com/*",
	"*://*.r2.sn-4g5edn7y.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r2.sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nl7.googlevideo.com/*",
	"*://*.r2.sn-4g5e6ney.googlevideo.com/*",
	"*://*.r2---sn-hp57kn6e.googlevideo.com/*",
	"*://*.r2---sn-h0jeln7e.googlevideo.com/*",
	"*://*.r2---sn-h0jeener.googlevideo.com/*",
	"*://*.r2---sn-h0jeen76.googlevideo.com/*",
	"*://*.r2---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r2---sn-4g5ednse.googlevideo.com/*",
	"*://*.r2---sn-4g5ednly.googlevideo.com/*",
	"*://*.r2---sn-4g5ednls.googlevideo.com/*",
	"*://*.r2---sn-4g5ednle.googlevideo.com/*",
	"*://*.r2---sn-4g5ednee.googlevideo.com/*",
	"*://*.r2---sn-4g5edned.googlevideo.com/*",
	"*://*.r2---sn-4g5edn7y.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nsz.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nsk.googlevideo.com/*",
	"*://*.r2---sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nl7.googlevideo.com/*",
	"*://*.r2---sn-4g5e6ney.googlevideo.com/*",
	"*://*.r15.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r15---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r11.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r11---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r10.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r10---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r1.sn-h0jeln7e.googlevideo.com/*",
	"*://*.r1.sn-h0jeened.googlevideo.com/*",
	"*://*.r1.sn-h0jeen76.googlevideo.com/*",
	"*://*.r1.sn-4g5ednsd.googlevideo.com/*",
	"*://*.r1.sn-4g5ednly.googlevideo.com/*",
	"*://*.r1.sn-4g5ednll.googlevideo.com/*",
	"*://*.r1.sn-4g5edne6.googlevideo.com/*",
	"*://*.r1.sn-4g5e6nzz.googlevideo.com/*",
	"*://*.r1.sn-4g5e6nz7.googlevideo.com/*",
	"*://*.r1.sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r1.sn-4g5e6nez.googlevideo.com/*",
	"*://*.r1---sn-h0jeln7e.googlevideo.com/*",
	"*://*.r1---sn-h0jeened.googlevideo.com/*",
	"*://*.r1---sn-h0jeen76.googlevideo.com/*",
	"*://*.r1---sn-4g5ednsd.googlevideo.com/*",
	"*://*.r1---sn-4g5ednly.googlevideo.com/*",
	"*://*.r1---sn-4g5ednll.googlevideo.com/*",
	"*://*.r1---sn-4g5edne6.googlevideo.com/*",
	"*://*.r1---sn-4g5e6nzz.googlevideo.com/*",
	"*://*.r1---sn-4g5e6nz7.googlevideo.com/*",
	"*://*.r1---sn-4g5e6nsy.googlevideo.com/*",
	"*://*.r1---sn-4g5e6ns7.googlevideo.com/*",
	"*://*.r1---sn-4g5e6nez.googlevideo.com/*",
	"*://*.manifest.googlevideo.com/*",
	"*://*.r8.sn-n02xgoxufvg3-2gbs.googlevideo.com/*",
	"*://*.r8---sn-n02xgoxufvg3-2gbs.googlevideo.com/*",
	"*://*.r6.sn-4g5edne7.googlevideo.com/*",
	"*://*.r6---sn-4g5edne7.googlevideo.com/*",
	"*://*.r5.sn-hp57yn7y.googlevideo.com/*",
	"*://*.r5---sn-hp57yn7y.googlevideo.com/*",
	"*://*.r4.sn-h0jeln7l.googlevideo.com/*",
	"*://*.r4.sn-h0jeln7e.googlevideo.com/*",
	"*://*.r4.sn-h0jeened.googlevideo.com/*",
	"*://*.r4.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r4.sn-4g5edns7.googlevideo.com/*",
	"*://*.r4.sn-4g5ednly.googlevideo.com/*",
	"*://*.r4.sn-4g5ednld.googlevideo.com/*",
	"*://*.r4.sn-4g5edney.googlevideo.com/*",
	"*://*.r4.sn-4g5e6nzs.googlevideo.com/*",
	"*://*.r4.sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r4.sn-4g5e6nez.googlevideo.com/*",
	"*://*.r4---sn-h0jeln7l.googlevideo.com/*",
	"*://*.r4---sn-h0jeln7e.googlevideo.com/*",
	"*://*.r4---sn-h0jeened.googlevideo.com/*",
	"*://*.r4---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r4---sn-4g5edns7.googlevideo.com/*",
	"*://*.r4---sn-4g5ednly.googlevideo.com/*",
	"*://*.r4---sn-4g5ednld.googlevideo.com/*",
	"*://*.r4---sn-4g5edney.googlevideo.com/*",
	"*://*.r4---sn-4g5e6nzs.googlevideo.com/*",
	"*://*.r4---sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r4---sn-4g5e6nez.googlevideo.com/*",
	"*://*.r3.sn-4g5ednzz.googlevideo.com/*",
	"*://*.r3.sn-4g5ednsz.googlevideo.com/*",
	"*://*.r3.sn-4g5edns6.googlevideo.com/*",
	"*://*.r3.sn-4g5ednld.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nsr.googlevideo.com/*",
	"*://*.r3.sn-4g5e6nl7.googlevideo.com/*",
	"*://*.r3---sn-4g5ednzz.googlevideo.com/*",
	"*://*.r3---sn-4g5ednsz.googlevideo.com/*",
	"*://*.r3---sn-4g5edns6.googlevideo.com/*",
	"*://*.r3---sn-4g5ednld.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nsr.googlevideo.com/*",
	"*://*.r3---sn-4g5e6nl7.googlevideo.com/*",
	"*://*.r2.sn-4g5ednse.googlevideo.com/*",
	"*://*.r2.sn-4g5ednld.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nzl.googlevideo.com/*",
	"*://*.r2.sn-4g5e6nez.googlevideo.com/*",
	"*://*.r2---sn-4g5ednld.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nzl.googlevideo.com/*",
	"*://*.r2---sn-4g5e6nez.googlevideo.com/*",
	"*://*.r1.sn-4g5ednsr.googlevideo.com/*",
	"*://*.r1.sn-4g5ednsl.googlevideo.com/*",
	"*://*.r1.sn-4g5ednse.googlevideo.com/*",
	"*://*.r1.sn-4g5edned.googlevideo.com/*",
	"*://*.r1.sn-4g5e6ns7.googlevideo.com/*",
	"*://*.r1.sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r1.sn-4g5e6nl6.googlevideo.com/*",
	"*://*.r1.sn-4g5e6ne6.googlevideo.com/*",
	"*://*.r1---sn-4g5ednsr.googlevideo.com/*",
	"*://*.r1---sn-4g5ednsl.googlevideo.com/*",
	"*://*.r1---sn-4g5ednse.googlevideo.com/*",
	"*://*.r1---sn-4g5edned.googlevideo.com/*",
	"*://*.r1---sn-4g5e6ns6.googlevideo.com/*",
	"*://*.r1---sn-4g5e6nl6.googlevideo.com/*",
	"*://*.r1---sn-4g5e6ne6.googlevideo.com/*",
	"*://*.r2---sn-5hne6n7z.googlevideo.com/*",
	"*://*.r2---sn-25ge7nsd.googlevideo.com/*",
	"*://*.r4---sn-25ge7nsk.googlevideo.com/*",
	"*://*.r6---sn-25ge7nsl.googlevideo.com/*",
	"*://*.r1---sn-25glen7y.googlevideo.com/*",
	"*://*.r1---sn-25glenez.googlevideo.com/*",
	"*://*.r10---sn-4gxx-25gel.googlevideo.com/*",
	"*://*.r11---sn-4gxx-25ge7.googlevideo.com/*",
	"*://*.r4---sn-4gxx-25gee.googlevideo.com/*",
	"*://*.r16---sn-4gxx-25ge7.googlevideo.com/*",
	"*://*.r3---sn-4gxx-25gel.googlevideo.com/*",
	"*://*.r1---sn-4gxx-25gel.googlevideo.com/*",
	"*://*.r9---sn-4gxx-25gel.googlevideo.com/*",
	"*://*.r9---sn-4gxx-25gy.googlevideo.com/*",
	"*://*.r6---sn-4g5e6nes.googlevideo.com/*",
	"*://*.googlesyndication.com/*",
	"*://*.googleads.g.doublick.net/*",
	"*://*.www.doubleclick.net/*",
	"*://*.tpc.googlesyndication.com/*",
];

let currentRules = [];
let isInitialized = false;
let performanceStats = {
    dataSaved: 0,
    timeSaved: 0,
    totalBlocked: 0
};

// Generate unique rule IDs using domain hash
const generateRuleId = (domain) => {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
        hash = (hash << 5) - hash + domain.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

async function updateBlockLists() {
    try {
        const { userSettings } = await chrome.storage.local.get('userSettings');
        const domainsToBlock = userSettings?.autoUpdateLists === false
            ? STATIC_AD_SERVERS
            : [...new Set([...STATIC_AD_SERVERS, ...(await fetchDynamicTrackerLists())])];

        await updateBlockingRules(domainsToBlock);
    } catch (error) {
        console.error('Failed to update block lists:', error);
        throw error;
    }
}

async function fetchDynamicTrackerLists() {
    try {
        const response = await fetch('https://whotracks.me/trackers.json', {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Object.keys(data.trackers);
    } catch (error) {
        console.error('Failed to fetch dynamic lists:', error);
        return [];
    }
}

async function updateBlockingRules(domainsToBlock) {
    try {
        const { userSettings } = await chrome.storage.local.get('userSettings');
        if (userSettings?.blockingEnabled === false) return;

        const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
        const allowedDomains = getAllowedDomains(storedArray);

        const newRules = domainsToBlock.map(domain => ({
            id: generateRuleId(domain),
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: `||${domain}`,
                excludedDomains: allowedDomains,
                resourceTypes: ['script', 'image', 'stylesheet', 'xmlhttprequest', 'other']
            }
        }));

        if (!rulesChanged(newRules)) return;

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: currentRules.map(rule => rule.id),
            addRules: newRules
        });

        currentRules = newRules;
    } catch (error) {
        console.error('Rule update failed:', error);
        throw error;
    }
}

function rulesChanged(newRules) {
    return currentRules.length !== newRules.length ||
        currentRules.some((rule, i) => rule.condition.urlFilter !== newRules[i].condition.urlFilter);
}

function getAllowedDomains(storedArray) {
    const domains = new Set();
    for (const urlPattern of storedArray) {
        try {
            const url = new URL(urlPattern.replace('*://', 'https://').replace('*', 'www'));
            const hostname = url.hostname.replace(/^\*\.|^www\./, '');
            domains.add(hostname);
        } catch (error) {
            console.debug('Invalid URL pattern skipped:', urlPattern);
        }
    }
    return Array.from(domains);
}

function setupAlarms() {
    chrome.alarms.create('updateRules', { periodInMinutes: 1440 });
    chrome.alarms.create('saveStats', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener(handleAlarm);
}

function handleAlarm(alarm) {
    if (alarm.name === 'updateRules') updateBlockLists().catch(console.error);
    else if (alarm.name === 'saveStats') savePerformanceStats().catch(console.error);
}

function startKeepAlive() {
    const port = chrome.runtime.connect({ name: 'keepAlive' });
    port.onDisconnect.addListener(() => {
        if (chrome.runtime?.id) startKeepAlive();
    });
}

// ✅ Cleaned-up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handlers = {
        trackerDetected: async () => {
            await handleTrackerDetection(request.hostname);
            return { success: true };
        },
        getPerformanceStats: () => performanceStats,
        resetStats: async () => {
            await resetPerformanceStats();
            return { success: true };
        },
        refreshRules: async () => {
            await updateBlockLists();
            return { success: true };
        },
        shortenUrl: async () => {
            try {
                const shortUrl = await urlShortener.shortenUrl(request.url);
                return { success: true, shortUrl }; // <- shortUrl is a string
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        getShortenerStats: async () => urlShortener.getStats(),
        resetShortenerStats: async () => urlShortener.resetStats()
    };

    if (handlers[request.type]) {
        handlers[request.type]()
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async
    }
});


async function handleTrackerDetection(hostname) {
    const { trackers = {} } = await chrome.storage.local.get('trackers');
    trackers[hostname] = (trackers[hostname] || 0) + 1;
    performanceStats.totalBlocked++;
    performanceStats.dataSaved += 50;
    performanceStats.timeSaved += 0.2;

    await chrome.storage.local.set({ trackers });

    const { userSettings } = await chrome.storage.local.get('userSettings');
    if (userSettings?.showNotifications && (
        STATIC_AD_SERVERS.includes(hostname) || trackers[hostname] > 10
    )) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Tracker Blocked',
            message: `SmartBlock has blocked a tracker from: ${hostname}`,
            priority: 1
        });
    }
}

async function initializeExtension() {
    if (isInitialized) return;
    try {
        await initializeStorage();
        await urlShortener.initialize();
        await updateBlockLists();
        setupAlarms();
        startKeepAlive();
        await loadPerformanceStats();
        isInitialized = true;
        console.log('Extension initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        await updateBlockingRules(STATIC_AD_SERVERS);
    }
}

// Performance Stats
async function loadPerformanceStats() {
    const { stats } = await chrome.storage.local.get('stats');
    performanceStats = stats || { dataSaved: 0, timeSaved: 0, totalBlocked: 0 };
}

async function savePerformanceStats() {
    await chrome.storage.local.set({ stats: performanceStats });
}

async function resetPerformanceStats() {
    performanceStats = { dataSaved: 0, timeSaved: 0, totalBlocked: 0 };
    await savePerformanceStats();
}

// Lifecycle Management
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await chrome.storage.local.set({ trackers: {} });
        await resetPerformanceStats();
    }
    await initializeExtension();
});

chrome.runtime.onStartup.addListener(initializeExtension);
chrome.runtime.onSuspend.addListener(() => {
    savePerformanceStats().catch(console.error);
});
