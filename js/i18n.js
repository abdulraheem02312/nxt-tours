// =========================================================
// NXT Tours: Language switcher + translations.
// Every translatable element on the page gets data-i18n="some.key" (its text) and/or
// data-i18n-placeholder="some.key" (an input's placeholder). setLanguage() looks up that key
// in TRANSLATIONS[lang] and swaps the text in. English is the key set every other language must
// match; a missing key falls back to English automatically instead of showing blank text.
//
// Coverage so far: navbar, footer, and the Home page (index.html). Tours / About / Contact /
// tour.html still show English body text even when another language is picked; only their navbar
// and footer change for now. Extend TRANSLATIONS and add data-i18n attributes to cover more.
// =========================================================

const LANGUAGES = {
  en: { label: "English", native: "English", dir: "ltr" },
  ar: { label: "Arabic", native: "العربية", dir: "rtl" },
  fil: { label: "Filipino", native: "Filipino", dir: "ltr" },
  hi: { label: "Hindi", native: "हिन्दी", dir: "ltr" },
  ur: { label: "Urdu", native: "اردو", dir: "rtl" },
};

const TRANSLATIONS = {
  en: {
    nav: { home: "Home", tours: "Tours", about: "About", contact: "Contact", book: "Book on WhatsApp" },
    hero: {
      eyebrow: "Experience",
      sub: "A decade of experience, 60,000+ happy travellers, and one promise: an unforgettable journey through the UAE's most breathtaking destinations.",
      cta: "Explore Our Tours",
    },
    stats: { travellers: "Happy Travellers", years: "Years of Excellence", tours: "Tours Completed", rating: "Average Rating" },
    why: {
      eyebrow: "Why Choose Us",
      title: "The NXT Tours",
      titleAccent: "Difference",
      sub: "Real local operators, transparent pricing, and support that doesn't stop at booking.",
      c1t: "10 Years of Excellence",
      c1p: "A decade of delivering world-class UAE tour experiences with zero compromise on quality.",
      c2t: "On-Ground UAE Experts",
      c2p: "We're not a booking agency. We're local operators who live and breathe UAE tourism every day.",
      c3t: "Best Value, Every Time",
      c3p: "Transparent pricing with no hidden costs: premium experiences at prices that make sense.",
      c4t: "5-Star Support",
      c4p: "From your first message to drop-off, our team is with you every step of the way, 7 days a week.",
    },
    spotAD: {
      eyebrow: "Our Bestseller",
      title: "Abu Dhabi",
      titleAccent: "City Tour",
      tagline: "The UAE's Most Complete Day Trip",
      desc: "From the grandeur of Sheikh Zayed Grand Mosque to the thrill of Ferrari World, this is the ultimate full-day experience, loved by families, couples, and solo travellers alike.",
      l1: "Sheikh Zayed Grand Mosque",
      l2: "Ferrari World Yas Island",
      l3: "Emirates Palace & Etihad Towers",
      l4: "Abu Dhabi Corniche",
      l5: "Qasr Al Watan Palace",
      l6: "Free pickup in Dubai",
      more: "And much more",
      meta: "per person · ★ 4.9/5 from 12,000+ guests",
      cta: "More Tours",
    },
    spotDS: {
      eyebrow: "Adventure Awaits",
      title: "Desert",
      titleAccent: "Safari",
      tagline: "The UAE's Most Thrilling Experience",
      desc: "Venture into the golden dunes of the Arabian desert for an experience unlike anything else: dune bashing, camel rides, and dinner under the stars.",
      l1: "Dune bashing in 4x4 vehicles",
      l2: "Camel riding experience",
      l3: "Sand boarding",
      l4: "BBQ dinner under the stars",
      l5: "Live entertainment & shows",
      l6: "Hotel pickup & drop-off",
      more: "And much more",
      meta: "per person",
      cta: "More Tours",
    },
    adv: {
      eyebrow: "Explore",
      title: "Choose Your",
      titleAccent: "Adventure",
      seeAll: "See All Tours",
      ad: { t: "Abu Dhabi City Tour", d: "Sheikh Zayed Mosque, Emirates Palace, Ferrari World & more.", l1: "Sheikh Zayed Grand Mosque", l2: "Emirates Palace & Etihad Towers", l3: "Ferrari World Yas Island" },
      ht: { t: "Hatta City Tour", d: "Turquoise lakes, mountain trails & the Hajar peaks.", l1: "Hatta Dam lake", l2: "Hajar Mountain scenic drive", l3: "Hatta Heritage Village stop" },
      db: { t: "Dubai City Tour", d: "Burj Khalifa, Palm Jumeirah, Old Dubai & the modern skyline.", l1: "Burj Khalifa photo stop", l2: "Palm Jumeirah drive-by", l3: "Old Dubai & Dubai Creek" },
      ds: { t: "Desert Safari", d: "Dune bashing, camel rides, BBQ dinner & live entertainment.", l1: "Dune bashing in 4x4 vehicles", l2: "Camel rides", l3: "BBQ dinner with live shows" },
      viewDetails: "View Details",
    },
    process: {
      eyebrow: "4 Easy Steps",
      title: "Booking Is",
      titleAccent: "Simple",
      sub: "From your first message to your pickup, this is all it takes.",
      s1t: "Browse Tours",
      s1p: "Explore our range of UAE tours and find the perfect experience for you.",
      s2t: "Contact Us",
      s2p: "Reach out on WhatsApp or fill our form. Our team responds within minutes.",
      s3t: "Confirm Booking",
      s3p: "Share your details, date, and group size, and we'll confirm everything.",
      s4t: "We Pick You Up",
      s4p: "Sit back and relax. We'll be at your pickup point right on time.",
      cta: "Start Your Booking on WhatsApp",
    },
    testi: {
      eyebrow: "Testimonials",
      title: "What Our",
      titleAccent: "Guests Say",
      seeMore: "See More Reviews on Facebook",
      r1: "Free tea at least please and candies; but overall we had a great time. The tour guide was very accommodating and easy to approach but they need to double check if all the tourist / passengers are in to avoid someone who will be left. Thank you till next time",
      r2: "I had a wonderful one-day tour in Abu Dhabi. The trip was well-organized and covered some basic spots around the city. Everything went smoothly, and the experience was enjoyable from start to finish. Our guide, Badam, did an excellent job throughout the tour. He explained clearly and shared interesting information, which made the trip even more memorable. Overall, it was a good experience and worth recommending",
      r3: "Five-star experience from start to finish. Ideal for first-time visitors and repeat travellers wanting a polished, insightful tour. Would book again without hesitation and recommend to friends and family looking to discover Abu Dhabi's beauty and heritage.",
      r4: "I enjoyed the entire tour today with Naser Badam. He was very accommodating and made the entire tour an enjoyable one. I would like to tour again hopefully Naser Badam will become our tour guide again when I come back again to visit United Arab Emirates with my friends and relatives.",
      r5: "Thank you for everything, we really do appreciate. It was really fun. We enjoy all the activities? The tours was amazing but you have to tell people about time. Thank you. May Allah bless us all",
      r6: "I recently went with NXT tours and the experience was very smooth overall and well-organized. The guide they provided was knowledgeable and friendly and will recommend to people to plan their trips",
      r7: "I wanted to express my heartfelt gratitude for the exceptional service your team NXT Tours provided during our recent tour. Your guide was knowledgeable, friendly, and made the experience truly unforgettable. Thank you for your professionalism and dedication. We highly recommend your company to anyone looking for a memorable experience. Keep up great work.",
      r8: "Excellent service. Treated us well and informed about the places and timings well ahead. Mr. Muhammed did a fantastic job throughout our journey. He patiently handled all the passengers. Recommended one",
      review: "Facebook review",
    },
    gallery: { eyebrow: "Guest Gallery", title: "Our Happy", titleAccent: "Travellers" },
    cta: {
      title: "Your UAE Adventure Starts With",
      titleAccent: "One Message",
      sub: "Join 60,000+ travellers who chose NXT Tours for their UAE experience.",
      btn1: "WhatsApp Us Now",
      btn2: "Browse All Tours",
    },
    footer: {
      tagline: "Dubai and UAE sightseeing tours, desert safaris, and private day trips.",
      quickLinks: "Quick Links",
      contact: "Contact",
      rights: "All rights reserved.",
    },
  },

  ar: {
    nav: { home: "الرئيسية", tours: "الجولات", about: "من نحن", contact: "اتصل بنا", book: "احجز عبر واتساب" },
    hero: {
      eyebrow: "استمتع",
      sub: "عقد من الخبرة، وأكثر من 60,000 مسافر سعيد، ووعد واحد: رحلة لا تُنسى عبر أروع وجهات الإمارات.",
      cta: "استكشف جولاتنا",
    },
    stats: { travellers: "مسافر سعيد", years: "سنوات من التميز", tours: "جولة مكتملة", rating: "متوسط التقييم" },
    why: {
      eyebrow: "لماذا تختارنا",
      title: "الفرق الذي",
      titleAccent: "تقدمه NXT Tours",
      sub: "مشغلون محليون حقيقيون، أسعار شفافة، ودعم لا يتوقف عند الحجز.",
      c1t: "10 سنوات من التميز",
      c1p: "عقد كامل من تقديم تجارب جولات إماراتية عالمية المستوى دون أي تنازل عن الجودة.",
      c2t: "خبراء محليون في الإمارات",
      c2p: "نحن لسنا وكالة حجوزات. نحن مشغلون محليون نعيش السياحة الإماراتية كل يوم.",
      c3t: "أفضل قيمة، في كل مرة",
      c3p: "أسعار شفافة بدون تكاليف خفية: تجارب مميزة بأسعار منطقية.",
      c4t: "دعم خمس نجوم",
      c4p: "من أول رسالة حتى التوصيلة، فريقنا معك في كل خطوة، 7 أيام في الأسبوع.",
    },
    spotAD: {
      eyebrow: "الأكثر مبيعاً",
      title: "جولة",
      titleAccent: "أبوظبي",
      tagline: "أشمل رحلة يومية في الإمارات",
      desc: "من روعة جامع الشيخ زايد الكبير إلى إثارة فيراري وورلد، هذه هي التجربة الكاملة ليوم كامل، يحبها العائلات والأزواج والمسافرون المنفردون.",
      l1: "جامع الشيخ زايد الكبير",
      l2: "فيراري وورلد ياس آيلاند",
      l3: "قصر الإمارات وأبراج الاتحاد",
      l4: "كورنيش أبوظبي",
      l5: "قصر الوطن",
      l6: "استقبال مجاني في دبي",
      more: "والمزيد",
      meta: "للشخص الواحد · ★ 4.9/5 من أكثر من 12,000 ضيف",
      cta: "المزيد من الجولات",
    },
    spotDS: {
      eyebrow: "المغامرة تنتظرك",
      title: "السفاري",
      titleAccent: "الصحراوي",
      tagline: "أكثر تجربة مثيرة في الإمارات",
      desc: "انطلق إلى كثبان الصحراء العربية الذهبية لتجربة لا تشبه أي شيء آخر: تطعيس الكثبان، ركوب الجمال، وعشاء تحت النجوم.",
      l1: "تطعيس الكثبان بسيارات الدفع الرباعي",
      l2: "تجربة ركوب الجمال",
      l3: "التزلج على الرمال",
      l4: "عشاء شواء تحت النجوم",
      l5: "عروض وترفيه حي",
      l6: "استقبال وتوصيل من الفندق",
      more: "والمزيد",
      meta: "للشخص الواحد",
      cta: "المزيد من الجولات",
    },
    adv: {
      eyebrow: "استكشف",
      title: "اختر",
      titleAccent: "مغامرتك",
      seeAll: "عرض كل الجولات",
      ad: { t: "جولة أبوظبي", d: "جامع الشيخ زايد، قصر الإمارات، فيراري وورلد والمزيد.", l1: "جامع الشيخ زايد الكبير", l2: "قصر الإمارات وأبراج الاتحاد", l3: "فيراري وورلد ياس آيلاند" },
      ht: { t: "جولة حتا", d: "بحيرات فيروزية، مسارات جبلية، وقمم جبال الحجر.", l1: "بحيرة سد حتا", l2: "طريق جبال الحجر الطبيعي", l3: "قرية حتا التراثية" },
      db: { t: "جولة دبي", d: "برج خليفة، نخلة جميرا، دبي القديمة وأفق المدينة الحديث.", l1: "وقفة تصوير عند برج خليفة", l2: "مرور بنخلة جميرا", l3: "دبي القديمة وخور دبي" },
      ds: { t: "السفاري الصحراوي", d: "تطعيس الكثبان، ركوب الجمال، عشاء شواء وترفيه حي.", l1: "تطعيس الكثبان بسيارات الدفع الرباعي", l2: "ركوب الجمال", l3: "عشاء شواء مع عروض حية" },
      viewDetails: "عرض التفاصيل",
    },
    process: {
      eyebrow: "4 خطوات سهلة",
      title: "الحجز",
      titleAccent: "بسيط",
      sub: "من أول رسالة حتى الاستقبال من الفندق، هذا كل ما يتطلبه الأمر.",
      s1t: "تصفح الجولات",
      s1p: "استكشف مجموعة جولاتنا في الإمارات واختر التجربة المثالية لك.",
      s2t: "تواصل معنا",
      s2p: "تواصل عبر واتساب أو املأ النموذج. فريقنا يرد خلال دقائق.",
      s3t: "تأكيد الحجز",
      s3p: "شاركنا تفاصيلك والتاريخ وعدد الأفراد، وسنؤكد كل شيء.",
      s4t: "نأتي لاستقبالك",
      s4p: "استرخِ فقط. سنكون عند فندقك أو محطة المترو في الوقت المحدد.",
      cta: "ابدأ حجزك عبر واتساب",
    },
    testi: {
      eyebrow: "آراء العملاء",
      title: "ماذا يقول",
      titleAccent: "ضيوفنا",
      seeMore: "المزيد من التقييمات على فيسبوك",
      r1: "على الأقل الشاي والحلويات مجاناً من فضلكم؛ لكن بشكل عام قضينا وقتاً رائعاً. كان المرشد متعاوناً جداً وسهل التواصل معه، لكن عليهم التأكد من وجود كل السياح لتجنب ترك أحدهم. شكراً حتى المرة القادمة",
      r2: "قضيت جولة رائعة ليوم واحد في أبوظبي. كانت الرحلة منظمة جيداً وشملت بعض الأماكن الأساسية حول المدينة. سار كل شيء بسلاسة، وكانت التجربة ممتعة من البداية للنهاية. مرشدنا بادام قام بعمل ممتاز طوال الجولة. شرح بوضوح وشارك معلومات مثيرة جعلت الرحلة أكثر تميزاً. بشكل عام كانت تجربة جيدة وتستحق التوصية",
      r3: "تجربة خمس نجوم من البداية للنهاية. مثالية للزوار لأول مرة وللمسافرين المتكررين الباحثين عن جولة راقية وغنية بالمعلومات. سأحجز مرة أخرى دون تردد وأوصي بها للأصدقاء والعائلة الراغبين في اكتشاف جمال وتراث أبوظبي.",
      r4: "استمتعت بالجولة كاملة اليوم مع ناصر بادام. كان متعاوناً جداً وجعل الجولة كاملة ممتعة. أتمنى أن أقوم بجولة أخرى معه عندما أزور الإمارات مرة أخرى مع أصدقائي وأقاربي.",
      r5: "شكراً على كل شيء، نقدر ذلك حقاً. كانت ممتعة جداً. استمتعنا بكل الأنشطة. كانت الجولات رائعة لكن يجب إخبار الناس بالتوقيت. شكراً، بارك الله فينا جميعاً",
      r6: "ذهبت مؤخراً مع NXT Tours وكانت التجربة سلسة جداً ومنظمة بشكل جيد. المرشد الذي قدموه كان ملماً وودوداً وسأوصي به للتخطيط لرحلاتهم",
      r7: "أردت أن أعبر عن امتناني القلبي للخدمة الاستثنائية التي قدمها فريق NXT Tours خلال جولتنا الأخيرة. كان مرشدنا ملماً وودوداً وجعل التجربة لا تُنسى حقاً. شكراً على احترافيتكم وتفانيكم. نوصي بشدة بشركتكم لأي شخص يبحث عن تجربة لا تُنسى. استمروا في العمل الرائع.",
      r8: "خدمة ممتازة. عاملونا بشكل جيد وأخبرونا بالأماكن والتوقيتات مسبقاً. السيد محمد قام بعمل رائع طوال رحلتنا. تعامل بصبر مع جميع الركاب. أوصي به",
      review: "تقييم فيسبوك",
    },
    gallery: { eyebrow: "معرض الضيوف", title: "مسافرونا", titleAccent: "السعداء" },
    cta: {
      title: "مغامرتك في الإمارات تبدأ",
      titleAccent: "برسالة واحدة",
      sub: "انضم إلى أكثر من 60,000 مسافر اختاروا NXT Tours لتجربتهم في الإمارات.",
      btn1: "راسلنا عبر واتساب الآن",
      btn2: "تصفح كل الجولات",
    },
    footer: {
      tagline: "جولات سياحية في دبي والإمارات، رحلات السفاري الصحراوية، والرحلات الخاصة.",
      quickLinks: "روابط سريعة",
      contact: "التواصل",
      rights: "جميع الحقوق محفوظة.",
    },
  },

  fil: {
    nav: { home: "Home", tours: "Mga Tour", about: "Tungkol Sa Amin", contact: "Kontakin Kami", book: "Mag-book sa WhatsApp" },
    hero: {
      eyebrow: "Karanasan",
      sub: "Isang dekada ng karanasan, 60,000+ masasayang manlalakbay, at isang pangako: isang hindi malilimutang paglalakbay sa pinakamagagandang destinasyon ng UAE.",
      cta: "Tuklasin Ang Aming Mga Tour",
    },
    stats: { travellers: "Masasayang Manlalakbay", years: "Taon ng Karanasan", tours: "Natapos na Tour", rating: "Karaniwang Rating" },
    why: {
      eyebrow: "Bakit Kami Ang Piliin",
      title: "Ang Pagkakaiba ng",
      titleAccent: "NXT Tours",
      sub: "Tunay na local na operator, transparent na presyo, at suportang hindi nagtatapos sa booking.",
      c1t: "10 Taon ng Kahusayan",
      c1p: "Isang dekada ng pagbibigay ng world-class na tour sa UAE nang walang kompromiso sa kalidad.",
      c2t: "Local na Eksperto sa UAE",
      c2p: "Hindi kami booking agency. Kami ay local operators na namumuhay at humihinga ng UAE tourism araw-araw.",
      c3t: "Pinakamahusay na Halaga, Palagi",
      c3p: "Transparent na presyo na walang tagong bayad: premium na karanasan sa presyong makatwiran.",
      c4t: "5-Star na Suporta",
      c4p: "Mula sa iyong unang mensahe hanggang sa drop-off, kasama mo ang aming team sa bawat hakbang, 7 araw sa isang linggo.",
    },
    spotAD: {
      eyebrow: "Aming Bestseller",
      title: "Abu Dhabi",
      titleAccent: "City Tour",
      tagline: "Ang Pinaka-Kumpletong Day Trip sa UAE",
      desc: "Mula sa kagrandehan ng Sheikh Zayed Grand Mosque hanggang sa kilig ng Ferrari World, ito ang pinakamahusay na full-day na karanasan, mahal ng mga pamilya, mag-asawa, at solo travellers.",
      l1: "Sheikh Zayed Grand Mosque",
      l2: "Ferrari World Yas Island",
      l3: "Emirates Palace at Etihad Towers",
      l4: "Abu Dhabi Corniche",
      l5: "Qasr Al Watan Palace",
      l6: "Libreng pickup sa Dubai",
      more: "At marami pang iba",
      meta: "kada tao · ★ 4.9/5 mula sa 12,000+ na bisita",
      cta: "Higit Pang Tour",
    },
    spotDS: {
      eyebrow: "Naghihintay Ang Adventure",
      title: "Desert",
      titleAccent: "Safari",
      tagline: "Ang Pinaka-Kaaya-ayang Karanasan sa UAE",
      desc: "Sumapi sa ginintuang buhangin ng disyertong Arabian para sa karanasang walang kapantay: dune bashing, pagsakay sa kamelyo, at hapunan sa ilalim ng mga bituin.",
      l1: "Dune bashing gamit ang 4x4",
      l2: "Karanasan sa pagsakay ng kamelyo",
      l3: "Sand boarding",
      l4: "Hapunang BBQ sa ilalim ng mga bituin",
      l5: "Live na entertainment at palabas",
      l6: "Hotel pickup at drop-off",
      more: "At marami pang iba",
      meta: "kada tao",
      cta: "Higit Pang Tour",
    },
    adv: {
      eyebrow: "Tuklasin",
      title: "Piliin Ang Iyong",
      titleAccent: "Adventure",
      seeAll: "Tingnan Lahat ng Tour",
      ad: { t: "Abu Dhabi City Tour", d: "Sheikh Zayed Mosque, Emirates Palace, Ferrari World at marami pa.", l1: "Sheikh Zayed Grand Mosque", l2: "Emirates Palace at Etihad Towers", l3: "Ferrari World Yas Island" },
      ht: { t: "Hatta City Tour", d: "Turquoise na lawa, mga daan sa bundok, at ang mga taluktok ng Hajar.", l1: "Hatta Dam lake", l2: "Scenic na drive sa Hajar Mountain", l3: "Hatta Heritage Village" },
      db: { t: "Dubai City Tour", d: "Burj Khalifa, Palm Jumeirah, Old Dubai, at ang modernong skyline.", l1: "Photo stop sa Burj Khalifa", l2: "Dumaan sa Palm Jumeirah", l3: "Old Dubai at Dubai Creek" },
      ds: { t: "Desert Safari", d: "Dune bashing, pagsakay ng kamelyo, hapunang BBQ, at live entertainment.", l1: "Dune bashing gamit ang 4x4", l2: "Pagsakay ng kamelyo", l3: "Hapunang BBQ na may live show" },
      viewDetails: "Tingnan ang Detalye",
    },
    process: {
      eyebrow: "4 Madaling Hakbang",
      title: "Madali Lang Ang",
      titleAccent: "Pag-book",
      sub: "Mula sa iyong unang mensahe hanggang sa iyong pickup, ito lang ang kailangan.",
      s1t: "Tingnan ang mga Tour",
      s1p: "Tuklasin ang aming mga tour sa UAE at hanapin ang perpektong karanasan para sa iyo.",
      s2t: "Kontakin Kami",
      s2p: "Mag-message sa WhatsApp o punan ang aming form. Sumasagot ang aming team sa loob ng ilang minuto.",
      s3t: "Kumpirmahin ang Booking",
      s3p: "Ibahagi ang iyong detalye, petsa, at bilang ng grupo, at kukumpirmahin namin ang lahat.",
      s4t: "Susunduin Ka Namin",
      s4p: "Magpahinga lang. Kami ang pupunta sa iyong pickup point sa tamang oras.",
      cta: "Simulan ang Booking sa WhatsApp",
    },
    testi: {
      eyebrow: "Mga Testimonial",
      title: "Ano ang Sabi ng",
      titleAccent: "Aming mga Bisita",
      seeMore: "Tingnan Pa ang Reviews sa Facebook",
      r1: "Sana libre man lang ang tsaa at kendi; pero sa kabuuan, masaya kami. Napaka-accommodating at madaling lapitan ng tour guide pero kailangan nilang i-double check kung kumpleto ang lahat ng turista para walang maiwan. Salamat, hanggang sa muli",
      r2: "Nagkaroon ako ng magandang one-day tour sa Abu Dhabi. Maayos ang byahe at sinakop nito ang ilang pangunahing lugar sa lungsod. Maayos ang lahat, at masaya ang karanasan mula simula hanggang katapusan. Ang guide naming si Badam ay napakahusay sa buong tour. Malinaw niyang ipinaliwanag at nagbahagi ng mga kawili-wiling impormasyon na naging mas espesyal ang byahe. Sa kabuuan, magandang karanasan at nararapat i-recommend",
      r3: "Five-star na karanasan mula simula hanggang katapusan. Perpekto para sa mga unang beses na bisita at paulit-ulit na manlalakbay na gustong magkaroon ng maayos at makabuluhang tour. Mag-book ulit ako nang walang alinlangan at i-recommend sa mga kaibigan at pamilya na gustong tuklasin ang ganda at kasaysayan ng Abu Dhabi.",
      r4: "Nag-enjoy ako sa buong tour ngayon kasama si Naser Badam. Napaka-accommodating niya at ginawa niyang masaya ang buong tour. Gusto kong mag-tour ulit sana maging guide namin ulit si Naser Badam kapag bumalik ako sa United Arab Emirates kasama ang aking mga kaibigan at kamag-anak.",
      r5: "Salamat sa lahat, tunay naming pinahahalagahan. Sobrang saya. Na-enjoy namin ang lahat ng aktibidad. Kahanga-hanga ang mga tour pero kailangang sabihin sa mga tao ang tungkol sa oras. Salamat, sana pagpalain tayong lahat",
      r6: "Kamakailan ay sumama ako sa NXT tours at napakaayos at organisado ng karanasan sa kabuuan. Ang guide na ibinigay nila ay maalam at palakaibigan at i-rerecommend ko sa mga gustong mag-plano ng kanilang byahe",
      r7: "Gusto kong ipahayag ang taos-pusong pasasalamat sa natatanging serbisyo na ibinigay ng inyong team sa NXT Tours sa aming kamakailang tour. Ang guide ninyo ay maalam, palakaibigan, at ginawang tunay na hindi malilimutan ang karanasan. Salamat sa inyong propesyonalismo at dedikasyon. Lubos naming i-rerecommend ang inyong kompanya sa sinumang naghahanap ng hindi malilimutang karanasan. Ipagpatuloy ang magandang trabaho.",
      r8: "Napakahusay na serbisyo. Mabuti ang pagtrato sa amin at ipinaalam nila nang maaga ang mga lugar at oras. Ginawan ni Mr. Muhammed ng napakahusay na trabaho sa buong byahe namin. Mahinahon niyang hinawakan ang lahat ng pasahero. Recommended",
      review: "Facebook review",
    },
    gallery: { eyebrow: "Guest Gallery", title: "Aming Masasayang", titleAccent: "Manlalakbay" },
    cta: {
      title: "Ang Iyong UAE Adventure ay Magsisimula sa",
      titleAccent: "Isang Mensahe",
      sub: "Sumali sa 60,000+ manlalakbay na pumili ng NXT Tours para sa kanilang karanasan sa UAE.",
      btn1: "Mag-WhatsApp Sa Amin Ngayon",
      btn2: "Tingnan Lahat ng Tour",
    },
    footer: {
      tagline: "Mga sightseeing tour sa Dubai at UAE, desert safari, at pribadong day trip.",
      quickLinks: "Mabilisang Link",
      contact: "Kontak",
      rights: "Lahat ng karapatan ay nakalaan.",
    },
  },

  hi: {
    nav: { home: "होम", tours: "टूर्स", about: "हमारे बारे में", contact: "संपर्क करें", book: "व्हाट्सएप पर बुक करें" },
    hero: {
      eyebrow: "अनुभव करें",
      sub: "एक दशक का अनुभव, 60,000+ खुश यात्री, और एक वादा: यूएई के सबसे शानदार स्थलों की एक अविस्मरणीय यात्रा।",
      cta: "हमारे टूर्स देखें",
    },
    stats: { travellers: "खुश यात्री", years: "वर्षों की उत्कृष्टता", tours: "पूर्ण टूर्स", rating: "औसत रेटिंग" },
    why: {
      eyebrow: "हमें क्यों चुनें",
      title: "NXT Tours का",
      titleAccent: "फर्क",
      sub: "असली स्थानीय संचालक, पारदर्शी कीमतें, और बुकिंग के बाद भी जारी रहने वाला सपोर्ट।",
      c1t: "10 वर्षों की उत्कृष्टता",
      c1p: "गुणवत्ता से कोई समझौता किए बिना विश्व स्तरीय यूएई टूर अनुभव प्रदान करने का एक दशक।",
      c2t: "यूएई के जमीनी विशेषज्ञ",
      c2p: "हम बुकिंग एजेंसी नहीं हैं। हम स्थानीय संचालक हैं जो रोज़ यूएई पर्यटन में जीते हैं।",
      c3t: "हर बार सबसे अच्छी वैल्यू",
      c3p: "बिना किसी छिपी लागत के पारदर्शी कीमतें: वाजिब कीमतों पर प्रीमियम अनुभव।",
      c4t: "5-स्टार सपोर्ट",
      c4p: "आपके पहले संदेश से लेकर ड्रॉप-ऑफ तक, हमारी टीम हर कदम पर आपके साथ है, सप्ताह के 7 दिन।",
    },
    spotAD: {
      eyebrow: "हमारा बेस्टसेलर",
      title: "अबू धाबी",
      titleAccent: "सिटी टूर",
      tagline: "यूएई की सबसे संपूर्ण डे ट्रिप",
      desc: "शेख जायद ग्रांड मस्जिद की भव्यता से लेकर फेरारी वर्ल्ड के रोमांच तक, यह परिवारों, जोड़ों और अकेले यात्रा करने वालों को पसंद आने वाला पूरे दिन का बेहतरीन अनुभव है।",
      l1: "शेख जायद ग्रांड मस्जिद",
      l2: "फेरारी वर्ल्ड यास आइलैंड",
      l3: "एमिरेट्स पैलेस और एतिहाद टावर्स",
      l4: "अबू धाबी कॉर्निश",
      l5: "कसर अल वतन पैलेस",
      l6: "दुबई में मुफ़्त पिकअप",
      more: "और भी बहुत कुछ",
      meta: "प्रति व्यक्ति · ★ 4.9/5, 12,000+ मेहमानों से",
      cta: "और टूर्स",
    },
    spotDS: {
      eyebrow: "एडवेंचर का इंतज़ार है",
      title: "डेज़र्ट",
      titleAccent: "सफारी",
      tagline: "यूएई का सबसे रोमांचक अनुभव",
      desc: "अरब रेगिस्तान के सुनहरे टीलों में एक ऐसे अनुभव के लिए निकलें जैसा कुछ और नहीं: ड्यून बशिंग, ऊंट की सवारी, और तारों के नीचे रात का खाना।",
      l1: "4x4 वाहनों में ड्यून बशिंग",
      l2: "ऊंट की सवारी का अनुभव",
      l3: "सैंड बोर्डिंग",
      l4: "तारों के नीचे बीबीक्यू डिनर",
      l5: "लाइव मनोरंजन और शो",
      l6: "होटल पिकअप और ड्रॉप-ऑफ",
      more: "और भी बहुत कुछ",
      meta: "प्रति व्यक्ति",
      cta: "और टूर्स",
    },
    adv: {
      eyebrow: "एक्सप्लोर करें",
      title: "अपना",
      titleAccent: "एडवेंचर चुनें",
      seeAll: "सभी टूर्स देखें",
      ad: { t: "अबू धाबी सिटी टूर", d: "शेख जायद मस्जिद, एमिरेट्स पैलेस, फेरारी वर्ल्ड और भी बहुत कुछ।", l1: "शेख जायद ग्रांड मस्जिद", l2: "एमिरेट्स पैलेस और एतिहाद टावर्स", l3: "फेरारी वर्ल्ड यास आइलैंड" },
      ht: { t: "हत्ता सिटी टूर", d: "फ़िरोज़ी झीलें, पहाड़ी रास्ते और हजर की चोटियां।", l1: "हत्ता डैम झील", l2: "हजर पर्वत की सुंदर ड्राइव", l3: "हत्ता हेरिटेज विलेज" },
      db: { t: "दुबई सिटी टूर", d: "बुर्ज खलीफा, पाम जुमेराह, ओल्ड दुबई और आधुनिक स्काईलाइन।", l1: "बुर्ज खलीफा फोटो स्टॉप", l2: "पाम जुमेराह ड्राइव-बाय", l3: "ओल्ड दुबई और दुबई क्रीक" },
      ds: { t: "डेज़र्ट सफारी", d: "ड्यून बशिंग, ऊंट की सवारी, बीबीक्यू डिनर और लाइव मनोरंजन।", l1: "4x4 वाहनों में ड्यून बशिंग", l2: "ऊंट की सवारी", l3: "लाइव शो के साथ बीबीक्यू डिनर" },
      viewDetails: "विवरण देखें",
    },
    process: {
      eyebrow: "4 आसान कदम",
      title: "बुकिंग है",
      titleAccent: "आसान",
      sub: "आपके पहले संदेश से लेकर होटल पिकअप तक, बस इतना ही चाहिए।",
      s1t: "टूर्स देखें",
      s1p: "हमारे यूएई टूर्स देखें और अपने लिए सही अनुभव चुनें।",
      s2t: "हमसे संपर्क करें",
      s2p: "व्हाट्सएप पर मैसेज करें या हमारा फॉर्म भरें। हमारी टीम मिनटों में जवाब देती है।",
      s3t: "बुकिंग कन्फर्म करें",
      s3p: "अपनी जानकारी, तारीख और ग्रुप साइज़ बताएं, हम सब कन्फर्म कर देंगे।",
      s4t: "हम आपको लेने आएंगे",
      s4p: "बस आराम करें। हम समय पर आपके होटल या मेट्रो स्टेशन पर होंगे।",
      cta: "व्हाट्सएप पर बुकिंग शुरू करें",
    },
    testi: {
      eyebrow: "प्रशंसापत्र",
      title: "हमारे मेहमान",
      titleAccent: "क्या कहते हैं",
      seeMore: "फेसबुक पर और रिव्यू देखें",
      r1: "कम से कम चाय और मिठाई मुफ्त होनी चाहिए; लेकिन कुल मिलाकर हमें बहुत अच्छा समय बिताया। टूर गाइड बहुत सहयोगी और मिलनसार था लेकिन उन्हें यह दोबारा जांचना चाहिए कि सभी यात्री मौजूद हैं ताकि किसी को पीछे न छोड़ा जाए। अगली बार तक धन्यवाद",
      r2: "मैंने अबू धाबी में एक शानदार वन-डे टूर किया। यात्रा अच्छी तरह से व्यवस्थित थी और शहर के कुछ प्रमुख स्थानों को कवर करती थी। सब कुछ सुचारू रूप से चला, और अनुभव शुरू से अंत तक आनंददायक रहा। हमारे गाइड बदम ने पूरे टूर में बेहतरीन काम किया। उन्होंने स्पष्ट रूप से समझाया और दिलचस्प जानकारी साझा की, जिससे यात्रा और भी यादगार बन गई। कुल मिलाकर, यह एक अच्छा अनुभव था और सिफारिश के लायक है",
      r3: "शुरू से अंत तक फाइव-स्टार अनुभव। पहली बार आने वालों और बार-बार आने वाले यात्रियों दोनों के लिए एक शानदार, जानकारीपूर्ण टूर के लिए आदर्श। बिना किसी हिचकिचाहट के फिर से बुक करूंगा और अबू धाबी की सुंदरता और विरासत को जानने के इच्छुक दोस्तों और परिवार को सिफारिश करूंगा।",
      r4: "आज मैंने नासेर बदम के साथ पूरे टूर का आनंद लिया। वह बहुत सहयोगी थे और उन्होंने पूरे टूर को आनंददायक बना दिया। मुझे उम्मीद है कि जब मैं दोबारा अपने दोस्तों और रिश्तेदारों के साथ संयुक्त अरब अमीरात आऊंगा तो नासेर बदम फिर से हमारे गाइड बनेंगे।",
      r5: "सब कुछ के लिए धन्यवाद, हम वाकई सराहना करते हैं। यह वाकई मज़ेदार था। हमने सभी गतिविधियों का आनंद लिया। टूर्स कमाल के थे लेकिन लोगों को समय के बारे में बताना ज़रूरी है। धन्यवाद, अल्लाह हम सभी को बरकत दे",
      r6: "मैं हाल ही में NXT tours के साथ गया और अनुभव कुल मिलाकर बहुत सहज और सुव्यवस्थित था। उन्होंने जो गाइड दिया वह जानकार और मिलनसार था और मैं अपनी यात्राओं की योजना बनाने के लिए लोगों को इसकी सिफारिश करूंगा",
      r7: "मैं हमारे हालिया टूर के दौरान आपकी टीम NXT Tours द्वारा प्रदान की गई असाधारण सेवा के लिए अपना दिल से आभार व्यक्त करना चाहता हूं। आपका गाइड जानकार, मिलनसार था और उसने अनुभव को वाकई अविस्मरणीय बना दिया। आपकी व्यावसायिकता और समर्पण के लिए धन्यवाद। हम किसी भी यादगार अनुभव की तलाश में मौजूद व्यक्ति को आपकी कंपनी की पुरजोर सिफारिश करते हैं। बेहतरीन काम जारी रखें।",
      r8: "बेहतरीन सेवा। हमारे साथ अच्छा व्यवहार किया और जगहों और समय के बारे में पहले से बताया। श्री मुहम्मद ने हमारी पूरी यात्रा में शानदार काम किया। उन्होंने सभी यात्रियों को धैर्यपूर्वक संभाला। अनुशंसित",
      review: "फेसबुक रिव्यू",
    },
    gallery: { eyebrow: "गेस्ट गैलरी", title: "हमारे खुश", titleAccent: "यात्री" },
    cta: {
      title: "आपका यूएई एडवेंचर शुरू होता है",
      titleAccent: "एक मैसेज से",
      sub: "60,000+ यात्रियों से जुड़ें जिन्होंने अपने यूएई अनुभव के लिए NXT Tours को चुना।",
      btn1: "अभी व्हाट्सएप करें",
      btn2: "सभी टूर्स देखें",
    },
    footer: {
      tagline: "दुबई और यूएई साइटसीइंग टूर्स, डेज़र्ट सफारी, और प्राइवेट डे ट्रिप्स।",
      quickLinks: "क्विक लिंक्स",
      contact: "संपर्क",
      rights: "सर्वाधिकार सुरक्षित।",
    },
  },

  ur: {
    nav: { home: "ہوم", tours: "ٹورز", about: "ہمارے بارے میں", contact: "رابطہ کریں", book: "واٹس ایپ پر بک کریں" },
    hero: {
      eyebrow: "تجربہ کریں",
      sub: "ایک دہائی کا تجربہ، 60,000+ خوش مسافر، اور ایک وعدہ: متحدہ عرب امارات کے شاندار ترین مقامات کا ناقابلِ فراموش سفر۔",
      cta: "ہمارے ٹورز دیکھیں",
    },
    stats: { travellers: "خوش مسافر", years: "سالوں کی مہارت", tours: "مکمل ٹورز", rating: "اوسط ریٹنگ" },
    why: {
      eyebrow: "ہمیں کیوں چنیں",
      title: "NXT Tours کا",
      titleAccent: "فرق",
      sub: "حقیقی مقامی آپریٹرز، شفاف قیمتیں، اور ایسا سپورٹ جو بکنگ پر ختم نہیں ہوتا۔",
      c1t: "10 سال کی مہارت",
      c1p: "معیار پر کوئی سمجھوتہ کیے بغیر عالمی معیار کے یو اے ای ٹور تجربات فراہم کرنے کی ایک دہائی۔",
      c2t: "یو اے ای کے زمینی ماہرین",
      c2p: "ہم بکنگ ایجنسی نہیں ہیں۔ ہم مقامی آپریٹرز ہیں جو ہر روز یو اے ای سیاحت میں جیتے ہیں۔",
      c3t: "ہر بار بہترین قیمت",
      c3p: "بغیر کسی چھپی لاگت کے شفاف قیمتیں: مناسب قیمتوں پر بہترین تجربات۔",
      c4t: "5-اسٹار سپورٹ",
      c4p: "آپ کے پہلے پیغام سے لے کر ڈراپ آف تک، ہماری ٹیم ہر قدم پر آپ کے ساتھ ہے، ہفتے کے 7 دن۔",
    },
    spotAD: {
      eyebrow: "ہمارا بیسٹ سیلر",
      title: "ابوظہبی",
      titleAccent: "سٹی ٹور",
      tagline: "یو اے ای کی سب سے مکمل ڈے ٹرپ",
      desc: "شیخ زاید گرینڈ مسجد کی شان سے لے کر فراری ورلڈ کے جوش تک، یہ خاندانوں، جوڑوں اور اکیلے سفر کرنے والوں کا پسندیدہ، بھرپور دن کا بہترین تجربہ ہے۔",
      l1: "شیخ زاید گرینڈ مسجد",
      l2: "فراری ورلڈ یاس آئی لینڈ",
      l3: "ایمریٹس پیلس اور اتحاد ٹاورز",
      l4: "ابوظہبی کورنیش",
      l5: "قصر الوطن",
      l6: "دبئی میں مفت پک اپ",
      more: "اور بہت کچھ",
      meta: "فی شخص · ★ 4.9/5، 12,000+ مہمانوں کی جانب سے",
      cta: "مزید ٹورز",
    },
    spotDS: {
      eyebrow: "ایڈونچر کا انتظار ہے",
      title: "ڈیزرٹ",
      titleAccent: "سفاری",
      tagline: "یو اے ای کا سب سے دلچسپ تجربہ",
      desc: "عرب صحرا کے سنہری ٹیلوں میں ایک ایسے تجربے کے لیے نکلیں جو کسی اور چیز جیسا نہیں: ڈیون بیشنگ، اونٹ کی سواری، اور ستاروں کے نیچے رات کا کھانا۔",
      l1: "4x4 گاڑیوں میں ڈیون بیشنگ",
      l2: "اونٹ کی سواری کا تجربہ",
      l3: "سینڈ بورڈنگ",
      l4: "ستاروں کے نیچے باربی کیو ڈنر",
      l5: "لائیو تفریح اور شوز",
      l6: "ہوٹل پک اپ اور ڈراپ آف",
      more: "اور بہت کچھ",
      meta: "فی شخص",
      cta: "مزید ٹورز",
    },
    adv: {
      eyebrow: "دریافت کریں",
      title: "اپنا",
      titleAccent: "ایڈونچر چنیں",
      seeAll: "تمام ٹورز دیکھیں",
      ad: { t: "ابوظہبی سٹی ٹور", d: "شیخ زاید مسجد، ایمریٹس پیلس، فراری ورلڈ اور بہت کچھ۔", l1: "شیخ زاید گرینڈ مسجد", l2: "ایمریٹس پیلس اور اتحاد ٹاورز", l3: "فراری ورلڈ یاس آئی لینڈ" },
      ht: { t: "حتا سٹی ٹور", d: "فیروزی جھیلیں، پہاڑی راستے اور حجر کی چوٹیاں۔", l1: "حتا ڈیم جھیل", l2: "حجر پہاڑ کی خوبصورت ڈرائیو", l3: "حتا ہیریٹیج ویلیج" },
      db: { t: "دبئی سٹی ٹور", d: "برج خلیفہ، پام جمیرہ، پرانا دبئی اور جدید اسکائی لائن۔", l1: "برج خلیفہ فوٹو اسٹاپ", l2: "پام جمیرہ سے گزر", l3: "پرانا دبئی اور دبئی کریک" },
      ds: { t: "ڈیزرٹ سفاری", d: "ڈیون بیشنگ، اونٹ کی سواری، باربی کیو ڈنر اور لائیو تفریح۔", l1: "4x4 گاڑیوں میں ڈیون بیشنگ", l2: "اونٹ کی سواری", l3: "لائیو شو کے ساتھ باربی کیو ڈنر" },
      viewDetails: "تفصیلات دیکھیں",
    },
    process: {
      eyebrow: "4 آسان قدم",
      title: "بکنگ ہے",
      titleAccent: "آسان",
      sub: "آپ کے پہلے پیغام سے لے کر ہوٹل پک اپ تک، بس اتنا ہی چاہیے۔",
      s1t: "ٹورز دیکھیں",
      s1p: "ہمارے یو اے ای ٹورز دیکھیں اور اپنے لیے بہترین تجربہ چنیں۔",
      s2t: "ہم سے رابطہ کریں",
      s2p: "واٹس ایپ پر پیغام بھیجیں یا ہمارا فارم بھریں۔ ہماری ٹیم منٹوں میں جواب دیتی ہے۔",
      s3t: "بکنگ کنفرم کریں",
      s3p: "اپنی تفصیلات، تاریخ اور گروپ کا حجم بتائیں، ہم سب کچھ کنفرم کر دیں گے۔",
      s4t: "ہم آپ کو لینے آئیں گے",
      s4p: "بس آرام کریں۔ ہم وقت پر آپ کے ہوٹل یا میٹرو اسٹیشن پر ہوں گے۔",
      cta: "واٹس ایپ پر بکنگ شروع کریں",
    },
    testi: {
      eyebrow: "تاثرات",
      title: "ہمارے مہمان",
      titleAccent: "کیا کہتے ہیں",
      seeMore: "فیس بک پر مزید ریویوز دیکھیں",
      r1: "کم از کم چائے اور مٹھائی مفت ہونی چاہیے؛ لیکن مجموعی طور پر ہمارا وقت بہت اچھا گزرا۔ ٹور گائیڈ بہت تعاون کرنے والا اور ملنسار تھا لیکن انہیں دوبارہ چیک کرنا چاہیے کہ تمام مسافر موجود ہیں تاکہ کوئی پیچھے نہ رہ جائے۔ اگلی بار تک شکریہ",
      r2: "میں نے ابوظہبی میں ایک شاندار ون ڈے ٹور کیا۔ سفر اچھی طرح منظم تھا اور شہر کے کچھ بنیادی مقامات کا احاطہ کرتا تھا۔ سب کچھ ہموار طریقے سے چلا، اور تجربہ شروع سے آخر تک خوشگوار رہا۔ ہمارے گائیڈ بدم نے پورے ٹور میں بہترین کام کیا۔ انہوں نے واضح طور پر سمجھایا اور دلچسپ معلومات شیئر کیں جس نے سفر کو مزید یادگار بنا دیا۔ مجموعی طور پر یہ ایک اچھا تجربہ تھا اور سفارش کے قابل ہے",
      r3: "شروع سے آخر تک فائیو اسٹار تجربہ۔ پہلی بار آنے والوں اور بار بار سفر کرنے والوں دونوں کے لیے ایک شاندار اور معلوماتی ٹور کے لیے مثالی۔ بلا جھجک دوبارہ بک کروں گا اور ابوظہبی کی خوبصورتی اور ورثے کو جاننے کے خواہشمند دوستوں اور خاندان کو تجویز کروں گا۔",
      r4: "آج میں نے ناصر بدم کے ساتھ پورے ٹور سے لطف اندوز ہوا۔ وہ بہت تعاون کرنے والے تھے اور انہوں نے پورے ٹور کو خوشگوار بنا دیا۔ امید ہے کہ جب میں دوبارہ اپنے دوستوں اور رشتہ داروں کے ساتھ متحدہ عرب امارات آؤں گا تو ناصر بدم دوبارہ ہمارے گائیڈ ہوں گے۔",
      r5: "ہر چیز کا شکریہ، ہم واقعی قدر کرتے ہیں۔ یہ واقعی مزیدار تھا۔ ہم نے تمام سرگرمیوں سے لطف اٹھایا۔ ٹورز حیرت انگیز تھے لیکن لوگوں کو وقت کے بارے میں بتانا ضروری ہے۔ شکریہ، اللہ ہم سب کو برکت دے",
      r6: "میں حال ہی میں NXT tours کے ساتھ گیا اور تجربہ مجموعی طور پر بہت ہموار اور منظم تھا۔ انہوں نے جو گائیڈ فراہم کیا وہ باخبر اور ملنسار تھا اور میں لوگوں کو ان کے سفر کی منصوبہ بندی کے لیے اس کی سفارش کروں گا",
      r7: "میں اپنے حالیہ ٹور کے دوران آپ کی ٹیم NXT Tours کی طرف سے فراہم کردہ غیر معمولی خدمت کے لیے دل کی گہرائیوں سے شکریہ ادا کرنا چاہتا ہوں۔ آپ کا گائیڈ باخبر، ملنسار تھا اور اس نے تجربے کو واقعی ناقابل فراموش بنا دیا۔ آپ کی پیشہ ورانہ مہارت اور لگن کا شکریہ۔ ہم کسی بھی یادگار تجربے کی تلاش میں موجود شخص کو آپ کی کمپنی کی بھرپور سفارش کرتے ہیں۔ بہترین کام جاری رکھیں۔",
      r8: "بہترین خدمت۔ ہمارے ساتھ اچھا سلوک کیا اور جگہوں اور اوقات کے بارے میں پہلے سے بتایا۔ مسٹر محمد نے ہمارے پورے سفر میں شاندار کام کیا۔ انہوں نے تمام مسافروں کو صبر سے سنبھالا۔ تجویز کردہ",
      review: "فیس بک ریویو",
    },
    gallery: { eyebrow: "گیسٹ گیلری", title: "ہمارے خوش", titleAccent: "مسافر" },
    cta: {
      title: "آپ کا یو اے ای ایڈونچر شروع ہوتا ہے",
      titleAccent: "ایک پیغام سے",
      sub: "60,000+ مسافروں میں شامل ہوں جنہوں نے اپنے یو اے ای تجربے کے لیے NXT Tours کو چنا۔",
      btn1: "ابھی واٹس ایپ کریں",
      btn2: "تمام ٹورز دیکھیں",
    },
    footer: {
      tagline: "دبئی اور یو اے ای سائٹ سیئنگ ٹورز، ڈیزرٹ سفاری، اور پرائیویٹ ڈے ٹرپس۔",
      quickLinks: "فوری لنکس",
      contact: "رابطہ",
      rights: "جملہ حقوق محفوظ ہیں۔",
    },
  },
};

// ---- Engine: reads data-i18n attributes and swaps text/placeholders/dir ----

const getKey = (obj, path) => path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);

const setLanguage = (lang) => {
  if (!LANGUAGES[lang]) lang = "en";
  localStorage.setItem("nxt-lang", lang);

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGUAGES[lang].dir;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const text = getKey(dict, el.dataset.i18n) ?? getKey(TRANSLATIONS.en, el.dataset.i18n);
    if (text !== undefined) el.textContent = text;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const text = getKey(dict, el.dataset.i18nPlaceholder) ?? getKey(TRANSLATIONS.en, el.dataset.i18nPlaceholder);
    if (text !== undefined) el.placeholder = text;
  });

  document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
    const active = btn.dataset.langSwitch === lang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const currentLabel = document.querySelector("[data-lang-current]");
  if (currentLabel) currentLabel.textContent = lang.toUpperCase();
};

// ---- Switcher UI: builds the dropdown once per page ----

document.querySelectorAll("[data-lang-menu]").forEach((menu) => {
  Object.keys(LANGUAGES).forEach((code) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-option";
    btn.dataset.langSwitch = code;
    btn.innerHTML = '<span class="lang-native"></span><span class="lang-label"></span>';
    btn.querySelector(".lang-native").textContent = LANGUAGES[code].native;
    btn.querySelector(".lang-label").textContent = LANGUAGES[code].label;
    btn.addEventListener("click", () => {
      setLanguage(code);
      menu.closest("[data-lang-widget]").classList.remove("is-open");
    });
    menu.appendChild(btn);
  });
});

document.querySelectorAll("[data-lang-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle.closest("[data-lang-widget]").classList.toggle("is-open");
  });
});

document.addEventListener("click", (e) => {
  document.querySelectorAll("[data-lang-widget].is-open").forEach((w) => {
    if (!w.contains(e.target)) w.classList.remove("is-open");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll("[data-lang-widget].is-open").forEach((w) => w.classList.remove("is-open"));
});

setLanguage(localStorage.getItem("nxt-lang") || "en");
