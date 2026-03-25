/**
 * Kontextuella undertiteltexter per KPI.
 *
 * Varje entry returnerar:
 * - intro(geo, val): Öppningsmening. "Halmstad har 106 315 invånare"
 * - pronomen: För trendmening. "folkmängden", "andelen", "medelåldern"
 * - suffix: För förändringsmening. " personer", " procentenheter", " år"
 *
 * `val` är det formaterade senaste värdet (sträng).
 * `geo` är kommunnamnet.
 */

type TextSpec = {
  intro: (geo: string, val: string) => string;
  pronomen: string;
  den?: string; // tillbakasyftande pronomen: "den", "det" eller "de"
  suffix: string;
};

type TextFn = (enhet: string) => TextSpec;

// Hjälpfunktioner
const pct = (beskrivning: string): TextSpec => ({
  intro: (geo, val) => `${geo} har ${val} procent ${beskrivning}`,
  pronomen: "andelen",
  den: "den",
  suffix: " procentenheter",
});

const antal = (beskrivning: string, suffix = ""): TextSpec => ({
  intro: (geo, val) => `${geo} har ${val} ${beskrivning}`,
  pronomen: "antalet",
  den: "det",
  suffix,
});

const per1000 = (beskrivning: string): TextSpec => ({
  intro: (geo, val) => `${geo} har ${val} ${beskrivning} per 1 000 invånare`,
  pronomen: "antalet",
  den: "det",
  suffix: "",
});

const perInv = (beskrivning: string, enhetText: string): TextSpec => ({
  intro: (geo, val) => `${geo} har ${val} ${enhetText}`,
  pronomen: "nivån",
  den: "den",
  suffix: "",
});

const kronor = (beskrivning: string): TextSpec => ({
  intro: (geo, val) => `${geo} har ${val} kronor per invånare i ${beskrivning}`,
  pronomen: "kostnaden",
  den: "den",
  suffix: " kronor",
});

// ─── BEFOLKNING ───

const TEXTER: Record<string, TextSpec | TextFn> = {
  // Folkmängd
  "N01951": { intro: (geo, val) => `${geo} har ${val} invånare`, pronomen: "folkmängden", suffix: " personer" },
  "N02937": { intro: (geo, val) => `${geo} har ${val} invånare per km²`, pronomen: "befolkningstätheten", suffix: "" },
  "N01963": (enhet) => enhet === "antal"
    ? { intro: (geo, val) => `${geo} hade en befolkningsförändring på ${val} personer`, pronomen: "befolkningsförändringen", suffix: " personer" }
    : { intro: (geo, val) => `${geo} hade en befolkningsförändring på ${val} procent`, pronomen: "befolkningsförändringen", suffix: " procentenheter" },
  "N02012": { intro: (geo, val) => `${geo} hade en befolkningsförändring på ${val} personer`, pronomen: "befolkningsförändringen", suffix: " personer" },
  "N01803": (enhet) => enhet === "antal"
    ? { intro: (geo, val) => `${geo} hade ett födelsenetto på ${val}`, pronomen: "födelsenettot", suffix: " personer" }
    : { intro: (geo, val) => `${geo} hade ett födelsenetto på ${val} per 1 000 invånare`, pronomen: "födelsenettot", suffix: "" },
  "N02100": { intro: (geo, val) => `${geo} hade ett födelsenetto på ${val}`, pronomen: "födelsenettot", suffix: " personer" },
  "N01964": (enhet) => enhet === "antal"
    ? { intro: (geo, val) => `${geo} hade ett inrikes flyttnetto på ${val}`, pronomen: "det inrikes flyttnettot", suffix: " personer" }
    : { intro: (geo, val) => `${geo} hade ett inrikes flyttnetto på ${val} per 1 000 invånare`, pronomen: "det inrikes flyttnettot", suffix: "" },
  "N02101": { intro: (geo, val) => `${geo} hade ett inrikes flyttnetto på ${val}`, pronomen: "det inrikes flyttnettot", suffix: " personer" },
  "N01806": (enhet) => enhet === "antal"
    ? { intro: (geo, val) => `${geo} hade ett utrikes flyttnetto på ${val}`, pronomen: "det utrikes flyttnettot", suffix: " personer" }
    : { intro: (geo, val) => `${geo} hade ett utrikes flyttnetto på ${val} per 1 000 invånare`, pronomen: "det utrikes flyttnettot", suffix: "" },
  "N02102": { intro: (geo, val) => `${geo} hade ett utrikes flyttnetto på ${val}`, pronomen: "det utrikes flyttnettot", suffix: " personer" },
  "N01770": { intro: (geo, val) => `${geo} har ett fruktsamhetstal på ${val} barn per kvinna`, pronomen: "fruktsamhetstalet", suffix: "" },
  "N00959": { intro: (geo, val) => `${geo} har en medelålder på ${val} år`, pronomen: "medelåldern", suffix: " år" },
  "N00927": { intro: (geo, val) => `${geo} har en demografisk försörjningskvot på ${val}`, pronomen: "försörjningskvoten", suffix: "" },
  "C_FORSORJ_UNG": { intro: (geo, val) => `${geo} har en ungdomsförsörjningskvot på ${val}`, pronomen: "ungdomsförsörjningskvoten", suffix: "" },
  "C_FORSORJ_ALD": { intro: (geo, val) => `${geo} har en äldreförsörjningskvot på ${val}`, pronomen: "äldreförsörjningskvoten", suffix: "" },
  // Åldersgrupper — andel
  "N01994": pct("i åldersgruppen (0–19 år)"),
  "N01961": pct("i åldersgruppen (20–64 år)"),
  "N01812": pct("i åldersgruppen (65–79 år)"),
  "N01813": pct("i åldersgruppen (80 år och äldre)"),
  "N02923": pct("kvinnor i befolkningen"),
  "N02926": pct("utrikes födda i befolkningen"),
  // Åldersgrupper — antal
  "N01919": antal("invånare i åldersgruppen (0–19 år)", " personer"),
  "N01955": antal("invånare i åldersgruppen (20–64 år)", " personer"),
  "N01956": antal("invånare i åldersgruppen (65–79 år)", " personer"),
  "N01957": antal("invånare i åldersgruppen (80 år och äldre)", " personer"),

  // ─── UTBILDNING ───
  "N01982": pct("med eftergymnasial utbildning (25–64 år)"),
  "N01982_KV": pct("kvinnor med eftergymnasial utbildning (25–64 år)"),
  "N01982_MAN": pct("män med eftergymnasial utbildning (25–64 år)"),
  "N01983": pct("med gymnasial utbildning (25–64 år)"),
  "N01983_KV": pct("kvinnor med gymnasial utbildning (25–64 år)"),
  "N01983_MAN": pct("män med gymnasial utbildning (25–64 år)"),
  "N01984": pct("med förgymnasial utbildning (25–64 år)"),
  "N01984_KV": pct("kvinnor med förgymnasial utbildning (25–64 år)"),
  "N01984_MAN": pct("män med förgymnasial utbildning (25–64 år)"),
  "N15507": { intro: (geo, val) => `${geo} har ett genomsnittligt meritvärde i årskurs 9 på ${val} poäng`, pronomen: "meritvärdet", suffix: " poäng" },
  "N15507_KV": { intro: (geo, val) => `flickor i ${geo} har ett meritvärde på ${val} poäng`, pronomen: "meritvärdet för flickor", suffix: " poäng" },
  "N15507_MAN": { intro: (geo, val) => `pojkar i ${geo} har ett meritvärde på ${val} poäng`, pronomen: "meritvärdet för pojkar", suffix: " poäng" },
  "N15428": pct("behöriga till gymnasiets yrkesprogram efter årskurs 9"),
  "N15428_KV": pct("flickor behöriga till yrkesprogram efter årskurs 9"),
  "N15428_MAN": pct("pojkar behöriga till yrkesprogram efter årskurs 9"),
  "N17473": pct("med högskolebehörighet inom 3 år efter gymnasiet"),
  "N17473_KV": pct("kvinnor med högskolebehörighet inom 3 år"),
  "N17473_MAN": pct("män med högskolebehörighet inom 3 år"),

  // ─── ARBETSMARKNAD ───
  "S_SYSS_TOT": pct("sysselsatta bland befolkningen (20–64 år)"),
  "S_SYSS_TOT_N": antal("sysselsatta (20–64 år)", " personer"),
  "S_SYSS_INR": pct("sysselsatta bland inrikes födda (20–64 år)"),
  "S_SYSS_INR_N": antal("sysselsatta inrikes födda (20–64 år)", " personer"),
  "S_SYSS_UTR": pct("sysselsatta bland utrikes födda (20–64 år)"),
  "S_SYSS_UTR_N": antal("sysselsatta utrikes födda (20–64 år)", " personer"),
  "S_SYSS_KV": pct("sysselsatta bland kvinnor (20–64 år)"),
  "S_SYSS_KV_N": antal("sysselsatta kvinnor (20–64 år)", " personer"),
  "S_SYSS_MAN": pct("sysselsatta bland män (20–64 år)"),
  "S_SYSS_MAN_N": antal("sysselsatta män (20–64 år)", " personer"),
  "S_ARKR_TOT": pct("i arbetskraften bland befolkningen (20–64 år)"),
  "S_ARKR_TOT_N": antal("i arbetskraften (20–64 år)", " personer"),
  "S_ARKR_INR": pct("i arbetskraften bland inrikes födda (20–64 år)"),
  "S_ARKR_INR_N": antal("inrikes födda i arbetskraften (20–64 år)", " personer"),
  "S_ARKR_UTR": pct("i arbetskraften bland utrikes födda (20–64 år)"),
  "S_ARKR_UTR_N": antal("utrikes födda i arbetskraften (20–64 år)", " personer"),
  "S_ARKR_KV": pct("kvinnor i arbetskraften (20–64 år)"),
  "S_ARKR_KV_N": antal("kvinnor i arbetskraften (20–64 år)", " personer"),
  "S_ARKR_MAN": pct("män i arbetskraften (20–64 år)"),
  "S_ARKR_MAN_N": antal("män i arbetskraften (20–64 år)", " personer"),
  "S_ARBL_TOT": pct("arbetslösa i arbetskraften (20–64 år)"),
  "S_ARBL_TOT_N": antal("arbetslösa (20–64 år)", " personer"),
  "S_ARBL_INR": pct("arbetslösa bland inrikes födda (20–64 år)"),
  "S_ARBL_INR_N": antal("arbetslösa inrikes födda (20–64 år)", " personer"),
  "S_ARBL_UTR": pct("arbetslösa bland utrikes födda (20–64 år)"),
  "S_ARBL_UTR_N": antal("arbetslösa utrikes födda (20–64 år)", " personer"),
  "S_ARBL_KV": pct("arbetslösa bland kvinnor (20–64 år)"),
  "S_ARBL_KV_N": antal("arbetslösa kvinnor (20–64 år)", " personer"),
  "S_ARBL_MAN": pct("arbetslösa bland män (20–64 år)"),
  "S_ARBL_MAN_N": antal("arbetslösa män (20–64 år)", " personer"),

  // ─── SOCIOEKONOMI & HÄLSA ───
  "N00956": { intro: (geo, val) => `${geo} har en ginikoefficient för förvärvsinkomst på ${val}`, pronomen: "ginikoefficienten", suffix: "" },
  "N00997": { intro: (geo, val) => `${geo} har en ginikoefficient för disponibel inkomst på ${val}`, pronomen: "ginikoefficienten", suffix: "" },
  "N00957": { intro: (geo, val) => `${geo} har ett ohälsotal på ${val} dagar`, pronomen: "ohälsotalet", suffix: " dagar" },
  "N00957_KV": { intro: (geo, val) => `kvinnors ohälsotal i ${geo} är ${val} dagar`, pronomen: "ohälsotalet för kvinnor", suffix: " dagar" },
  "N00957_MAN": { intro: (geo, val) => `mäns ohälsotal i ${geo} är ${val} dagar`, pronomen: "ohälsotalet för män", suffix: " dagar" },
  "N00938": { intro: (geo, val) => `${geo} har ett sjukpenningtal på ${val} dagar per försäkrad`, pronomen: "sjukpenningtalet", suffix: " dagar" },
  "N00938_KV": { intro: (geo, val) => `sjukpenningtalet för kvinnor i ${geo} är ${val} dagar`, pronomen: "sjukpenningtalet för kvinnor", suffix: " dagar" },
  "N00938_MAN": { intro: (geo, val) => `sjukpenningtalet för män i ${geo} är ${val} dagar`, pronomen: "sjukpenningtalet för män", suffix: " dagar" },
  "N33820": pct("barn och unga med psykisk ohälsa"),
  "N33820_KV": pct("flickor med psykisk ohälsa"),
  "N33820_MAN": pct("pojkar med psykisk ohälsa"),
  "N31001": kronor("ekonomiskt bistånd"),
  "N31910": antal("biståndshushåll"),
  "F_HALSA_GOD": pct("med god självskattad hälsa"),
  "F_HALSA_GOD_KV": pct("kvinnor med god självskattad hälsa"),
  "F_HALSA_GOD_MAN": pct("män med god självskattad hälsa"),
  "F_MEDLIVS_KV": { intro: (geo, val) => `kvinnors medellivslängd i ${geo} är ${val} år`, pronomen: "medellivslängden för kvinnor", suffix: " år" },
  "F_MEDLIVS_MAN": { intro: (geo, val) => `mäns medellivslängd i ${geo} är ${val} år`, pronomen: "medellivslängden för män", suffix: " år" },
  "F_FORTID": { intro: (geo, val) => `${geo} har ${val} förtida dödsfall per 100 000 invånare (25–64 år)`, pronomen: "den förtida dödligheten", suffix: "" },
  "F_FORTID_KV": { intro: (geo, val) => `${geo} har ${val} förtida dödsfall per 100 000 bland kvinnor`, pronomen: "den förtida dödligheten bland kvinnor", suffix: "" },
  "F_FORTID_MAN": { intro: (geo, val) => `${geo} har ${val} förtida dödsfall per 100 000 bland män`, pronomen: "den förtida dödligheten bland män", suffix: "" },
  "F_PSYK_PAFR": pct("med allvarlig psykisk påfrestning"),
  "F_PSYK_PAFR_KV": pct("kvinnor med allvarlig psykisk påfrestning"),
  "F_PSYK_PAFR_MAN": pct("män med allvarlig psykisk påfrestning"),
  "F_STRESS": pct("som upplever stress"),
  "F_STRESS_KV": pct("kvinnor som upplever stress"),
  "F_STRESS_MAN": pct("män som upplever stress"),
  "F_SUICID": { intro: (geo, val) => `${geo} har ${val} suicid per 100 000 invånare`, pronomen: "suicidtalet", suffix: "" },
  "F_SUICID_KV": { intro: (geo, val) => `${geo} har ${val} suicid per 100 000 bland kvinnor`, pronomen: "suicidtalet bland kvinnor", suffix: "" },
  "F_SUICID_MAN": { intro: (geo, val) => `${geo} har ${val} suicid per 100 000 bland män`, pronomen: "suicidtalet bland män", suffix: "" },
  "F_DINK": { intro: (geo, val) => `medianinkomsten i ${geo} är ${val} tusen kronor`, pronomen: "medianinkomsten", suffix: " tkr" },
  "F_DINK_KV": { intro: (geo, val) => `medianinkomsten för kvinnor i ${geo} är ${val} tkr`, pronomen: "medianinkomsten för kvinnor", suffix: " tkr" },
  "F_DINK_MAN": { intro: (geo, val) => `medianinkomsten för män i ${geo} är ${val} tkr`, pronomen: "medianinkomsten för män", suffix: " tkr" },
  "F_VEK_VUX": pct("vuxna med varaktigt låg ekonomisk standard"),
  "F_VINK_BARN": pct("barn och unga med varaktigt låg inkomststandard"),
  "F_OVERVIKT": pct("med övervikt eller obesitas"),
  "F_OVERVIKT_KV": pct("kvinnor med övervikt eller obesitas"),
  "F_OVERVIKT_MAN": pct("män med övervikt eller obesitas"),
  "F_TOBAK": pct("som röker dagligen"),
  "F_TOBAK_KV": pct("kvinnor som röker dagligen"),
  "F_TOBAK_MAN": pct("män som röker dagligen"),
  "F_ALK_RISK": pct("med riskkonsumtion av alkohol"),
  "F_ALK_RISK_KV": pct("kvinnor med riskkonsumtion av alkohol"),
  "F_ALK_RISK_MAN": pct("män med riskkonsumtion av alkohol"),

  // ─── BOSTÄDER ───
  "N07913": per1000("bostäder"),
  "B_TOT": antal("bostäder totalt"),
  "N07956": per1000("hyresrätter"),
  "B_HYRA_N": antal("hyresrätter"),
  "N07957": per1000("bostadsrätter"),
  "B_BOST_N": antal("bostadsrätter"),
  "N07958": per1000("äganderätter"),
  "B_AGAN_N": antal("äganderätter"),
  "N07917": per1000("nybyggda bostäder"),
  "B_NY_TOT": antal("nybyggda bostäder"),
  "N07905": per1000("färdigställda småhus"),
  "B_NY_SMAHUS": antal("färdigställda småhus"),
  "N07906": per1000("färdigställda lägenheter i flerbostadshus"),
  "B_NY_FLERBO": antal("färdigställda lägenheter i flerbostadshus"),
  "N07923": antal("bostäder i planberedskap"),
  "N07908": { intro: (geo, val) => `genomsnittspriset för bostadsrätter i ${geo} är ${val} kr/kvm`, pronomen: "bostadsrättspriset", suffix: " kr/kvm" },
  "N07909": { intro: (geo, val) => `genomsnittspriset för småhus i ${geo} är ${val} tkr`, pronomen: "småhuspriset", suffix: " tkr" },
  "N07907": pct("trångbodda hushåll"),
  "N07418": pct("bostäder i kollektivtrafiknära läge"),

  // ─── TURISM ───
  "T_GAST_TOT": { intro: (geo, val) => `${geo} hade ${val} gästnätter`, pronomen: "antalet gästnätter", suffix: "" },
  "T_GAST_HOTELL": { intro: (geo, val) => `${geo} hade ${val} hotellgästnätter`, pronomen: "hotellgästnätterna", suffix: "" },
  "T_GAST_CAMPING": { intro: (geo, val) => `${geo} hade ${val} campinggästnätter`, pronomen: "campinggästnätterna", suffix: "" },
  "T_GAST_STUGBY": { intro: (geo, val) => `${geo} hade ${val} gästnätter i stugbyar`, pronomen: "stugbygästnätterna", suffix: "" },
  "T_GAST_VANDRARHEM": { intro: (geo, val) => `${geo} hade ${val} vandrarhemsgästnätter`, pronomen: "vandrarhemsgästnätterna", suffix: "" },
  "T_GAST_SOL": { intro: (geo, val) => `${geo} hade ${val} gästnätter i förmedlade stugor`, pronomen: "gästnätterna i stugor", suffix: "" },
  "T_GAST_SVE": { intro: (geo, val) => `${geo} hade ${val} gästnätter från svenska gäster`, pronomen: "de svenska gästnätterna", suffix: "" },
  "T_GAST_UTL": { intro: (geo, val) => `${geo} hade ${val} gästnätter från utländska gäster`, pronomen: "de utländska gästnätterna", suffix: "" },
  "T_ANDEL_UTL_NATTER": pct("utländska gästnätter"),
  "T_ANKOMST_SVE": { intro: (geo, val) => `${geo} hade ${val} svenska gästankomster`, pronomen: "de svenska gästankomsterna", suffix: "" },
  "T_ANKOMST_UTL": { intro: (geo, val) => `${geo} hade ${val} utländska gästankomster`, pronomen: "de utländska gästankomsterna", suffix: "" },
  "T_ANDEL_UTL": pct("utländska gästankomster"),
  "T_BELAGG_RUM": { intro: (geo, val) => `rumsbeläggningen i ${geo} är ${val} procent`, pronomen: "rumsbeläggningen", suffix: " procentenheter" },
  "T_BELAGG_BADD": { intro: (geo, val) => `bäddbeläggningen i ${geo} är ${val} procent`, pronomen: "bäddbeläggningen", suffix: " procentenheter" },
  "T_LOGIINTAKT": { intro: (geo, val) => `${geo} hade logiintäkter på ${val} kronor`, pronomen: "logiintäkterna", suffix: "" },
  "T_ANLAGGNINGAR": { intro: (geo, val) => `${geo} har ${val} boendeanläggningar`, pronomen: "antalet anläggningar", suffix: "" },
  "T_INTAKT_PER_GAST": { intro: (geo, val) => `logiintäkten per gästnatt i ${geo} är ${val} kronor`, pronomen: "intäkten per gästnatt", suffix: " kronor" },
  "T_GAST_PER_ANLAGG": { intro: (geo, val) => `${geo} har ${val} gästnätter per anläggning`, pronomen: "gästnätterna per anläggning", suffix: "" },
  "T_GAST_PER_INV": { intro: (geo, val) => `${geo} har ${val} gästnätter per invånare`, pronomen: "gästnätterna per invånare", suffix: "" },
  "T_GAST_TILLVAXT": pct("årlig förändring i gästnätter"),
  "T_INTAKT_TILLVAXT": pct("årlig förändring i logiintäkter"),

  // ─── MILJÖ ───
  "N00401": { intro: (geo, val) => `${geo} har växthusgasutsläpp på ${val} ton CO₂e per invånare`, pronomen: "utsläppen per invånare", suffix: " ton" },
  "N07702": { intro: (geo, val) => `${geo} har totala växthusgasutsläpp på ${val} ton CO₂e`, pronomen: "de totala utsläppen", suffix: " ton" },
  "N85073": { intro: (geo, val) => `transportutsläppen i ${geo} är ${val} ton CO₂e per invånare`, pronomen: "transportutsläppen per invånare", suffix: " ton" },
  "N85533": { intro: (geo, val) => `transportutsläppen i ${geo} är totalt ${val} ton CO₂e`, pronomen: "transportutsläppen", suffix: " ton" },
  "N85077": { intro: (geo, val) => `industriutsläppen i ${geo} är ${val} ton CO₂e per invånare`, pronomen: "industriutsläppen per invånare", suffix: " ton" },
  "N85537": { intro: (geo, val) => `industriutsläppen i ${geo} är totalt ${val} ton CO₂e`, pronomen: "industriutsläppen", suffix: " ton" },
  "N85078": { intro: (geo, val) => `jordbruksutsläppen i ${geo} är ${val} ton CO₂e per invånare`, pronomen: "jordbruksutsläppen", suffix: " ton" },
  "N85538": { intro: (geo, val) => `jordbruksutsläppen i ${geo} är totalt ${val} ton CO₂e`, pronomen: "jordbruksutsläppen", suffix: " ton" },
  "N85072": { intro: (geo, val) => `uppvärmningsutsläppen i ${geo} är ${val} ton CO₂e per invånare`, pronomen: "uppvärmningsutsläppen", suffix: " ton" },
  "N85532": { intro: (geo, val) => `uppvärmningsutsläppen i ${geo} är totalt ${val} ton CO₂e`, pronomen: "uppvärmningsutsläppen", suffix: " ton" },
  "N45913": { intro: (geo, val) => `${geo} använder ${val} MWh per invånare för transporter`, pronomen: "energianvändningen för transporter", suffix: " MWh" },
  "N45945": { intro: (geo, val) => `${geo} använder totalt ${val} MWh för transporter`, pronomen: "energianvändningen för transporter", suffix: " MWh" },
  "N45925": pct("elproduktion från förnybara källor"),
  "N00403": pct("ekologiskt brukad åkermark"),

  // ─── TRANSPORT ───
  "C_PENDLKVOT": { intro: (geo, val) => `${geo} har en pendlingskvot på ${val}`, pronomen: "pendlingskvoten", suffix: "" },
  "C_PENDL_NETTO": { intro: (geo, val) => `${geo} har en nettopendling på ${val} personer`, pronomen: "nettopendlingen", suffix: " personer" },
  "C_INPENDL_ANDEL": pct("inpendling"),
  "C_UTPENDL_ANDEL": pct("utpendling"),
  "S_INPENDL": antal("inpendlare", " personer"),
  "S_UTPENDL": antal("utpendlare", " personer"),
  "S_DAG_TOT": antal("sysselsatta i dagbefolkningen", " personer"),
  "S_NATT_TOT": antal("sysselsatta i nattbefolkningen", " personer"),
  "N60404": { intro: (geo, val) => `${geo} har ${val} kollektivtrafikresor per invånare och år`, pronomen: "kollektivtrafikresandet", suffix: "" },
  "N07419": pct("tätortsbefolkning i kollektivtrafiknära läge"),
  "N07412": pct("befolkning utanför tätort i kollektivtrafiknära läge"),
  "N07410": pct("nytillkomna bostäder i kollektivtrafiknära läge"),
  "U60496": pct("förnybara drivmedel i kollektivtrafiken"),
  "U85001": kronor("trafik (regionnivå)"),
  "TR_FARDTJANST": antal("färdtjänstresor"),
  "N07935": per1000("personbilar"),
  "N07945": pct("elbilar bland personbilar"),
  "N07938": per1000("elbilar"),
  "N07947": pct("laddhybridbilar bland personbilar"),
  "N07940": per1000("laddhybridbilar"),
  "U00501": pct("fossiloberoende personbilar"),
  "N07713": antal("elbilsladdpunkter totalt"),
  "N07710": antal("normalladdare"),
  "N07711": antal("snabbladdare"),
  "U07917": { intro: (geo, val) => `${geo} har en genomsnittlig körsträcka på ${val} mil per invånare`, pronomen: "körsträckan per invånare", suffix: " mil" },
  "U07918": { intro: (geo, val) => `den genomsnittliga körsträckan per bil i ${geo} är ${val} mil`, pronomen: "körsträckan per bil", suffix: " mil" },
  "N07782": { intro: (geo, val) => `${geo} levererar ${val} liter drivmedel per invånare`, pronomen: "drivmedelsleveransen per invånare", suffix: " liter" },
  "N00799": { intro: (geo, val) => `${geo} har ${val} trafikolyckor med räddningsinsats per 1 000 invånare`, pronomen: "antalet trafikolyckor", suffix: "" },

  // ─── NÄRINGSLIV ───
  "N00999": per1000("nystartade företag"),
  "N01003": antal("nystartade företag"),
  "N45700": per1000("företagsförekomster"),
  // Sektorer — antal + andel
  "N_SEK_TOT": antal("förvärvsarbetande (dagbefolkning 15–74 år)", " personer"),
  "N_SEK_NARING": antal("förvärvsarbetande i näringslivet", " personer"),
  "N_SEK_NARING_A": pct("förvärvsarbetande i näringslivet"),
  "N_SEK_OFF": antal("förvärvsarbetande i offentlig sektor", " personer"),
  "N_SEK_OFF_A": pct("förvärvsarbetande i offentlig sektor"),
  "N_SEK_TOT_KV": antal("förvärvsarbetande kvinnor", " personer"),
  "N_SEK_TOT_MAN": antal("förvärvsarbetande män", " personer"),
  "N_SEK_NARING_KV": antal("kvinnor i näringslivet", " personer"),
  "N_SEK_NARING_MAN": antal("män i näringslivet", " personer"),
  "N_SEK_OFF_KV": antal("kvinnor i offentlig sektor", " personer"),
  "N_SEK_OFF_MAN": antal("män i offentlig sektor", " personer"),
  "N_SEK_TOT_INR": antal("förvärvsarbetande inrikes födda", " personer"),
  "N_SEK_TOT_UTR": antal("förvärvsarbetande utrikes födda", " personer"),
  "N_SEK_NARING_INR": antal("inrikes födda i näringslivet", " personer"),
  "N_SEK_NARING_UTR": antal("utrikes födda i näringslivet", " personer"),
  "N_SEK_OFF_INR": antal("inrikes födda i offentlig sektor", " personer"),
  "N_SEK_OFF_UTR": antal("utrikes födda i offentlig sektor", " personer"),
  // Tillväxt
  "N_SEK_TOT_TILLV": pct("årlig tillväxt bland förvärvsarbetande"),
  "N_SEK_NARING_TILLV": pct("årlig tillväxt i näringslivet"),
  "N_SEK_OFF_TILLV": pct("årlig tillväxt i offentlig sektor"),
  "N_SEK_TOT_KV_TILLV": pct("årlig tillväxt bland förvärvsarbetande kvinnor"),
  "N_SEK_TOT_MAN_TILLV": pct("årlig tillväxt bland förvärvsarbetande män"),
  "N_SEK_NARING_KV_TILLV": pct("årlig tillväxt bland kvinnor i näringslivet"),
  "N_SEK_NARING_MAN_TILLV": pct("årlig tillväxt bland män i näringslivet"),
  "N_SEK_OFF_KV_TILLV": pct("årlig tillväxt bland kvinnor i offentlig sektor"),
  "N_SEK_OFF_MAN_TILLV": pct("årlig tillväxt bland män i offentlig sektor"),
  "N_SEK_TOT_INR_TILLV": pct("årlig tillväxt bland inrikes födda"),
  "N_SEK_TOT_UTR_TILLV": pct("årlig tillväxt bland utrikes födda"),
  "N_SEK_NARING_INR_TILLV": pct("årlig tillväxt bland inrikes födda i näringslivet"),
  "N_SEK_NARING_UTR_TILLV": pct("årlig tillväxt bland utrikes födda i näringslivet"),
  "N_SEK_OFF_INR_TILLV": pct("årlig tillväxt bland inrikes födda i offentlig sektor"),
  "N_SEK_OFF_UTR_TILLV": pct("årlig tillväxt bland utrikes födda i offentlig sektor"),
  // Branscher — andel + antal
  "N_BR_A_A": pct("sysselsatta inom jordbruk och skogsbruk"),
  "N_BR_A": antal("sysselsatta inom jordbruk och skogsbruk", " personer"),
  "N_BR_BC_A": pct("sysselsatta inom tillverkning"),
  "N_BR_BC": antal("sysselsatta inom tillverkning", " personer"),
  "N_BR_DE_A": pct("sysselsatta inom energi och miljö"),
  "N_BR_DE": antal("sysselsatta inom energi och miljö", " personer"),
  "N_BR_F_A": pct("sysselsatta inom byggverksamhet"),
  "N_BR_F": antal("sysselsatta inom byggverksamhet", " personer"),
  "N_BR_G_A": pct("sysselsatta inom handel"),
  "N_BR_G": antal("sysselsatta inom handel", " personer"),
  "N_BR_H_A": pct("sysselsatta inom transport"),
  "N_BR_H": antal("sysselsatta inom transport", " personer"),
  "N_BR_I_A": pct("sysselsatta inom hotell och restaurang"),
  "N_BR_I": antal("sysselsatta inom hotell och restaurang", " personer"),
  "N_BR_J_A": pct("sysselsatta inom IT och kommunikation"),
  "N_BR_J": antal("sysselsatta inom IT och kommunikation", " personer"),
  "N_BR_K_A": pct("sysselsatta inom finans och försäkring"),
  "N_BR_K": antal("sysselsatta inom finans och försäkring", " personer"),
  "N_BR_L_A": pct("sysselsatta inom fastighetsverksamhet"),
  "N_BR_L": antal("sysselsatta inom fastighetsverksamhet", " personer"),
  "N_BR_MN_A": pct("sysselsatta inom företagstjänster"),
  "N_BR_MN": antal("sysselsatta inom företagstjänster", " personer"),
  "N_BR_O_A": pct("sysselsatta inom offentlig förvaltning"),
  "N_BR_O": antal("sysselsatta inom offentlig förvaltning", " personer"),
  "N_BR_P_A": pct("sysselsatta inom utbildning"),
  "N_BR_P": antal("sysselsatta inom utbildning", " personer"),
  "N_BR_Q_A": pct("sysselsatta inom vård och omsorg"),
  "N_BR_Q": antal("sysselsatta inom vård och omsorg", " personer"),
  "N_BR_RSTU_A": pct("sysselsatta inom övriga tjänster"),
  "N_BR_RSTU": antal("sysselsatta inom övriga tjänster", " personer"),
  // Utbildningsnivå bland sysselsatta
  "N_UTB_FORGYM_A": pct("sysselsatta med förgymnasial utbildning"),
  "N_UTB_FORGYM": antal("sysselsatta med förgymnasial utbildning", " personer"),
  "N_UTB_GYM_A": pct("sysselsatta med gymnasial utbildning"),
  "N_UTB_GYM": antal("sysselsatta med gymnasial utbildning", " personer"),
  "N_UTB_EFTGYM_A": pct("sysselsatta med eftergymnasial utbildning"),
  "N_UTB_EFTGYM": antal("sysselsatta med eftergymnasial utbildning", " personer"),
  // Yrkesställning
  "N_YRK_ANST_A": pct("anställda bland förvärvsarbetande"),
  "N_YRK_ANST": antal("anställda bland förvärvsarbetande", " personer"),
  "N_YRK_EGAB_A": pct("företagare i aktiebolag"),
  "N_YRK_EGAB": antal("företagare i aktiebolag", " personer"),
  "N_YRK_EGFOR_A": pct("egenföretagare"),
  "N_YRK_EGFOR": antal("egenföretagare", " personer"),
  "N_YRK_ANST_INR_A": pct("anställda bland inrikes födda"),
  "N_YRK_ANST_INR": antal("anställda inrikes födda", " personer"),
  "N_YRK_ANST_UTR_A": pct("anställda bland utrikes födda"),
  "N_YRK_ANST_UTR": antal("anställda utrikes födda", " personer"),
  "N_YRK_EGAB_INR_A": pct("företagare i AB bland inrikes födda"),
  "N_YRK_EGAB_INR": antal("företagare i AB bland inrikes födda", " personer"),
  "N_YRK_EGAB_UTR_A": pct("företagare i AB bland utrikes födda"),
  "N_YRK_EGAB_UTR": antal("företagare i AB bland utrikes födda", " personer"),
  "N_YRK_EGFOR_INR_A": pct("egenföretagare bland inrikes födda"),
  "N_YRK_EGFOR_INR": antal("egenföretagare bland inrikes födda", " personer"),
  "N_YRK_EGFOR_UTR_A": pct("egenföretagare bland utrikes födda"),
  "N_YRK_EGFOR_UTR": antal("egenföretagare bland utrikes födda", " personer"),
  "N_YRK_ANST_KV_A": pct("kvinnor bland anställda"),
  "N_YRK_ANST_KV": antal("kvinnor bland anställda", " personer"),
  "N_YRK_EGAB_KV_A": pct("kvinnor bland företagare i AB"),
  "N_YRK_EGAB_KV": antal("kvinnor bland företagare i AB", " personer"),
  "N_YRK_EGFOR_KV_A": pct("kvinnor bland egenföretagare"),
  "N_YRK_EGFOR_KV": antal("kvinnor bland egenföretagare", " personer"),

  // ─── KONJUNKTUR ───
  "K_NATT_ANT": antal("sysselsatta i nattbefolkningen (15–74 år, preliminärt)", " personer"),
  "K_NATT_GRAD": pct("sysselsatta i befolkningen (15–74 år, preliminärt)"),
  "K_SYSS_TOT": pct("sysselsatta bland befolkningen 20–64 år (preliminärt)"),
  "K_SYSS_ANT": antal("sysselsatta (20–64 år, preliminärt)", " personer"),
  "K_SYSS_INR": pct("sysselsatta bland inrikes födda 20–64 år (preliminärt)"),
  "K_SYSS_UTR": pct("sysselsatta bland utrikes födda 20–64 år (preliminärt)"),
  "K_SYSS_KV": pct("sysselsatta bland kvinnor 20–64 år (preliminärt)"),
  "K_SYSS_MAN": pct("sysselsatta bland män 20–64 år (preliminärt)"),
  "K_ARBL_TOT": pct("arbetslösa i arbetskraften 20–64 år (preliminärt)"),
  "K_ARBL_ANT": antal("arbetslösa (20–64 år, preliminärt)", " personer"),
  "K_ARBL_INR": pct("arbetslösa bland inrikes födda 20–64 år (preliminärt)"),
  "K_ARBL_UTR": pct("arbetslösa bland utrikes födda 20–64 år (preliminärt)"),
  "K_ARBL_KV": pct("arbetslösa bland kvinnor 20–64 år (preliminärt)"),
  "K_ARBL_MAN": pct("arbetslösa bland män 20–64 år (preliminärt)"),
  "K_ARKR_TOT": pct("i arbetskraften bland befolkningen 20–64 år (preliminärt)"),
  "K_ARKR_KV": pct("kvinnor i arbetskraften 20–64 år (preliminärt)"),
  "K_ARKR_MAN": pct("män i arbetskraften 20–64 år (preliminärt)"),
  "K_DAG_TOT": antal("sysselsatta i dagbefolkningen (15–74 år, preliminärt)", " personer"),
  "K_DAG_JORD": antal("sysselsatta inom jordbruk (preliminärt)", " personer"),
  "K_DAG_IND": antal("sysselsatta inom tillverkning (preliminärt)", " personer"),
  "K_DAG_ENMI": antal("sysselsatta inom energi och miljö (preliminärt)", " personer"),
  "K_DAG_BYG": antal("sysselsatta inom byggverksamhet (preliminärt)", " personer"),
  "K_DAG_HAND": antal("sysselsatta inom handel (preliminärt)", " personer"),
  "K_DAG_TRANS": antal("sysselsatta inom transport (preliminärt)", " personer"),
  "K_DAG_HOTEL": antal("sysselsatta inom hotell och restaurang (preliminärt)", " personer"),
  "K_DAG_IT": antal("sysselsatta inom IT och kommunikation (preliminärt)", " personer"),
  "K_DAG_FINANS": antal("sysselsatta inom finans och försäkring (preliminärt)", " personer"),
  "K_DAG_FAST": antal("sysselsatta inom fastighetsverksamhet (preliminärt)", " personer"),
  "K_DAG_FORETJ": antal("sysselsatta inom företagstjänster (preliminärt)", " personer"),
  "K_DAG_OFF": antal("sysselsatta inom offentlig sektor (preliminärt)", " personer"),
  "K_DAG_KULT": antal("sysselsatta inom kultur och fritid (preliminärt)", " personer"),
  "K_SYSS_FORANDR": { intro: (geo, val) => `sysselsättningsgraden i ${geo} förändrades med ${val} procentenheter senaste året`, pronomen: "sysselsättningsförändringen", suffix: " procentenheter" },
  "K_ARBL_FORANDR": { intro: (geo, val) => `arbetslösheten i ${geo} förändrades med ${val} procentenheter senaste året`, pronomen: "arbetslöshetsförändringen", suffix: " procentenheter" },
  "K_DAG_TILLVAXT": pct("årlig tillväxt i dagbefolkningen"),
  "K_GAST_TOT": antal("gästnätter totalt (preliminärt)"),
  "K_GAST_SVE": antal("gästnätter från svenska gäster"),
  "K_GAST_UTL": antal("gästnätter från utländska gäster"),
  "K_ANDEL_UTL": pct("utländska gästnätter"),
  "K_GAST_TILLVAXT": pct("årlig förändring i gästnätter"),
  "K_BEF_TOT": { intro: (geo, val) => `${geo} har ${val} invånare (preliminärt)`, pronomen: "folkmängden", suffix: " personer" },
  "K_BEF_FORANDR": { intro: (geo, val) => `${geo} hade en befolkningsförändring på ${val} personer jämfört med samma månad föregående år`, pronomen: "befolkningsförändringen", suffix: " personer" },
  "K_BYGG_TOT": antal("påbörjade lägenheter (alla hustyper)"),
  "K_BYGG_SMAHUS": antal("påbörjade lägenheter i småhus"),
  "K_BYGG_FLERBO": antal("påbörjade lägenheter i flerbostadshus"),
};

/**
 * Hämta kontextuell text för ett KPI.
 * Returnerar intro-funktion, pronomen och suffix.
 * Fallback: generisk text baserad på enhet.
 */
export function getKpiText(kpiId: string, enhet: string): TextSpec {
  const entry = TEXTER[kpiId];
  if (entry) {
    return typeof entry === "function" ? entry(enhet) : entry;
  }

  // Generisk fallback
  if (enhet === "procent") {
    return { intro: (geo, val) => `${geo} ligger på ${val} procent`, pronomen: "andelen", suffix: " procentenheter" };
  }
  if (enhet === "antal") {
    return { intro: (geo, val) => `${geo} har värdet ${val}`, pronomen: "nivån", suffix: "" };
  }
  return { intro: (geo, val) => `${geo} ligger på ${val}${enhet ? ` ${enhet}` : ""}`, pronomen: "nivån", suffix: "" };
}
