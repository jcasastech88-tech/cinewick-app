import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import { fetchPosts, searchContent } from "../api";
import { colors } from "../theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 36) / 4;

const TABS = [
  { key: "all", label: "Inicio", icon: "🏠" },
  { key: "Películas", label: "Películas", icon: "🎬" },
  { key: "Series", label: "Series", icon: "📺" },
  { key: "Animación", label: "Animación", icon: "🌀" },
  { key: "anime", label: "Animes", icon: "⚡" },
  { key: "documentales", label: "Docs", icon: "🎥" },
];

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

const load = useCallback(async (label, pageNum, append = false) => {
  try {
    const data = await fetchPosts(label, pageNum);
    if (append) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
    } else {
      setPosts(data);
    }
    setError(null);
  } catch (e) {
    setError("Error: " + (e?.message || JSON.stringify(e)));
  }
}, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    load(activeTab, 1).finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchContent(search);
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

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

  const filtered = search ? searchResults : posts;

  const goToDetail = (post) => navigation.navigate("Detail", { post });

  const renderHeader = () => (
    <View>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => {
              setSearch("");
              setActiveTab(tab.key);
            }}
          >
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured */}
      {!search && filtered.length > 0 && (
        <FeaturedCard post={filtered[0]} onPress={() => goToDetail(filtered[0])} />
      )}
    </View>
  );

  const renderFooter = () =>
    loadingMore ? (
      <ActivityIndicator color={colors.red} style={{ margin: 16 }} />
    ) : null;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.red} size="large" />
        <Text style={s.loadingText}>Cargando CineWick...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
          <Text style={s.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gridData = search ? filtered : filtered.slice(1);

  return (
    <View style={s.container}>
      {/* Search bar */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar película, serie..."
          placeholderTextColor={colors.dim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={s.clearBtn}>
            <Text style={{ color: colors.white, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={4}
	keyExtractor={(item, index) => `${item.id}-${index}`}
        columnWrapperStyle={s.row}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        renderItem={({ item }) => (
          <MovieCard post={item} onPress={() => goToDetail(item)} />
        )}
        onEndReached={!search ? loadMore : undefined}
	onEndReached={!search && !loadingMore ? loadMore : undefined}
	onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

function FeaturedCard({ post, onPress }) {
  return (
    <TouchableOpacity style={s.featured} onPress={onPress} activeOpacity={0.9}>
      {post.image ? (
        <Image source={{ uri: post.image }} style={s.featuredImg} />
      ) : (
        <View style={[s.featuredImg, s.noImage]}>
          <Text style={{ fontSize: 60 }}>🎬</Text>
        </View>
      )}
      <View style={s.featuredOverlay}>
        <View style={s.badge}>
          <Text style={s.badgeText}>DESTACADO</Text>
        </View>
        <Text style={s.featuredTitle} numberOfLines={2}>{post.title}</Text>
        <View style={s.metaRow}>
          {post.year && <Chip text={`📅 ${post.year}`} />}
          {post.rating && <Chip text={`⭐ ${post.rating}`} gold />}
          {post.labels.slice(0, 1).map((l) => (
            <Chip key={l} text={l} red />
          ))}
        </View>
        <TouchableOpacity style={s.watchBtn} onPress={onPress}>
          <Text style={s.watchBtnText}>▶ Ver ahora</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MovieCard({ post, onPress }) {
  return (
    <TouchableOpacity style={[s.card, { width: CARD_WIDTH }]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardImgWrap}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={s.cardImg} />
        ) : (
          <View style={[s.cardImg, s.noImage]}>
            <Text style={{ fontSize: 36 }}>🎬</Text>
          </View>
        )}
        {post.rating && (
          <View style={s.ratingBadge}>
            <Text style={s.ratingText}>⭐ {post.rating}</Text>
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
        <Text style={s.cardDate}>{post.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ text, gold, red }) {
  return (
    <View style={[s.chip, gold && s.chipGold, red && s.chipRed]}>
      <Text style={[s.chipText, gold && s.chipTextGold, red && s.chipTextRed]}>
        {text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 14 },
  errorText: { color: colors.muted, fontSize: 14, textAlign: "center", marginHorizontal: 32 },
  retryBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    backgroundColor: "#ffffff15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff20",
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    paddingVertical: 11,
  },
  clearBtn: { padding: 4 },
  tabsScroll: { marginBottom: 4 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff15",
    gap: 2,
  },
  tabActive: { backgroundColor: colors.red, borderColor: colors.red },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 11, color: colors.muted },
  tabLabelActive: { color: "#fff", fontWeight: "700" },
  featured: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    height: 220,
    backgroundColor: colors.bgCard2,
  },
  featuredImg: { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  featuredTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  chip: {
    backgroundColor: "#ffffff20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  chipGold: { backgroundColor: "rgba(244,162,97,0.2)" },
  chipRed: { backgroundColor: "rgba(230,57,70,0.2)" },
  chipText: { color: "#ddd", fontSize: 11 },
  chipTextGold: { color: colors.gold, fontWeight: "700" },
  chipTextRed: { color: colors.red },
  watchBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.red,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ffffff0d",
  },
  cardImgWrap: { aspectRatio: 2 / 3, backgroundColor: colors.bgCard2 },
  cardImg: { width: "100%", height: "100%", resizeMode: "cover" },
  noImage: { alignItems: "center", justifyContent: "center" },
  ratingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  yearBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(230,57,70,0.85)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  yearText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 10 },
  cardTitle: { color: colors.white, fontSize: 12, fontWeight: "600", lineHeight: 17, marginBottom: 4 },
  cardDate: { color: colors.dim, fontSize: 10 },
});