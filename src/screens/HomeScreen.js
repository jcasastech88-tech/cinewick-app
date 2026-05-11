import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ScrollView, TextInput, RefreshControl,
  Dimensions, Animated, Platform,
} from "react-native";
import { fetchPosts, searchContent } from "../api";
import { colors } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_W    = (width - 16 * 2 - 8 * 3) / 4;

const TABS = [
  { key: "all",          label: "Inicio",    icon: "🏠" },
  { key: "Películas",    label: "Películas", icon: "🎬" },
  { key: "series",       label: "Series",    icon: "📺" },
  { key: "Animación",    label: "Animación", icon: "🌀" },
  { key: "anime",        label: "Animes",    icon: "⚡" },
  { key: "documentales", label: "Docs",      icon: "🎥" },
];

const NAV_ITEMS = [
  { key: "home",   icon: "🏠", label: "Inicio"    },
  { key: "search", icon: "🔍", label: "Buscar"    },
  { key: "cats",   icon: "📂", label: "Categorías" },
  { key: "favs",   icon: "❤️",  label: "Favoritos" },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [posts,       setPosts]       = useState([]);
  const [featured,    setFeatured]    = useState([]);
  const [trending,    setTrending]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("all");
  const [search,      setSearch]      = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [page,        setPage]        = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [activeNav,   setActiveNav]   = useState("home");
  const [sliderIdx,   setSliderIdx]   = useState(0);

  const sliderRef  = useRef(null);
  const sliderTimer = useRef(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  // ── Carga de posts ──────────────────────────────────────────
  const load = useCallback(async (label, pageNum, append = false) => {
    try {
      const data = await fetchPosts(label, pageNum);
      if (append) {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...data.filter((p) => !ids.has(p.id))];
        });
      } else {
        // Separar destacados (etiqueta "destacado")
        const feat = data.filter((p) =>
          p.labels?.some((l) => l.toLowerCase() === "destacado")
        );
        const rest = data.filter((p) =>
          !p.labels?.some((l) => l.toLowerCase() === "destacado")
        );
        setFeatured(feat.length > 0 ? feat : data.slice(0, 5));
        setTrending(data.slice(0, 8));
        setPosts(rest.length > 0 ? rest : data.slice(5));
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
      setError(null);
    } catch (e) {
      setError("No se pudo cargar el contenido.");
    }
  }, [fadeAnim]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fadeAnim.setValue(0);
    load(activeTab, 1).finally(() => setLoading(false));
  }, [activeTab]);

  // ── Slider automático ───────────────────────────────────────
  useEffect(() => {
    if (featured.length < 2) return;
    sliderTimer.current = setInterval(() => {
      setSliderIdx((prev) => {
        const next = (prev + 1) % featured.length;
        sliderRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(sliderTimer.current);
  }, [featured]);

  const pauseSlider = () => clearInterval(sliderTimer.current);

  // ── Búsqueda ────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchContent(search);
        setPosts(results);
        setFeatured([]);
        setTrending([]);
      } catch {}
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    setLoading(true);
    load(activeTab, 1).finally(() => setLoading(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await load(activeTab, 1);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || search) return;
    setLoadingMore(true);
    const next = page + 1;
    await load(activeTab, next, true);
    setPage(next);
    setLoadingMore(false);
  };

  const goDetail = (post) => navigation.navigate("Detail", { post });

  // ── Render ──────────────────────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab.key}
            style={[s.tab, activeTab === tab.key && !search && s.tabActive]}
            onPress={() => { clearSearch(); setActiveTab(tab.key); }}>
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tab.key && !search && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Slider de destacados */}
      {!search && featured.length > 0 && (
        <View style={s.sliderWrap}>
          <ScrollView
            ref={sliderRef}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={pauseSlider}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setSliderIdx(idx);
            }}
          >
            {featured.map((post, i) => (
              <TouchableOpacity key={post.id} activeOpacity={0.92}
                style={[s.slide, { width }]} onPress={() => goDetail(post)}>
                {post.backdrop || post.image
                  ? <Image source={{ uri: post.backdrop || post.image }} style={s.slideImg} />
                  : <View style={[s.slideImg, { backgroundColor: colors.bgCard2, alignItems:"center", justifyContent:"center" }]}>
                      <Text style={{ fontSize: 60 }}>🎬</Text>
                    </View>
                }
                <View style={s.slideOverlay} />
                <View style={s.slideContent}>
                  <View style={s.slideBadge}>
                    <Text style={s.slideBadgeText}>DESTACADO</Text>
                  </View>
                  <Text style={s.slideTitle} numberOfLines={2}>{post.title}</Text>
                  <View style={s.slideChips}>
                    {post.year   && <Chip text={`📅 ${post.year}`} />}
                    {post.rating && <Chip text={`⭐ ${post.rating}`} gold />}
                    {post.labels?.filter(l => l.toLowerCase() !== "destacado").slice(0,1).map(l => <Chip key={l} text={l} primary />)}
                  </View>
                  <TouchableOpacity style={s.slideBtn} onPress={() => goDetail(post)}>
                    <Text style={s.slideBtnText}>▶ Ver ahora</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dots indicadores */}
          <View style={s.dots}>
            {featured.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => {
                sliderRef.current?.scrollTo({ x: i * width, animated: true });
                setSliderIdx(i);
              }}>
                <View style={[s.dot, i === sliderIdx && s.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tendencias */}
      {!search && trending.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔥 Tendencias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 10 }}>
            {trending.map((post) => (
              <TouchableOpacity key={post.id} style={s.trendCard} onPress={() => goDetail(post)}>
                {post.image
                  ? <Image source={{ uri: post.image }} style={s.trendImg} />
                  : <View style={[s.trendImg, { alignItems:"center", justifyContent:"center" }]}><Text style={{ fontSize: 30 }}>🎬</Text></View>
                }
                {post.rating && (
                  <View style={s.trendRating}>
                    <Text style={s.trendRatingText}>⭐ {post.rating}</Text>
                  </View>
                )}
                <Text style={s.trendTitle} numberOfLines={2}>{post.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Título sección grilla */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {search ? `🔍 "${search}"` : "📽 Todos los títulos"}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () =>
    loadingMore
      ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
      : null;

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={[s.searchBar, searchFocus && s.searchBarFocus]}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Buscar película, serie..."
            placeholderTextColor={colors.dim}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={s.clearBtn}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && posts.length === 0 ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingText}>Cargando CineWick...</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
            <Text style={s.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={posts}
            keyExtractor={(item, i) => `${item.id}-${i}`}
            numColumns={4}
            columnWrapperStyle={s.row}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            renderItem={({ item }) => (
              <MovieCard post={item} onPress={() => goDetail(item)} />
            )}
            onEndReached={!search ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        </Animated.View>
      )}

      {/* Bottom nav */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom }]}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity key={item.key} style={s.navItem}
            onPress={() => setActiveNav(item.key)}>
            <Text style={[s.navIcon, activeNav === item.key && s.navIconActive]}>
              {item.icon}
            </Text>
            <Text style={[s.navLabel, activeNav === item.key && s.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function MovieCard({ post, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: anim }], opacity: anim, width: CARD_W }}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
        <View style={s.cardImgWrap}>
          {post.image
            ? <Image source={{ uri: post.image }} style={s.cardImg} />
            : <View style={[s.cardImg, s.noImg]}><Text style={{ fontSize: 24 }}>🎬</Text></View>
          }
          {post.rating && (
            <View style={s.ratingBadge}>
              <Text style={s.ratingText}>★{post.rating}</Text>
            </View>
          )}
          {post.year && (
            <View style={s.yearBadge}>
              <Text style={s.yearText}>{post.year}</Text>
            </View>
          )}
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{post.title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Chip({ text, gold, primary }) {
  return (
    <View style={[s.chip, gold && s.chipGold, primary && s.chipPrimary]}>
      <Text style={[s.chipText, gold && s.chipTextGold, primary && s.chipTextPrimary]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText:  { color: colors.muted, fontSize: 13, marginTop: 8 },
  errorText:    { color: colors.muted, fontSize: 14, textAlign: "center", marginHorizontal: 32 },
  retryBtn:     { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  retryText:    { color: "#fff", fontWeight: "700" },

  // Search
  searchWrap:   { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar:    { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderRadius: 24, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border2 },
  searchBarFocus:{ borderColor: colors.primary },
  searchIcon:   { fontSize: 14, marginRight: 8 },
  searchInput:  { flex: 1, color: colors.white, fontSize: 14, paddingVertical: 11 },
  clearBtn:     { padding: 4 },

  // Tabs
  tabsScroll:   { marginBottom: 4 },
  tabsContent:  { paddingHorizontal: 16, paddingVertical: 6, gap: 6 },
  tab:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border2 },
  tabActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  tabIcon:      { fontSize: 13 },
  tabLabel:     { fontSize: 11, color: colors.muted },
  tabLabelActive:{ color: "#fff", fontWeight: "700" },

  // Slider
  sliderWrap:   { marginBottom: 4 },
  slide:        { height: 220, position: "relative" },
  slideImg:     { width: "100%", height: "100%", resizeMode: "cover" },
  slideOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 180, backgroundColor: "rgba(8,8,15,0.85)" },
  slideContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 20 },
  slideBadge:   { alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  slideBadgeText:{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  slideTitle:   { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 8, lineHeight: 21 },
  slideChips:   { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  slideBtn:     { alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  slideBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Dots
  dots:         { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border2 },
  dotActive:    { width: 20, backgroundColor: colors.primary },

  // Chips
  chip:         { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  chipGold:     { backgroundColor: "rgba(244,196,48,0.15)" },
  chipPrimary:  { backgroundColor: colors.primaryDim, borderWidth: 0.5, borderColor: colors.primaryBorder },
  chipText:     { color: "#ccc", fontSize: 10 },
  chipTextGold: { color: colors.gold, fontWeight: "700" },
  chipTextPrimary: { color: colors.primary },

  // Sections
  section:      { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: "800", marginBottom: 10 },

  // Trending
  trendCard:    { width: 90 },
  trendImg:     { width: 90, height: 130, borderRadius: 10, backgroundColor: colors.bgCard2, marginBottom: 6 },
  trendRating:  { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  trendRatingText: { color: colors.gold, fontSize: 9, fontWeight: "700" },
  trendTitle:   { color: colors.muted, fontSize: 10, lineHeight: 13 },

  // Grid
  row:          { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  card:         { width: CARD_W, backgroundColor: colors.bgCard, borderRadius: 10, overflow: "hidden", borderWidth: 0.5, borderColor: colors.border },
  cardImgWrap:  { aspectRatio: 2/3, backgroundColor: colors.bgCard2, position: "relative" },
  cardImg:      { width: "100%", height: "100%", resizeMode: "cover" },
  noImg:        { alignItems: "center", justifyContent: "center" },
  ratingBadge:  { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.8)", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5 },
  ratingText:   { color: colors.gold, fontSize: 8, fontWeight: "800" },
  yearBadge:    { position: "absolute", top: 4, left: 4, backgroundColor: colors.primary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5 },
  yearText:     { color: "#fff", fontSize: 8, fontWeight: "700" },
  cardBody:     { padding: 6 },
  cardTitle:    { color: colors.white, fontSize: 9, fontWeight: "600", lineHeight: 12 },

  // Bottom nav
  bottomNav:    { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: colors.bgCard3, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10 },
  navItem:      { flex: 1, alignItems: "center", gap: 3 },
  navIcon:      { fontSize: 20 },
  navIconActive:{ },
  navLabel:     { fontSize: 9, color: colors.dim },
  navLabelActive:{ color: colors.primary, fontWeight: "700" },
});
