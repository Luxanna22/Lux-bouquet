import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUp,
  Crown,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Check,
  Info,
} from 'lucide-react';
import {
  CanvasEnvironment,
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  FlowerType,
  PHOTO_FRAME_CATALOG,
  PhotoFrameStyle,
  RIBBON_STYLE_CATALOG,
  RibbonStyle,
  typeWrapStyle,
  VOICE_KEEPSAKE_CATALOG,
  VoiceKeepsakeStyle,
  WRAPPER_CATALOG,
} from '../types/bouquet';
import {
  EMPTY_STUDIO_CATALOG_OVERRIDES,
  STUDIO_CATALOG_CATEGORIES,
  StudioCatalogCategory,
  StudioCatalogOverrides,
  applyStudioCatalogOrganization,
  buildEffectivePremiumAssetConfig,
  sanitizeStudioCatalogOverrides,
  setLiveStudioCatalogOverrides,
} from '../lib/studioCatalogConfig';
import {
  PREMIUM_ASSET_CONFIG,
  isEnvironmentPremium,
  isFlowerPremium,
  isPhotoStylePremium,
  isRibbonPremium,
  isVoiceStylePremium,
  isWrapPremium,
} from '../lib/monetization';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import {
  MiniEnvironmentSVG,
  MiniPhotoFrameSVG,
  MiniRibbonBowSVG,
  MiniVoiceKeepsakeSVG,
  MiniWrapConeSVG,
} from './MiniThumbnails';

interface OwnerStudioOrganizerSectionProps {
  adminSessionToken: string | null;
  deviceTokenHash: string;
  isDarkMode: boolean;
  studioCatalogConfig: StudioCatalogOverrides;
  onSyncStudioCatalogConfig: (
    nextConfig: StudioCatalogOverrides,
    nextAnalytics?: unknown
  ) => void;
  onToast: (msg: string) => void;
}

interface OrganizerRowItem {
  id: string;
  label: string;
  subtitle: string;
  defaultPremium: boolean;
  renderThumb: () => React.ReactNode;
}

type StatusFilter = 'all' | 'visible' | 'hidden' | 'couture' | 'free';

function buildCategoryCatalogItems(category: StudioCatalogCategory): OrganizerRowItem[] {
  switch (category) {
    case 'flowers':
      return FLOWER_CATALOG.filter(
        (f) => !f.isFoliage && !f.isFiller && !f.isOther && !f.isSeasonal
      ).map((f) => ({
        id: f.type,
        label: f.shortName || f.name,
        subtitle: f.subtitle,
        defaultPremium: isFlowerPremium(f.type, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <svg viewBox="-64 -68 128 128" className="w-9 h-9 overflow-visible">
            <FlowerRenderer
              type={f.type}
              petalColor={f.defaultPetalColor}
              centerColor={f.defaultCenterColor}
              hideStem
            />
          </svg>
        ),
      }));
    case 'fillers':
      return FLOWER_CATALOG.filter(
        (f) => Boolean(f.isFoliage || f.isFiller) && !f.isOther && !f.isSeasonal
      ).map((f) => ({
        id: f.type,
        label: f.shortName || f.name,
        subtitle: f.subtitle,
        defaultPremium: isFlowerPremium(f.type, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <svg viewBox="-64 -68 128 128" className="w-9 h-9 overflow-visible">
            <FlowerRenderer
              type={f.type}
              petalColor={f.defaultPetalColor}
              centerColor={f.defaultCenterColor}
              hideStem={false}
              stemLength={0.45}
            />
          </svg>
        ),
      }));
    case 'others':
      return FLOWER_CATALOG.filter((f) => Boolean(f.isOther)).map((f) => ({
        id: f.type,
        label: f.shortName || f.name,
        subtitle: f.subtitle,
        defaultPremium: isFlowerPremium(f.type, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <svg viewBox="-64 -68 128 128" className="w-9 h-9 overflow-visible">
            <FlowerRenderer
              type={f.type}
              petalColor={f.defaultPetalColor}
              centerColor={f.defaultCenterColor}
              hideStem
            />
          </svg>
        ),
      }));
    case 'seasonal':
      return FLOWER_CATALOG.filter((f) => Boolean(f.isSeasonal)).map((f) => ({
        id: f.type,
        label: f.shortName || f.name,
        subtitle: f.subtitle,
        defaultPremium: isFlowerPremium(f.type, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <svg viewBox="-64 -68 128 128" className="w-9 h-9 overflow-visible">
            <FlowerRenderer
              type={f.type}
              petalColor={f.defaultPetalColor}
              centerColor={f.defaultCenterColor}
              hideStem
            />
          </svg>
        ),
      }));
    case 'wrappers':
      return WRAPPER_CATALOG.map((w) => ({
        id: w.id,
        label: w.label,
        subtitle: `Default paper ${w.defaultHex}`,
        defaultPremium: isWrapPremium(w.id, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <MiniWrapConeSVG
            styleType={w.id as typeWrapStyle}
            color={w.defaultHex}
            ribbon={w.defaultRibbon}
          />
        ),
      }));
    case 'ribbons':
      return RIBBON_STYLE_CATALOG.map((r) => ({
        id: r.id,
        label: r.label,
        subtitle: r.subtitle,
        defaultPremium: isRibbonPremium(r.id, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <MiniRibbonBowSVG hex={r.defaultHex} styleType={r.id as RibbonStyle} />
        ),
      }));
    case 'environments':
      return ENVIRONMENT_CATALOG.map((e) => ({
        id: e.id,
        label: e.label,
        subtitle: e.subtitle,
        defaultPremium: isEnvironmentPremium(e.id as CanvasEnvironment, PREMIUM_ASSET_CONFIG),
        renderThumb: () => <MiniEnvironmentSVG env={e.id as CanvasEnvironment} />,
      }));
    case 'voices':
      return VOICE_KEEPSAKE_CATALOG.map((v) => ({
        id: v.id,
        label: v.label,
        subtitle: v.subtitle,
        defaultPremium: isVoiceStylePremium(v.id as VoiceKeepsakeStyle, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <MiniVoiceKeepsakeSVG
            styleType={v.id as VoiceKeepsakeStyle}
            primaryColor={v.defaultPrimary}
            accentColor={v.defaultAccent}
          />
        ),
      }));
    case 'photos':
      return PHOTO_FRAME_CATALOG.map((p) => ({
        id: p.id,
        label: p.label,
        subtitle: p.subtitle,
        defaultPremium: isPhotoStylePremium(p.id as PhotoFrameStyle, PREMIUM_ASSET_CONFIG),
        renderThumb: () => (
          <MiniPhotoFrameSVG
            styleType={p.id as PhotoFrameStyle}
            frameColor={p.defaultFrameColor}
            accentColor={p.defaultAccentColor}
          />
        ),
      }));
    default:
      return [];
  }
}

function stableSerializeOverrides(cfg: StudioCatalogOverrides): string {
  const clean = sanitizeStudioCatalogOverrides(cfg);
  return JSON.stringify({
    order: clean.order,
    hidden: clean.hidden,
    premiumOverrides: clean.premiumOverrides,
  });
}

export const OwnerStudioOrganizerSection: React.FC<OwnerStudioOrganizerSectionProps> = ({
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
  studioCatalogConfig,
  onSyncStudioCatalogConfig,
  onToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<StudioCatalogCategory>('flowers');
  const [draftConfig, setDraftConfig] = useState<StudioCatalogOverrides>(() =>
    sanitizeStudioCatalogOverrides(studioCatalogConfig)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Sync draft when server config changes externally (e.g., manual Sync button)
  const serverFingerprint = useMemo(
    () => stableSerializeOverrides(studioCatalogConfig),
    [studioCatalogConfig]
  );
  const draftFingerprint = useMemo(
    () => stableSerializeOverrides(draftConfig),
    [draftConfig]
  );
  const hasUnsavedChanges = serverFingerprint !== draftFingerprint;

  useEffect(() => {
    setDraftConfig(sanitizeStudioCatalogOverrides(studioCatalogConfig));
  }, [serverFingerprint]);

  const effectiveDraftPremiumConfig = useMemo(
    () => buildEffectivePremiumAssetConfig(PREMIUM_ASSET_CONFIG, draftConfig),
    [draftConfig]
  );

  const isItemPremiumInDraft = (cat: StudioCatalogCategory, id: string): boolean => {
    switch (cat) {
      case 'flowers':
      case 'fillers':
      case 'others':
      case 'seasonal':
        return isFlowerPremium(id as FlowerType, effectiveDraftPremiumConfig);
      case 'wrappers':
        return isWrapPremium(id as typeWrapStyle, effectiveDraftPremiumConfig);
      case 'ribbons':
        return isRibbonPremium(id as RibbonStyle, effectiveDraftPremiumConfig);
      case 'environments':
        return isEnvironmentPremium(id as CanvasEnvironment, effectiveDraftPremiumConfig);
      case 'voices':
        return isVoiceStylePremium(id as VoiceKeepsakeStyle, effectiveDraftPremiumConfig);
      case 'photos':
        return isPhotoStylePremium(id as PhotoFrameStyle, effectiveDraftPremiumConfig);
      default:
        return false;
    }
  };

  const baseCategoryItems = useMemo(
    () => buildCategoryCatalogItems(activeCategory),
    [activeCategory]
  );

  const orderedCategoryItems = useMemo(() => {
    const hasCustomOrder = Boolean(draftConfig.order?.[activeCategory]?.length);
    const baseSorted = hasCustomOrder
      ? baseCategoryItems
      : activeCategory === 'flowers' ||
        activeCategory === 'fillers' ||
        activeCategory === 'others' ||
        activeCategory === 'seasonal'
      ? [...baseCategoryItems].sort(
          (a, b) => Number(a.defaultPremium) - Number(b.defaultPremium)
        )
      : baseCategoryItems;

    return applyStudioCatalogOrganization(
      baseSorted,
      (item) => item.id,
      activeCategory,
      draftConfig,
      { includeHidden: true }
    );
  }, [baseCategoryItems, activeCategory, draftConfig]);

  const hiddenSetForCategory = useMemo(
    () => new Set(draftConfig.hidden?.[activeCategory] || []),
    [draftConfig, activeCategory]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedCategoryItems.filter((item) => {
      const hidden = hiddenSetForCategory.has(item.id);
      const prem = isItemPremiumInDraft(activeCategory, item.id);
      if (statusFilter === 'visible' && hidden) return false;
      if (statusFilter === 'hidden' && !hidden) return false;
      if (statusFilter === 'couture' && !prem) return false;
      if (statusFilter === 'free' && prem) return false;
      if (q) {
        return (
          item.label.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orderedCategoryItems, hiddenSetForCategory, statusFilter, searchQuery, activeCategory, effectiveDraftPremiumConfig]);

  const categoryCounts = useMemo(() => {
    const map: Record<StudioCatalogCategory, { total: number; hidden: number; couture: number; customized: boolean }> =
      {} as Record<StudioCatalogCategory, { total: number; hidden: number; couture: number; customized: boolean }>;
    for (const catMeta of STUDIO_CATALOG_CATEGORIES) {
      const cat = catMeta.id;
      const items = buildCategoryCatalogItems(cat);
      const hiddenArr = draftConfig.hidden?.[cat] || [];
      const premCount = items.filter((it) => isItemPremiumInDraft(cat, it.id)).length;
      const hasCustom =
        Boolean(draftConfig.order?.[cat]?.length) ||
        hiddenArr.length > 0 ||
        Boolean(draftConfig.premiumOverrides?.[cat] && Object.keys(draftConfig.premiumOverrides[cat]!).length > 0);
      map[cat] = {
        total: items.length,
        hidden: hiddenArr.length,
        couture: premCount,
        customized: hasCustom,
      };
    }
    return map;
  }, [draftConfig, effectiveDraftPremiumConfig]);

  const canReorderDirectly = searchQuery.trim() === '' && statusFilter === 'all';

  const commitOrderList = (nextIds: string[]) => {
    setDraftConfig((prev) => ({
      ...prev,
      order: {
        ...prev.order,
        [activeCategory]: nextIds,
      },
    }));
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down' | 'top') => {
    const ids = orderedCategoryItems.map((it) => it.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    if (direction === 'up' && idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      commitOrderList(ids);
    } else if (direction === 'down' && idx < ids.length - 1) {
      [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
      commitOrderList(ids);
    } else if (direction === 'top' && idx > 0) {
      const [picked] = ids.splice(idx, 1);
      ids.unshift(picked);
      commitOrderList(ids);
    }
  };

  const handleSortFreeFirst = () => {
    const sortedIds = [...orderedCategoryItems]
      .sort(
        (a, b) =>
          Number(isItemPremiumInDraft(activeCategory, a.id)) -
          Number(isItemPremiumInDraft(activeCategory, b.id))
      )
      .map((it) => it.id);
    commitOrderList(sortedIds);
  };

  const handleTogglePremium = (item: OrganizerRowItem) => {
    const currentlyPrem = isItemPremiumInDraft(activeCategory, item.id);
    const nextPrem = !currentlyPrem;
    setDraftConfig((prev) => {
      const nextCatMap = { ...(prev.premiumOverrides?.[activeCategory] || {}) };
      if (nextPrem === item.defaultPremium) {
        delete nextCatMap[item.id];
      } else {
        nextCatMap[item.id] = nextPrem;
      }
      const nextPremiumOverrides = { ...prev.premiumOverrides };
      if (Object.keys(nextCatMap).length > 0) {
        nextPremiumOverrides[activeCategory] = nextCatMap;
      } else {
        delete nextPremiumOverrides[activeCategory];
      }
      return {
        ...prev,
        premiumOverrides: nextPremiumOverrides,
      };
    });
  };

  const handleToggleStudioVisibility = (id: string) => {
    setDraftConfig((prev) => {
      const currentHidden = new Set(prev.hidden?.[activeCategory] || []);
      if (currentHidden.has(id)) {
        currentHidden.delete(id);
      } else {
        currentHidden.add(id);
      }
      const nextHidden = { ...prev.hidden };
      if (currentHidden.size > 0) {
        nextHidden[activeCategory] = Array.from(currentHidden);
      } else {
        delete nextHidden[activeCategory];
      }
      return {
        ...prev,
        hidden: nextHidden,
      };
    });
  };

  const handleResetCategoryOrder = () => {
    setDraftConfig((prev) => {
      const nextOrder = { ...prev.order };
      delete nextOrder[activeCategory];
      return { ...prev, order: nextOrder };
    });
  };

  const handleResetCategoryAll = () => {
    setDraftConfig((prev) => {
      const nextOrder = { ...prev.order };
      const nextHidden = { ...prev.hidden };
      const nextPrem = { ...prev.premiumOverrides };
      delete nextOrder[activeCategory];
      delete nextHidden[activeCategory];
      delete nextPrem[activeCategory];
      return {
        ...prev,
        order: nextOrder,
        hidden: nextHidden,
        premiumOverrides: nextPrem,
      };
    });
  };

  const handleDiscard = () => {
    setDraftConfig(sanitizeStudioCatalogOverrides(studioCatalogConfig));
    onToast('Discarded unsaved Studio Organizer edits.');
  };

  const handleSave = async () => {
    if (!adminSessionToken) {
      onToast('Owner session expired. Please re-enter PIN.');
      return;
    }
    setIsSaving(true);
    try {
      const cleanPayload = sanitizeStudioCatalogOverrides(draftConfig);
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_studio_catalog_config',
          adminSessionToken,
          deviceTokenHash,
          studioCatalogConfig: cleanPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onToast(data.message || 'Could not save Studio Organizer settings.');
        return;
      }
      const persisted = sanitizeStudioCatalogOverrides(
        data.studioCatalogConfig || EMPTY_STUDIO_CATALOG_OVERRIDES
      );
      setLiveStudioCatalogOverrides(persisted);
      setDraftConfig(persisted);
      onSyncStudioCatalogConfig(persisted, data.analytics);
      onToast('Studio Organizer saved & live in Studio.');
    } catch {
      onToast('Network error saving Studio Organizer settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeCategoryMeta =
    STUDIO_CATALOG_CATEGORIES.find((c) => c.id === activeCategory) || STUDIO_CATALOG_CATEGORIES[0];

  const cardSurface = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/85 border-dashed'
    : 'bg-[#FFFDF9] border-[#DECBB9] border-dashed';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const subtleBg = isDarkMode ? 'bg-[#2B2321]/70' : 'bg-[#FAF4EE]/85';

  return (
    <div className="space-y-5 animate-[fadeIn_180ms_ease-out]" data-testid="owner-studio-organizer">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-2xl sm:text-3xl font-medium"
          >
            Studio Organizer
          </h1>
          <p className="text-xs opacity-65 mt-0.5">
            Reorder flowers &amp; assets, toggle Couture vs. Free tier, or hide items from the Studio picker.
          </p>
        </div>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${hairlineBorder} hover:bg-current/5`}
            >
              Discard
            </button>
            <button
              type="button"
              data-testid="studio-organizer-save-top-btn"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-opacity disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18]'
                  : 'bg-[#6E4434] text-[#FFFDF9]'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Studio-Only Visibility Guarantee Banner */}
      <div
        className={`rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 text-xs ${cardSurface}`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#B4846C]" />
        <p className="opacity-80 leading-relaxed">
          <span className="font-semibold">Studio-only visibility:</span> Hiding an asset removes it from the Studio creator picker only. Existing shared bouquet links, your Saved Vault, and the Shared Creations gallery continue rendering hidden blooms, wraps, and scenes intact.
        </p>
      </div>

      {/* 9-Category Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {STUDIO_CATALOG_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          const stats = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              data-testid={`organizer-cat-${cat.id}`}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                active
                  ? isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C]'
                    : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434]'
                  : `${cardSurface} opacity-80 hover:opacity-100`
              }`}
            >
              <span>{cat.shortLabel}</span>
              <span className="text-[10.5px] font-mono tabular-nums opacity-75">
                {stats?.total ?? 0}
              </span>
              {stats?.customized && (
                <span
                  title="Customized"
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-current' : 'bg-[#B4846C]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Category Workspace Card */}
      <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${cardSurface}`}>
        {/* Category Title + Stats + Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-dashed border-current/15">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xl font-medium"
              >
                {activeCategoryMeta.label}
              </h2>
              <span className="text-[11px] font-mono tabular-nums opacity-60">
                {categoryCounts[activeCategory]?.total ?? 0} total ·{' '}
                {categoryCounts[activeCategory]?.couture ?? 0} Couture ·{' '}
                {categoryCounts[activeCategory]?.hidden ?? 0} hidden
              </span>
            </div>
            <p className="text-xs opacity-60 mt-0.5">{activeCategoryMeta.description}</p>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSortFreeFirst}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${hairlineBorder} hover:bg-current/5`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Free First</span>
            </button>
            <button
              type="button"
              onClick={handleResetCategoryOrder}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${hairlineBorder} hover:bg-current/5`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Order</span>
            </button>
            <button
              type="button"
              onClick={handleResetCategoryAll}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${hairlineBorder} hover:bg-current/5 opacity-80 hover:opacity-100`}
            >
              Reset Category
            </button>
          </div>
        </div>

        {/* Search + Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeCategoryMeta.label.toLowerCase()}...`}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#5E4E49] focus:border-[#E6B89C]'
                  : 'bg-[#FAF4EE] border-[#DECBB9] focus:border-[#6E4434]'
              }`}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'visible', label: 'In Studio' },
                { id: 'hidden', label: 'Hidden' },
                { id: 'couture', label: 'Couture' },
                { id: 'free', label: 'Free' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  statusFilter === f.id
                    ? isDarkMode
                      ? 'bg-[#E6B89C]/20 text-[#E6B89C] border border-[#E6B89C]/45'
                      : 'bg-[#6E4434]/12 text-[#6E4434] border border-[#6E4434]/35'
                    : `border border-transparent opacity-65 hover:opacity-100`
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!canReorderDirectly && (
          <p className="text-[11px] opacity-60 italic">
            Clear search &amp; set filter to “All” to adjust display order.
          </p>
        )}

        {/* Item Rows */}
        {filteredItems.length === 0 ? (
          <div
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="py-10 text-center italic text-base opacity-55"
          >
            No items match this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const rankIdx = orderedCategoryItems.findIndex((o) => o.id === item.id);
              const isHidden = hiddenSetForCategory.has(item.id);
              const isPremium = isItemPremiumInDraft(activeCategory, item.id);
              const tierCustomized = isPremium !== item.defaultPremium;
              const isFirst = rankIdx <= 0;
              const isLast = rankIdx >= orderedCategoryItems.length - 1;

              return (
                <div
                  key={item.id}
                  data-testid={`organizer-item-${activeCategory}-${item.id}`}
                  className={`rounded-xl border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-opacity ${hairlineBorder} ${
                    isHidden ? `${subtleBg} opacity-65 border-dashed` : subtleBg
                  }`}
                >
                  {/* Left: Rank + Live SVG Thumb + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-[11px] font-mono tabular-nums opacity-50 shrink-0">
                      #{rankIdx + 1}
                    </span>
                    <div
                      className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 overflow-hidden ${
                        isDarkMode
                          ? 'bg-[#352C29] border-[#5E4E49]/70'
                          : 'bg-white border-[#DECBB9]'
                      }`}
                    >
                      {item.renderThumb()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                        <span className="text-[10px] font-mono opacity-45">{item.id}</span>
                        {tierCustomized && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isDarkMode
                                ? 'bg-[#E6B89C]/20 text-[#E6B89C]'
                                : 'bg-[#6E4434]/12 text-[#6E4434]'
                            }`}
                          >
                            Edited
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-60 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Right: Reorder + Premium Toggle + Studio Visibility Toggle */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-current/8">
                    {/* Reorder Cluster */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Move to Top"
                        aria-label={`Move ${item.label} to top`}
                        disabled={!canReorderDirectly || isFirst}
                        onClick={() => handleMoveItem(item.id, 'top')}
                        className={`p-1.5 rounded-lg border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${hairlineBorder} hover:bg-current/5`}
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move Up"
                        aria-label={`Move ${item.label} up`}
                        disabled={!canReorderDirectly || isFirst}
                        onClick={() => handleMoveItem(item.id, 'up')}
                        className={`p-1.5 rounded-lg border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${hairlineBorder} hover:bg-current/5`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        aria-label={`Move ${item.label} down`}
                        disabled={!canReorderDirectly || isLast}
                        onClick={() => handleMoveItem(item.id, 'down')}
                        className={`p-1.5 rounded-lg border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${hairlineBorder} hover:bg-current/5`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Tier Toggle: Couture vs Free */}
                      <button
                        type="button"
                        data-testid={`organizer-tier-${activeCategory}-${item.id}`}
                        onClick={() => handleTogglePremium(item)}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-colors min-w-[72px] sm:min-w-[82px] justify-center whitespace-nowrap ${
                          isPremium
                            ? isDarkMode
                              ? 'bg-amber-400/15 border-amber-400/45 text-amber-200 hover:bg-amber-400/25'
                              : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                            : isDarkMode
                              ? 'bg-emerald-400/10 border-emerald-400/35 text-emerald-200 hover:bg-emerald-400/20'
                              : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                        }`}
                      >
                        {isPremium ? (
                          <>
                            <Crown className="w-3 h-3 shrink-0" />
                            <span>Couture</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 shrink-0" />
                            <span>Free</span>
                          </>
                        )}
                      </button>

                      {/* Studio Visibility Toggle */}
                      <button
                        type="button"
                        data-testid={`organizer-vis-${activeCategory}-${item.id}`}
                        onClick={() => handleToggleStudioVisibility(item.id)}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-colors min-w-[80px] sm:min-w-[90px] justify-center whitespace-nowrap ${
                          isHidden
                            ? isDarkMode
                              ? 'bg-rose-500/15 border-rose-400/40 text-rose-200 hover:bg-rose-500/25'
                              : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                            : `${hairlineBorder} opacity-85 hover:opacity-100 hover:bg-current/5`
                        }`}
                      >
                        {isHidden ? (
                          <>
                            <EyeOff className="w-3 h-3 shrink-0" />
                            <span>Hidden</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 shrink-0" />
                            <span>In Studio</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Action Bar */}
      {hasUnsavedChanges && (
        <div
          className={`sticky bottom-2 z-10 rounded-xl border px-4 py-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 backdrop-blur-md ${
            isDarkMode
              ? 'bg-[#352C29]/95 border-[#E6B89C]/45'
              : 'bg-[#FFFDF9]/95 border-[#6E4434]/35'
          }`}
        >
          <div className="text-xs">
            <span className="font-semibold">Unsaved Studio Organizer changes.</span>{' '}
            <span className="opacity-70">
              Updates apply live to Studio pickers &amp; Couture checks on save.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${hairlineBorder} hover:bg-current/5`}
            >
              Discard
            </button>
            <button
              type="button"
              data-testid="studio-organizer-save-btn"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18]'
                  : 'bg-[#6E4434] text-[#FFFDF9]'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save to Studio'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
