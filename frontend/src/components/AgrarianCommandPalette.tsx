import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@astryxdesign/core/CommandPalette';
import { createStaticSource, type SearchableItem } from '@astryxdesign/core/Typeahead';
import { Badge } from '@astryxdesign/core/Badge';
import {
  Compass,
  CurrencyInr,
  Scales,
  Bank,
  ClipboardText,
  SlidersHorizontal,
  Moon,
  Sun,
  House,
  SquaresFour,
} from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { INDIAN_CROPS } from '../data/indianCrops';

interface AgrarianCommandAux {
  group: string;
  subtitle: string;
  aliases: string[];
  action: 'navigate' | 'toggle-theme';
  target?: string;
  badge?: string;
  iconKey:
    | 'home'
    | 'prices'
    | 'compare'
    | 'schemes'
    | 'complaints'
    | 'more'
    | 'settings'
    | 'commodity'
    | 'theme';
}

type AgrarianCommandItem = SearchableItem<AgrarianCommandAux>;

interface AgrarianCommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMODITY_SHORTCUTS = [
  { code: 'CHILLI', name: 'Chilli', aliases: ['chilli', 'chili', 'mirch', 'mirchi', 'मिर्च', 'ਮਿਰਚ', 'मिरची', 'guntur', 'byadgi', 'warangal'], sub: 'Guntur · Byadgi · Warangal' },
  { code: 'CUMIN', name: 'Cumin (Jeera)', aliases: ['cumin', 'jeera', 'jira', 'जीरा', 'ਜ਼ੀਰਾ', 'जिरे', 'jodhpur', 'unjha'], sub: 'Unjha · Jodhpur · Nagaur' },
  { code: 'TURMERIC', name: 'Turmeric (Haldi)', aliases: ['turmeric', 'haldi', 'हल्दी', 'हळद', 'ਹਲਦੀ', 'sangli', 'erode', 'nizamabad'], sub: 'Sangli · Erode · Nizamabad' },
  { code: 'WHEAT', name: 'Wheat', aliases: ['wheat', 'gehu', 'गेहूं', 'ਕਣਕ', 'indore', 'khanna'], sub: 'Indore · Khanna · Sehore' },
  { code: 'PADDY', name: 'Paddy (Dhan)', aliases: ['paddy', 'rice', 'dhan', 'धान', 'ਝੋਨਾ', 'karnal', 'burdwan', 'raipur'], sub: 'Karnal · Burdwan · Raipur' },
  { code: 'MUSTARD', name: 'Mustard', aliases: ['mustard', 'sarson', 'सरसों', 'ਸਰ੍ਹੋਂ', 'alwar', 'bharatpur', 'jaipur'], sub: 'Alwar · Bharatpur · Jaipur' },
  { code: 'COTTON', name: 'Cotton', aliases: ['cotton', 'kapas', 'कपास', 'ਰਾਜਕੋਟ', 'rajkot', 'warangal'], sub: 'Rajkot · Akola · Warangal' },
  { code: 'SOYBEAN', name: 'Soybean', aliases: ['soybean', 'soya', 'सोयाबीन', 'latur', 'ujjain'], sub: 'Latur · Ujjain · Dewas' },
  { code: 'GROUNDNUT', name: 'Groundnut', aliases: ['groundnut', 'peanut', 'moongfali', 'मूंगफली', 'ਮੂੰਗਫਲੀ', 'rajkot', 'junagadh'], sub: 'Rajkot · Junagadh · Bikaner' },
  { code: 'ONION', name: 'Onion', aliases: ['onion', 'pyaz', 'प्याज', 'nashik', 'lasalgaon'], sub: 'Lasalgaon · Nashik · Indore' },
  { code: 'POTATO', name: 'Potato', aliases: ['potato', 'aalu', 'आलू', 'agra', 'deesa'], sub: 'Agra · Indore · Deesa' },
  { code: 'TOMATO', name: 'Tomato', aliases: ['tomato', 'tamatar', 'टमाटर', 'kolar', 'pimpalgaon'], sub: 'Kolar · Pimpalgaon · Madanapalle' },
  { code: 'BAJRA', name: 'Bajra', aliases: ['bajra', 'millet', 'बाजरा', 'ਬਾਜਰਾ', 'jodhpur', 'jaipur'], sub: 'Jodhpur · Jaipur · Alwar' },
  { code: 'RAGI', name: 'Ragi', aliases: ['ragi', 'nachni', 'रागी', 'mandua', 'bengaluru', 'kolar'], sub: 'Bengaluru · Kolar · Hassan' },
  { code: 'APPLE', name: 'Apple', aliases: ['apple', 'seb', 'सेब', 'ਸੇਬ', 'shimla', 'sopore'], sub: 'Shimla · Sopore · Kinnaur' },
] as const;

export const AgrarianCommandPalette: React.FC<AgrarianCommandPaletteProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onOpenChange]);

  const commands = useMemo<AgrarianCommandItem[]>(() => {
    const navGroup =
      language === 'hi' ? 'मुख्य पृष्ठ (Workspaces)' : language === 'pa' ? 'ਮੁੱਖ ਪੰਨੇ' : 'Workspaces';
    const priceGroup =
      language === 'hi' ? 'ताज़ा मंडी भाव खोजें' : language === 'pa' ? 'ਮੰਡੀ ਭਾਅ ਖੋਜ' : 'Quick Commodity Lookup';
    const compareGroup =
      language === 'hi' ? 'मंडी भाव तुलना (Arbitrage)' : language === 'pa' ? 'ਮੰਡੀ ਤੁਲਨਾ' : 'Mandi Corridors';
    const prefGroup =
      language === 'hi' ? 'प्रदर्शन एवं प्राथमिकताएं' : language === 'pa' ? 'ਪਸੰਦਾਂ' : 'Appearance & Controls';

    const routes: AgrarianCommandItem[] = [
      {
        id: 'route:/',
        label: t('navHome'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'Gnani AI वॉइस मंडी सहायक एवं आज के प्रमुख भाव' : 'Gnani AI voice assistant & daily pulse',
          aliases: ['home', 'voice', 'gnani', 'ai', 'mic', 'आवाज़', 'होम'],
          action: 'navigate',
          target: '/',
          badge: 'VUI',
          iconKey: 'home',
        },
      },
      {
        id: 'route:/prices',
        label: t('navPrices'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'राज्य एवं ज़िले के अनुसार मंडी दर तालिका' : 'Sortable APMC ledger & offline snapshot',
          aliases: ['prices', 'mandi', 'rates', 'bhav', 'भाव', 'दाम', 'ਭਾਅ'],
          action: 'navigate',
          target: '/prices',
          badge: 'APMC',
          iconKey: 'prices',
        },
      },
      {
        id: 'route:/compare',
        label: t('navCompare'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'परिवहन भाड़े के साथ शुद्ध लाभ कैलकुलेटर' : 'Single-variety parity & freight corridor solver',
          aliases: ['compare', 'arbitrage', 'freight', 'net', 'तुलना', 'लाभ'],
          action: 'navigate',
          target: '/compare',
          badge: 'SPREAD',
          iconKey: 'compare',
        },
      },
      {
        id: 'route:/crops',
        label: language === 'hi' ? 'अखिल भारतीय फसल ज्ञानकोश' : language === 'pa' ? 'ਆਲ ਇੰਡੀਆ ਫ਼ਸਲ ਗਿਆਨਕੋਸ਼' : 'All-India Crop Encyclopedia',
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'भारत की 33+ प्रमुख फसलों की किस्में, बुवाई, सिंचाई व रोग सलाह' : 'Complete agronomic dossiers for 33+ Indian crops',
          aliases: ['crops', 'encyclopedia', 'farming', 'guide', 'फसलें', 'ज्ञानकोश', 'ਫ਼ਸਲਾਂ'],
          action: 'navigate',
          target: '/crops',
          badge: 'CROPS',
          iconKey: 'commodity',
        },
      },
      {
        id: 'route:/schemes',
        label: t('navSchemes'),
        auxiliaryData: {
          group: navGroup,
          subtitle: 'PM-KISAN · PMFBY · Soil Health Card · e-NAM · KCC',
          aliases: ['schemes', 'yojana', 'kisan', 'pmfby', 'subsidy', 'योजना', 'सब्सिडी'],
          action: 'navigate',
          target: '/schemes',
          badge: 'WELFARE',
          iconKey: 'schemes',
        },
      },
      {
        id: 'route:/complaints',
        label: t('navComplaints'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'तौल गड़बड़ी, नमी या भुगतान शिकायत दर्ज करें / ट्रैक करें' : 'Record local APMC grievance & X-Tracking-Token check',
          aliases: ['complaint', 'grievance', 'track', 'token', 'शिकायत', 'तौल'],
          action: 'navigate',
          target: '/complaints',
          badge: 'DESK',
          iconKey: 'complaints',
        },
      },
      {
        id: 'route:/more',
        label: t('navMore'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? 'ऑफ़लाइन कैशे, योजना निर्देशिका एवं सिस्टम जानकारी' : 'Service directory & IndexedDB offline inspection',
          aliases: ['more', 'offline', 'directory', 'cache', 'और'],
          action: 'navigate',
          target: '/more',
          iconKey: 'more',
        },
      },
      {
        id: 'route:/settings',
        label: t('navSettings'),
        auxiliaryData: {
          group: navGroup,
          subtitle: language === 'hi' ? '10 भारतीय भाषाएं, फ़ॉन्ट आकार एवं डार्क/लाइट थीम' : '10 Indic scripts, text scale & display contrast',
          aliases: ['settings', 'language', 'theme', 'hindi', 'punjabi', 'tamil', 'भाषा', 'सेटिंग्स'],
          action: 'navigate',
          target: '/settings',
          badge: '10 LANG',
          iconKey: 'settings',
        },
      },
    ];

    const commodityItems: AgrarianCommandItem[] = COMMODITY_SHORTCUTS.map((item) => ({
      id: `price:${item.code}`,
      label: `${item.name} · ${t('navPrices')}`,
      auxiliaryData: {
        group: priceGroup,
        subtitle: item.sub,
        aliases: [...item.aliases, 'price', 'rate'],
        action: 'navigate',
        target: `/prices?commodity=${encodeURIComponent(item.code)}`,
        badge: 'LIVE',
        iconKey: 'commodity',
      },
    }));

    const compareItems: AgrarianCommandItem[] = COMMODITY_SHORTCUTS.slice(0, 5).map((item) => ({
      id: `compare:${item.code}`,
      label: `${item.name} · ${t('navCompare')}`,
      auxiliaryData: {
        group: compareGroup,
        subtitle: language === 'hi' ? `${item.name} की सभी मंडियों में तुलना देखें` : `Inspect inter-mandi parity for ${item.name}`,
        aliases: [...item.aliases, 'compare', 'corridor'],
        action: 'navigate',
        target: `/compare?commodity=${encodeURIComponent(item.code)}`,
        badge: 'CORRIDOR',
        iconKey: 'compare',
      },
    }));

    const displayItems: AgrarianCommandItem[] = [
      {
        id: 'action:toggle-theme',
        label:
          theme === 'dark'
            ? language === 'hi'
              ? 'लाइट मोड (Mineral Daylight) चालू करें'
              : 'Switch to Mineral Daylight (Light Mode)'
            : language === 'hi'
            ? 'डार्क मोड (Obsidian) चालू करें'
            : 'Switch to Obsidian Dark Mode',
        auxiliaryData: {
          group: prefGroup,
          subtitle: language === 'hi' ? 'तुरंत रंग थीम बदलें' : 'Toggle high-contrast sunlight or night workspace',
          aliases: ['dark', 'light', 'theme', 'mode', 'थीम'],
          action: 'toggle-theme',
          badge: theme === 'dark' ? 'LIGHT' : 'DARK',
          iconKey: 'theme',
        },
      },
    ];

    const encyclopediaGroup =
      language === 'hi' ? 'भारतीय फसल ज्ञानकोश (33+ फसलें)' : language === 'pa' ? 'ਭਾਰਤੀ ਫ਼ਸਲ ਗਿਆਨਕੋਸ਼' : 'Indian Crop Encyclopedia';

    const cropEncyclopediaItems: AgrarianCommandItem[] = INDIAN_CROPS.map((crop) => ({
      id: `crop-dossier:${crop.id}`,
      label: language === 'hi' ? `${crop.nameHi} (${crop.nameEn})` : language === 'pa' ? `${crop.namePa} (${crop.nameEn})` : crop.nameEn,
      auxiliaryData: {
        group: encyclopediaGroup,
        subtitle: `${crop.category} · ${crop.season} · ${crop.majorStates.slice(0, 3).join(', ')}`,
        aliases: [
          crop.nameEn.toLowerCase(),
          crop.nameHi,
          crop.namePa,
          crop.category.toLowerCase(),
          crop.season.toLowerCase(),
          ...crop.majorStates.map((s) => s.toLowerCase()),
        ],
        action: 'navigate',
        target: `/crops?crop=${encodeURIComponent(crop.id)}`,
        badge: crop.season.toUpperCase(),
        iconKey: 'commodity',
      },
    }));

    return [...routes, ...commodityItems, ...compareItems, ...cropEncyclopediaItems, ...displayItems];
  }, [language, t, theme]);

  const searchSource = useMemo(
    () =>
      createStaticSource(commands, {
        keywords: (item) => item.auxiliaryData?.aliases ?? [],
      }),
    [commands]
  );

  const handleValueChange = (selectedId: string) => {
    const match = commands.find((item) => item.id === selectedId);
    if (!match?.auxiliaryData) return;

    if (match.auxiliaryData.action === 'toggle-theme') {
      toggleTheme();
      onOpenChange(false);
      return;
    }

    if (match.auxiliaryData.target) {
      navigate(match.auxiliaryData.target);
      onOpenChange(false);
    }
  };

  const renderGlyph = (key?: AgrarianCommandAux['iconKey']) => {
    switch (key) {
      case 'home':
        return <House weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />;
      case 'prices':
      case 'commodity':
        return <CurrencyInr weight="bold" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />;
      case 'compare':
        return <Scales weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />;
      case 'schemes':
        return <Bank weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />;
      case 'complaints':
        return <ClipboardText weight="duotone" className="w-4 h-4 text-saffron-text shrink-0" />;
      case 'more':
        return <SquaresFour weight="duotone" className="w-4 h-4 text-ink-muted shrink-0" />;
      case 'settings':
        return <SlidersHorizontal weight="duotone" className="w-4 h-4 text-ink-muted shrink-0" />;
      case 'theme':
        return theme === 'dark' ? (
          <Sun weight="duotone" className="w-4 h-4 text-saffron-text shrink-0" />
        ) : (
          <Moon weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
        );
      default:
        return <Compass weight="duotone" className="w-4 h-4 text-ink-muted shrink-0" />;
    }
  };

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={searchSource}
      onValueChange={handleValueChange}
      label={language === 'hi' ? 'मंडी साथी त्वरित खोज' : 'MandiSaathi Agrarian Command Spotlight'}
      emptySearchText={
        language === 'hi'
          ? 'कोई मिलान नहीं मिला · फसल, मंडी या सेवा का नाम टाइप करें।'
          : 'No matching mandi commodity, workspace, or service.'
      }
      renderItem={(item) => (
        <div className="flex items-center justify-between gap-3 w-full py-0.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-surface-subtle border border-line flex items-center justify-center shrink-0">
              {renderGlyph(item.auxiliaryData?.iconKey)}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink truncate">{item.label}</div>
              {item.auxiliaryData?.subtitle && (
                <div className="text-xs text-ink-muted truncate">{item.auxiliaryData.subtitle}</div>
              )}
            </div>
          </div>
          {item.auxiliaryData?.badge && (
            <Badge label={item.auxiliaryData.badge} variant="neutral" />
          )}
        </div>
      )}
    />
  );
};
