"use client";

import { motion } from "framer-motion";

export type HomeCtaStoryKind = "signup" | "login";

export default function HomeCtaStory({
  kind,
  lang,
  onComplete,
}: {
  kind: HomeCtaStoryKind;
  lang: "fr" | "en";
  onComplete: () => void;
}) {
  const isLogin = kind === "login";

  return (
    <div
      className={`jobly-home-story jobly-home-story--${kind} relative h-[52px] w-full overflow-hidden rounded-[18px] sm:h-[66px] sm:rounded-[22px]`}
      role="status"
      aria-live="polite"
      aria-label={isLogin
        ? (lang === "fr" ? "Un jeune professionnel part à un entretien" : "A young professional heads to an interview")
        : (lang === "fr" ? "Une candidate crée son profil et découvre des opportunités" : "A candidate creates her profile and discovers opportunities")}
    >
      <span className="jobly-home-story-caption">
        {isLogin
          ? (lang === "fr" ? "En route vers votre prochaine opportunité…" : "On the way to your next opportunity…")
          : (lang === "fr" ? "Votre talent ouvre de nouvelles portes…" : "Your talent opens new doors…")}
      </span>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 150"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="jobly-login-car" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34475C" />
            <stop offset="52%" stopColor="#111C2B" />
            <stop offset="100%" stopColor="#050B13" />
          </linearGradient>
          <linearGradient id="jobly-signup-door" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE990" stopOpacity=".95" />
            <stop offset="100%" stopColor="#FFD21A" stopOpacity=".1" />
          </linearGradient>
          <radialGradient id="jobly-signup-glow">
            <stop offset="0%" stopColor="#FFF4C2" stopOpacity=".9" />
            <stop offset="100%" stopColor="#FFD21A" stopOpacity="0" />
          </radialGradient>
          <filter id="jobly-story-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {isLogin ? (
          <>
            <path d="M0 130 H1000" stroke="rgba(255,255,255,.34)" strokeWidth="2" />
            <motion.path
              d="M0 132 H1000"
              stroke="rgba(255,255,255,.5)"
              strokeWidth="2"
              strokeDasharray="22 26"
              animate={{ strokeDashoffset: [0, -180] }}
              transition={{ duration: 2.7, ease: "linear" }}
            />

            {/* The young professional waits with his briefcase. */}
            <motion.g
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: [0, 0, -38, -52], y: [0, 0, 5, 22], opacity: [1, 1, 1, 0], scale: [1, 1, .92, .65] }}
              transition={{ duration: 2.72, times: [0, .48, .67, 1], ease: "easeInOut" }}
            >
              <g transform="translate(500 28)">
                <ellipse cx="28" cy="99" rx="30" ry="5" fill="rgba(4,13,25,.22)" />
                <circle cx="28" cy="13" r="11" fill="#8B543A" />
                <path d="M17 12 Q18 -1 30 1 Q40 3 39 13 Q31 8 23 9Z" fill="#151923" />
                <path d="M20 25 L37 25 L47 66 L43 77 L12 77 L8 66Z" fill="#12243B" stroke="#8AA1BD" strokeWidth="1.2" />
                <path d="M27 27 L32 27 L34 54 L29 60 L24 54Z" fill="#F7F9FC" />
                <path d="M28 28 L34 28 L31 47 L27 47Z" fill="#FFD21A" />
                <path d="M14 38 L5 65 L13 69 L24 47 M39 38 L49 58 L44 64 L34 48" fill="none" stroke="#8B543A" strokeWidth="7" strokeLinecap="round" />
                <path d="M18 76 L15 105 L25 105 L30 79 M36 76 L40 105 L50 105 L43 75" fill="#182337" />
                <path d="M12 106 H27 M38 106 H53" stroke="#070C13" strokeWidth="7" strokeLinecap="round" />
                <path d="M46 57 H68 V78 H45Z" fill="#8A5B32" stroke="#E5BE7D" strokeWidth="1.5" />
                <path d="M51 57 V53 Q56 48 62 53 V57" fill="none" stroke="#E5BE7D" strokeWidth="2" />
              </g>
            </motion.g>

            {/* Luxury sedan arrives, pauses for the passenger, then leaves. */}
            <motion.g
              initial={{ x: -330 }}
              animate={{ x: [-330, 286, 286, 286, 1260] }}
              transition={{ duration: 2.72, times: [0, .34, .58, .68, 1], ease: ["easeOut", "linear", "linear", "easeIn"] }}
            >
              <ellipse cx="132" cy="116" rx="148" ry="7" fill="rgba(0,0,0,.22)" />
              <path d="M8 78 L25 55 Q36 39 67 36 L172 36 Q193 37 213 56 L247 70 Q260 76 260 91 L258 101 H5 L2 88Z" fill="url(#jobly-login-car)" stroke="#72849B" strokeWidth="2" />
              <path d="M47 54 Q58 42 74 42 H115 V67 H34Z" fill="#A9D6EF" fillOpacity=".74" stroke="#D2E4F0" strokeWidth="1.3" />
              <path d="M122 42 H167 Q185 43 204 66 H122Z" fill="#A9D6EF" fillOpacity=".7" stroke="#D2E4F0" strokeWidth="1.3" />
              <path d="M119 41 V99" stroke="#9EADC0" strokeOpacity=".55" strokeWidth="1.5" />
              <path d="M203 72 H230" stroke="#FFDCA1" strokeWidth="5" strokeLinecap="round" />
              <path d="M4 82 H17" stroke="#F6F8FC" strokeWidth="5" strokeLinecap="round" />
              <path d="M91 75 H107 M176 75 H190" stroke="#BAC8D7" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
              <path d="M24 94 H245" stroke="#FFD21A" strokeOpacity=".55" strokeWidth="1.5" />
              <motion.g
                style={{ transformOrigin: "57px 98px" }}
                animate={{ rotate: [0, 900, 900, 900, 2500] }}
                transition={{ duration: 2.72, ease: "linear" }}
              >
                <circle cx="57" cy="98" r="18" fill="#070B11" stroke="#8795A6" strokeWidth="3" />
                <circle cx="57" cy="98" r="7" fill="#B9C6D4" />
                <path d="M57 83 V113 M42 98 H72" stroke="#66788E" strokeWidth="2" />
              </motion.g>
              <motion.g
                style={{ transformOrigin: "207px 98px" }}
                animate={{ rotate: [0, 900, 900, 900, 2500] }}
                transition={{ duration: 2.72, ease: "linear" }}
              >
                <circle cx="207" cy="98" r="18" fill="#070B11" stroke="#8795A6" strokeWidth="3" />
                <circle cx="207" cy="98" r="7" fill="#B9C6D4" />
                <path d="M207 83 V113 M192 98 H222" stroke="#66788E" strokeWidth="2" />
              </motion.g>
              {/* Passenger door opens outward, then closes before departure. */}
              <motion.g
                style={{ transformOrigin: "150px 69px" }}
                animate={{ rotate: [0, 0, -35, -35, 0] }}
                transition={{ duration: 2.72, times: [0, .48, .56, .66, 1], ease: "easeInOut" }}
              >
                <path d="M123 70 L174 70 L178 95 L120 95Z" fill="#1A2B40" stroke="#A8BBD0" strokeWidth="1.4" />
                <path d="M145 76 H158" stroke="#FFD21A" strokeWidth="2.4" strokeLinecap="round" />
              </motion.g>
            </motion.g>

            <motion.path
              d="M40 62 H235"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0"
              animate={{ x: [-40, 90, 90, 600], opacity: [0, .65, 0, 0] }}
              transition={{ duration: 2.72, times: [0, .18, .35, 1], ease: "easeOut" }}
              onAnimationComplete={onComplete}
            />
          </>
        ) : (
          <>
            <path d="M0 130 H1000" stroke="rgba(255,255,255,.28)" strokeWidth="2" />
            <motion.path
              d="M0 131 H1000"
              stroke="rgba(255,255,255,.56)"
              strokeWidth="2"
              strokeDasharray="8 22"
              animate={{ strokeDashoffset: [0, -150] }}
              transition={{ duration: 2.72, ease: "linear" }}
            />

            {/* A young woman arrives with her first CV and portfolio. */}
            <motion.g
              initial={{ x: -90, opacity: 0 }}
              animate={{ x: [-90, 0, 10, 630], opacity: [0, 1, 1, 0], y: [0, 0, -2, -4] }}
              transition={{ duration: 2.72, times: [0, .2, .55, 1], ease: ["easeOut", "easeInOut", "easeIn"] }}
            >
              <g transform="translate(105 27)">
                <ellipse cx="29" cy="101" rx="29" ry="5" fill="rgba(4,13,25,.2)" />
                <circle cx="28" cy="14" r="11" fill="#8B543A" />
                <path d="M17 17 Q12 1 28 0 Q46 1 42 23 L38 29 L37 15 Q31 6 20 13Z" fill="#1C1720" />
                <path d="M18 27 Q28 21 39 28 L47 65 L39 77 H13 L7 64Z" fill="#F6F8FB" stroke="#D3DDE9" strokeWidth="1.2" />
                <path d="M28 28 L35 28 L31 52 L25 52Z" fill="#FFD21A" />
                <path d="M15 39 L4 61 L12 67 L26 47 M40 39 L50 57 L45 63 L34 48" fill="none" stroke="#8B543A" strokeWidth="7" strokeLinecap="round" />
                <path d="M17 76 L14 105 L24 105 L30 79 M35 76 L41 105 L51 105 L42 76" fill="#263E5A" />
                <path d="M10 106 H26 M39 106 H55" stroke="#101C2C" strokeWidth="7" strokeLinecap="round" />
                <path d="M46 56 H68 V78 H45Z" fill="#C89A59" stroke="#F9D994" strokeWidth="1.5" />
                <path d="M51 56 V52 Q57 47 63 52 V56" fill="none" stroke="#F9D994" strokeWidth="2" />
              </g>
            </motion.g>

            {/* CV opens into a living profile; skills connect it to real possibilities. */}
            <motion.g
              initial={{ x: 205, y: 62, opacity: 0, scale: .42, rotate: -16 }}
              animate={{ x: [205, 270, 390, 485], y: [62, 38, 27, 13], opacity: [0, 1, 1, 0], scale: [.42, 1, 1, .7], rotate: [-16, 4, 0, 12] }}
              transition={{ duration: 2.72, times: [0, .24, .7, 1], ease: "easeOut" }}
              style={{ transformOrigin: "center" }}
            >
              <rect x="0" y="0" width="94" height="88" rx="10" fill="#FFFFFF" stroke="#C8D8EC" strokeWidth="2" />
              <circle cx="23" cy="24" r="11" fill="#DCEBFA" />
              <path d="M14 42 Q23 34 32 42" fill="#1264EB" opacity=".7" />
              <path d="M43 18 H80 M43 29 H73 M13 57 H80 M13 68 H62" stroke="#8196AF" strokeWidth="4" strokeLinecap="round" />
              <rect x="64" y="69" width="19" height="10" rx="5" fill="#FFD21A" />
              <path d="M70 74 L74 77 L79 71" stroke="#0A1931" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            </motion.g>

            <motion.path
              d="M355 78 C450 12 560 15 680 72 S815 95 868 62"
              fill="none"
              stroke="#FFD21A"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, .12, 1, 1], opacity: [0, .9, .9, 0] }}
              transition={{ duration: 2.72, times: [0, .3, .74, 1], ease: "easeInOut" }}
            />
            <motion.g
              initial={{ opacity: 0, scale: .3 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [.3, 1, 1, .7] }}
              transition={{ duration: 2.72, times: [.22, .4, .78, 1], ease: "easeOut" }}
            >
              <g transform="translate(545 26)">
                <rect width="102" height="42" rx="12" fill="#FFFFFF" fillOpacity=".96" />
                <circle cx="18" cy="21" r="9" fill="#DDEBFF" />
                <path d="M34 14 H86 M34 25 H75" stroke="#7F94AC" strokeWidth="4" strokeLinecap="round" />
              </g>
              <g transform="translate(680 82)">
                <rect width="82" height="34" rx="10" fill="#FFF7D6" />
                <path d="M15 17 L21 23 L31 11" fill="none" stroke="#0A1931" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M42 14 H68 M42 23 H62" stroke="#947A35" strokeWidth="3" strokeLinecap="round" />
              </g>
            </motion.g>

            {/* The open door is the first step into a wider professional future. */}
            <motion.circle cx="852" cy="73" r="72" fill="url(#jobly-signup-glow)" filter="url(#jobly-story-glow)"
              animate={{ opacity: [0, .7, .8, 0], scale: [.4, 1, 1.2, 1.4] }}
              transition={{ duration: 2.72, times: [0, .42, .72, 1] }}
            />
            <motion.g
              initial={{ opacity: 0, scale: .75 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [.75, 1, 1.04, 1.2] }}
              transition={{ duration: 2.72, times: [.26, .48, .78, 1], ease: "easeOut" }}
            >
              <path d="M812 125 V24 Q812 9 827 9 H878 Q893 9 893 24 V125" fill="none" stroke="#FFE58A" strokeWidth="7" strokeLinecap="round" />
              <path d="M826 125 V32 Q826 25 835 25 H869 V125Z" fill="url(#jobly-signup-door)" stroke="#FFF1B9" strokeWidth="2" />
              <circle cx="860" cy="78" r="3.5" fill="#8A6311" />
              <path d="M906 40 L927 62 L906 84" stroke="#FFD21A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </motion.g>

            <motion.g
              initial={{ opacity: 0, scale: .2 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [.2, 1.1, 1, .2], rotate: [0, 45, 90, 135] }}
              transition={{ duration: 2.72, times: [.35, .5, .76, 1], ease: "easeOut" }}
              onAnimationComplete={onComplete}
            >
              <path d="M768 20 L773 32 L785 37 L773 42 L768 54 L763 42 L751 37 L763 32Z" fill="#FFF4C2" />
              <path d="M930 102 L934 111 L943 115 L934 119 L930 128 L926 119 L917 115 L926 111Z" fill="#FFD21A" />
            </motion.g>
          </>
        )}
      </svg>
    </div>
  );
}
