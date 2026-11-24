package com.mandisaathi.service;

import java.util.regex.Pattern;

final class CommodityAliases {
    private static final Pattern CUMIN = Pattern.compile("(?iuU)\\b(?:cumin|cummin|jeera|jira|जीरा|ਜ਼ੀਰਾ|જીરું|జీలకర్ర|சீரகம்|ಜೀರಿಗೆ|ജീരകം)\\b");
    private static final Pattern CHILLI = Pattern.compile("(?iuU)\\b(?:chilli|chilly|chili|chillies|mirch|mirchi|मिर्च|लाल मिर्च|ਮਿਰਚ|મરચું|লঙ্কা|మిరప|మిరపకాయ|மிளகாய்|ಮೆಣಸಿನಕಾಯಿ|മുളക്)\\b");
    private static final Pattern TURMERIC = Pattern.compile("(?iuU)\\b(?:turmeric|haldi|हल्दी|हळद|ਹਲਦੀ|હળદર|হলুদ|పసుపు|மஞ்சள்|ಅರಿಶಿನ|മഞ്ഞൾ)\\b");
    private static final Pattern GROUNDNUT = Pattern.compile("(?iuU)\\b(?:groundnut|peanut|peanuts|moongfali|mungfali|मूंगफली|शेंगदाणा|ਮੂੰਗਫਲੀ|મગફળી|চিনাবাদাম|వేరుశనగ|வேர்க்கடலை|ಕಡಲೆಕಾಯಿ|നിലക്കടല)\\b");
    private static final Pattern BAJRA = Pattern.compile("(?iuU)\\b(?:bajra|pearl millet|millet|बाजरा|बाजरी|ਬਾਜਰਾ|બાજરી|বাজরা|సజ్జలు|கம்பு|ಸಜ್ಜೆ|കമ്പം)\\b");
    private static final Pattern RAGI = Pattern.compile("(?iuU)\\b(?:ragi|finger millet|mandua|nachni|रागी|मंडुआ|ਨਾਚਣੀ|ਰਾਗੀ|નાચણી|రాగులు|கேழ்வரகு|ರಾಗಿ|റാഗി)\\b");
    private static final Pattern APPLE = Pattern.compile("(?iuU)\\b(?:apple|apples|seb|सेब|ਸੇਬ|सफरचंद|સફરજન|আপেল|ఆపిల్|ஆப்பிள்|ಸೇಬು|ആപ്പിൾ)\\b");

    private CommodityAliases() {}

    static boolean isCumin(String value) {
        return value != null && CUMIN.matcher(value).find();
    }

    static boolean isChilli(String value) {
        return value != null && CHILLI.matcher(value).find();
    }

    static boolean isTurmeric(String value) {
        return value != null && TURMERIC.matcher(value).find();
    }

    static boolean isGroundnut(String value) {
        return value != null && GROUNDNUT.matcher(value).find();
    }

    static boolean isBajra(String value) {
        return value != null && BAJRA.matcher(value).find();
    }

    static boolean isRagi(String value) {
        return value != null && RAGI.matcher(value).find();
    }

    static boolean isApple(String value) {
        return value != null && APPLE.matcher(value).find();
    }
}
