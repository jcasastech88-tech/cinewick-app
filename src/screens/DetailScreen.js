import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, Dimensions, Share, ActivityIndicator,
  Modal, FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import YoutubePlayer from "react-native-youtube-iframe";
import { fetchTrailer, fetchFullDetail, fetchPosts } from "../api";
import { colors } from "../theme";

const { width, height } = Dimensions.get("window");
const PLAYER_HEIGHT = width * 0.56;

function parseSerieData(html) {
  try {
    const match = html.match(/window\.serieData\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch { return null; }
}

function parseCast(html) {
  try {
    const matches = [...html.matchAll(/<img[^>]+src=["'](https:\/\/image\.tmdb[^"']+w185[^"']+)["'][^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g)];
    return matches.slice(0, 10).map((m) => ({ img: m[1], name: m[2] }));
  } catch { return []; }
}

function parseQuality(html) {
  const m = html.match(/HD\s*\d+p|4K|FHD|BluRay/i);
  return m ? m[0] : null;
}

export default function DetailScreen({ route, navigation }) {
  const { post } = route.params;

  const [trailerKey, setTrailerKey]         = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [showTrailer, setShowTrailer]       = useState(false);
  const [trailerPlaying, setTrailerPlaying] = useState(false);

  const [detail, setDetail]     = useState(null);
  const [serieData, setSerieData] = useState(null);
  const [cast, setCast]         = useState([]);
  const [quality, setQuality]   = useState(null);
  const [similar, setSimilar]   = useState([]);
  const [loadingPost, setLoadingPost] = useState(true);

  const [currentLang, setCurrentLang]     = useState("LAT");
  const [currentSeason, setCurrentSeason] = useState(post.tmdbSeason || 1);
  const [currentEp, setCurrentEp]         = useState(1);
  const [videoUrl, setVideoUrl]           = useState(null);
  const [showPlayer, setShowPlayer]       = useState(false);
  const [playerReady, setPlayerReady]     = useState(false);

  const isMovie = post.tmdbType === "movie";

  useEffect(() => {
    // Tráiler
    fetchTrailer(post.tmdbId, post.tmdbType)
      .then((k) => { setTrailerKey(k); setLoadingTrailer(false); })
      .catch(() => setLoadingTrailer(false));

    // Detalle TMDB
    fetchFullDetail(post.tmdbId, post.tmdbType)
      .then((d) => {
        setDetail(d);
        // Cargar similares
        const label = isMovie ? "Películas" : "series";
        fetchPosts(label, 1).then((posts) => setSimilar(posts.slice(0, 10))).catch(() => {});
      })
      .catch(() => {});

    // HTML del post
    fetch(post.url)
      .then((r) => r.text())
      .then((html) => {
        const data = parseSerieData(html);
        setSerieData(data);
        setCast(parseCast(html));
        setQuality(parseQuality(html));
        setLoadingPost(false);
      })
      .catch(() => setLoadingPost(false));
  }, [post.url]);

  // Actualizar URL del video
  useEffect(() => {
    if (!serieData) return;
    const url = serieData[`temp${currentSeason}`]?.[`cap${currentEp}`]?.[currentLang];
    if (url) setVideoUrl(url);
  }, [serieData, currentLang, currentSeason, currentEp]);

  const seasons  = serieData ? Object.keys(serieData).map((k) => parseInt(k.replace("temp", ""))).sort((a,b)=>a-b) : [];
  const episodes = serieData ? Object.keys(serieData[`temp${currentSeason}`] || {}).map((k) => parseInt(k.replace("cap",""))).sort((a,b)=>a-b) : [];
  const hasLAT   = !!serieData?.[`temp${currentSeason}`]?.[`cap${currentEp}`]?.LAT;
  const hasENG   = !!serieData?.[`temp${currentSeason}`]?.[`cap${currentEp}`]?.ENG;

  // Info TMDB
  const genres     = detail?.genres?.map((g) => g.name) ?? [];
  const runtime    = detail ? (isMovie ? detail.runtime : detail.episode_run_time?.[0]) : null;
  const voteCount  = detail?.vote_count ?? null;
  const originalTitle = detail ? (isMovie ? detail.original_title : detail.original_name) : null;
  const seasons2   = !isMovie ? detail?.number_of_seasons : null;
  const releaseYear = post.year || post.date?.slice(0,4);

  const openTrailer  = () => { setShowTrailer(true); setTrailerPlaying(true); };
  const closeTrailer = () => { setShowTrailer(false); setTrailerPlaying(false); };
  const sharePost    = () => Share.share({ message: `${post.title} — Miralo en CineWick: ${post.url}` });
  const openWeb      = () => Linking.openURL(post.url);

  const playVideo = () => {
    if (!videoUrl) return;
    setPlayerReady(false);
    setShowPlayer(true);
  };

  return (
    <View style={s.container}>

      {/* ── Modal Reproductor ── */}
      <Modal visible={showPlayer} animationType="slide" supportedOrientations={["portrait","landscape"]} onRequestClose={() => setShowPlayer(false)}>
        <View style={s.modalBg}>
          {/* Header del reproductor */}
          <View style={s.playerHeader}>
            <TouchableOpacity onPress={() => setShowPlayer(false)} style={s.playerBack}>
              <Text style={s.playerBackText}>‹</Text>
            </TouchableOpacity>
            <Text style={s.playerHeaderTitle} numberOfLines={1}>
              {post.title}{!isMovie ? ` - T${currentSeason} E${currentEp}` : ""}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Video */}
          <View style={[s.videoWrap, { height: PLAYER_HEIGHT }]}>
            {!playerReady && (
              <View style={s.videoLoading}>
                <ActivityIndicator color={colors.red} size="large" />
              </View>
            )}
            <WebView
              source={{ uri: videoUrl }}
              style={{ flex: 1 }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              onLoad={() => setPlayerReady(true)}
            />
          </View>

          {/* Info y controles dentro del modal */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.modalTitle}>{post.title}{!isMovie ? ` - Temporada ${currentSeason}` : ""}</Text>
            <Text style={s.modalMeta}>
              {releaseYear}{voteCount ? ` | ${voteCount}` : ""}{releaseYear ? ` ${releaseYear}` : ""}{genres[0] ? ` ${genres.slice(0,2).join("/")}` : ""}
            </Text>

            {/* Idioma */}
            <Text style={s.modalSectionLabel}>Idioma</Text>
            <View style={s.modalLangRow}>
              {hasENG && (
                <TouchableOpacity
                  style={[s.modalLangBtn, currentLang === "ENG" && s.modalLangBtnActive]}
                  onPress={() => setCurrentLang("ENG")}
                >
                  <Text style={[s.modalLangText, currentLang === "ENG" && s.modalLangTextActive]}>Subtítulos</Text>
                </TouchableOpacity>
              )}
              {hasLAT && (
                <TouchableOpacity
                  style={[s.modalLangBtn, currentLang === "LAT" && s.modalLangBtnActive]}
                  onPress={() => setCurrentLang("LAT")}
                >
                  <Text style={[s.modalLangText, currentLang === "LAT" && s.modalLangTextActive]}>Doblaje</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Temporadas */}
            {seasons.length > 0 && (
              <>
                <View style={s.seasonRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {seasons.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[s.seasonPill, currentSeason === t && s.seasonPillActive]}
                        onPress={() => { setCurrentSeason(t); setCurrentEp(1); }}
                      >
                        <Text style={[s.seasonPillText, currentSeason === t && s.seasonPillTextActive]}>
                          {post.tmdbSeason === t && post.tmdbSeasonName
                            ? post.tmdbSeasonName
                            : `Temporada ${t}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Episodios */}
                <View style={s.epGrid}>
                  {episodes.map((ep) => (
                    <TouchableOpacity
                      key={ep}
                      style={[s.epBtn, currentEp === ep && s.epBtnActive]}
                      onPress={() => setCurrentEp(ep)}
                    >
                      <Text style={[s.epBtnText, currentEp === ep && s.epBtnTextActive]}>{ep}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Similares */}
            {similar.length > 0 && (
              <>
                <Text style={s.modalSectionLabel}>Películas similares</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {similar.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.similarItem}
                      onPress={() => {
                        setShowPlayer(false);
                        navigation.push("Detail", { post: item });
                      }}
                    >
                      {item.image
                        ? <Image source={{ uri: item.image }} style={s.similarImg} />
                        : <View style={[s.similarImg, { backgroundColor: colors.bgCard2, alignItems:"center", justifyContent:"center" }]}><Text>🎬</Text></View>
                      }
                      <Text style={s.similarTitle} numberOfLines={2}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero / Tráiler ── */}
        <View style={[s.heroWrap, { height: PLAYER_HEIGHT }]}>
          {showTrailer && trailerKey ? (
            <YoutubePlayer height={PLAYER_HEIGHT} width={width} videoId={trailerKey} play={trailerPlaying}
              webViewStyle={{ opacity: 0.99 }}
              onChangeState={(state) => { if (state === "ended") closeTrailer(); }} />
          ) : (
            <>
              {post.backdrop || post.image
                ? <Image source={{ uri: post.backdrop || post.image }} style={s.heroImg} />
                : <View style={[s.heroImg, s.noImg]}><Text style={{ fontSize: 80 }}>🎬</Text></View>
              }
              <View style={s.heroFade} />
              {loadingTrailer
                ? <View style={s.trailerBtn}><ActivityIndicator color="#fff" size="small" /></View>
                : trailerKey
                  ? <TouchableOpacity style={s.trailerBtn} onPress={openTrailer}>
                      <Text style={s.trailerBtnText}>▶ Ver tráiler</Text>
                    </TouchableOpacity>
                  : <View style={s.noTrailerBadge}><Text style={s.noTrailerText}>Sin tráiler</Text></View>
              }
            </>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          {showTrailer
            ? <TouchableOpacity style={s.topRightBtn} onPress={closeTrailer}><Text style={s.topRightText}>✕</Text></TouchableOpacity>
            : <TouchableOpacity style={s.topRightBtn} onPress={sharePost}><Text style={s.topRightText}>↗</Text></TouchableOpacity>
          }
        </View>

        <View style={s.content}>
          {/* Géneros */}
          <View style={s.metaRow}>
            {(genres.length > 0 ? genres : post.labels).map((g) => (
              <View key={g} style={s.labelChip}><Text style={s.labelText}>{g}</Text></View>
            ))}
          </View>

          <Text style={s.title}>{post.title}</Text>
          <Text style={s.subMeta}>
            {releaseYear}{runtime ? ` · ${runtime} min` : ""}{seasons2 ? ` · ${seasons2} temporadas` : ""}{quality ? ` · ${quality}` : ""}
          </Text>

          {/* ── Botón principal VER ── */}
          {loadingPost ? (
            <View style={[s.watchBtn, { justifyContent: "center" }]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : serieData ? (
            <TouchableOpacity style={s.watchBtn} onPress={playVideo}>
              <Text style={s.watchBtnText}>
                ▶ {isMovie
                  ? "Ver película"
                  : post.tmdbSeasonName
                    ? `Ver ${post.tmdbSeasonName}`
                    : "Ver serie"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.watchBtn} onPress={openWeb}>
              <Text style={s.watchBtnText}>▶ Ver en CineWick Web</Text>
            </TouchableOpacity>
          )}

          {/* Descripción */}
          <Text style={s.body}>{post.content || post.summary}</Text>

          {/* Info grid */}
          <View style={s.infoGrid}>
            {originalTitle && originalTitle !== post.title && <InfoRow icon="🎬" label="Título original" value={originalTitle} />}
            {post.rating   && <InfoRow icon="⭐" label="Rating"    value={`${post.rating} / 10`} highlight />}
            {voteCount     && <InfoRow icon="🗳" label="Votos"     value={voteCount.toLocaleString()} />}
            {post.date     && <InfoRow icon="📅" label="Estreno"   value={post.date} />}
            {runtime       && <InfoRow icon="⏱" label="Duración"  value={`${runtime} min`} />}
            {quality       && <InfoRow icon="📺" label="Calidad"   value={quality} />}
            {seasons2      && <InfoRow icon="🎞" label="Temporadas" value={`${seasons2} temp`} />}
            {post.tmdbSeason && <InfoRow icon="📋" label="Esta entrega" value={post.tmdbSeasonName || `Temporada ${post.tmdbSeason}`} />}
          </View>

          {/* Reparto */}
          {cast.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Reparto principal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {cast.map((c, i) => (
                  <View key={i} style={s.castItem}>
                    <Image source={{ uri: c.img }} style={s.castImg} />
                    <Text style={s.castName} numberOfLines={2}>{c.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Similares */}
          {similar.length > 0 && (
            <>
              <Text style={s.sectionTitle}>
                {isMovie ? "Películas similares" : "Series similares"}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {similar.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.similarItem}
                    onPress={() => navigation.push("Detail", { post: item })}
                  >
                    {item.image
                      ? <Image source={{ uri: item.image }} style={s.similarImg} />
                      : <View style={[s.similarImg, { backgroundColor: colors.bgCard2, alignItems:"center", justifyContent:"center" }]}><Text>🎬</Text></View>
                    }
                    <Text style={s.similarTitle} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={s.secondaryBtn} onPress={openWeb}>
            <Text style={s.secondaryBtnText}>🌐 Ver en CineWick Web</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoLeft}>
        <Text style={s.infoIcon}>{icon}</Text>
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={[s.infoValue, highlight && s.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },

  // Modal reproductor
  modalBg:      { flex: 1, backgroundColor: "#0d0d0d" },
  playerHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 48, paddingBottom: 10, backgroundColor: "#0d0d0d" },
  playerBack:   { width: 40, alignItems: "center" },
  playerBackText:{ color: "#fff", fontSize: 28, fontWeight: "300" },
  playerHeaderTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" },
  videoWrap:    { width, backgroundColor: "#000", position: "relative" },
  videoLoading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 1, backgroundColor: "#000" },
  modalTitle:   { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  modalMeta:    { color: colors.dim, fontSize: 12, marginBottom: 16 },
  modalSectionLabel: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 10, marginTop: 8 },
  modalLangRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  modalLangBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#444", backgroundColor: "#1a1a1a" },
  modalLangBtnActive: { backgroundColor: colors.red, borderColor: colors.red },
  modalLangText: { color: "#aaa", fontSize: 14, fontWeight: "600" },
  modalLangTextActive: { color: "#fff" },
  seasonRow:    { marginBottom: 12 },
  seasonPill:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#333", marginRight: 8, backgroundColor: "#1a1a1a" },
  seasonPillActive: { backgroundColor: colors.red, borderColor: colors.red },
  seasonPillText: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  seasonPillTextActive: { color: "#fff" },
  epGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  epBtn:        { width: 52, height: 52, borderRadius: 8, borderWidth: 1, borderColor: "#333", backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  epBtnActive:  { backgroundColor: colors.red, borderColor: colors.red },
  epBtnText:    { color: "#aaa", fontSize: 16, fontWeight: "700" },
  epBtnTextActive: { color: "#fff" },

  // Hero
  heroWrap:     { position: "relative", backgroundColor: "#000" },
  heroImg:      { width: "100%", height: "100%", resizeMode: "cover" },
  noImg:        { alignItems: "center", justifyContent: "center" },
  heroFade:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 100, backgroundColor: "rgba(0,0,0,0.6)" },
  backBtn:      { position: "absolute", top: 48, left: 16, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backText:     { color: "#fff", fontSize: 14, fontWeight: "600" },
  topRightBtn:  { position: "absolute", top: 48, right: 16, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  topRightText: { color: "#fff", fontSize: 16 },
  trailerBtn:   { position: "absolute", bottom: 16, left: width/2 - 65, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(230,57,70,0.92)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  trailerBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  noTrailerBadge: { position: "absolute", bottom: 16, left: width/2 - 70, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  noTrailerText: { color: "#aaa", fontSize: 12 },

  // Content
  content:      { padding: 20, paddingBottom: 48 },
  metaRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  labelChip:    { backgroundColor: "rgba(230,57,70,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(230,57,70,0.3)" },
  labelText:    { color: colors.red, fontSize: 11, fontWeight: "600" },
  title:        { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 30, marginBottom: 4 },
  subMeta:      { color: colors.dim, fontSize: 12, marginBottom: 16 },
  watchBtn:     { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 20, flexDirection: "row", justifyContent: "center" },
  watchBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  body:         { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  infoGrid:     { backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: "#ffffff0d", marginBottom: 24, overflow: "hidden" },
  infoRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  infoLeft:     { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  infoIcon:     { fontSize: 15 },
  infoLabel:    { color: colors.dim, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:    { color: "#fff", fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 },
  infoValueHighlight: { color: colors.gold, fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  castItem:     { width: 76, marginRight: 12, alignItems: "center" },
  castImg:      { width: 62, height: 62, borderRadius: 31, marginBottom: 6, borderWidth: 2, borderColor: "#ffffff15" },
  castName:     { color: "#bbb", fontSize: 10, textAlign: "center", lineHeight: 13 },
  similarItem:  { width: 110, marginRight: 12 },
  similarImg:   { width: 110, height: 165, borderRadius: 10, marginBottom: 6, resizeMode: "cover" },
  similarTitle: { color: "#bbb", fontSize: 11, lineHeight: 14 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#ffffff20", marginTop: 8 },
  secondaryBtnText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
});
