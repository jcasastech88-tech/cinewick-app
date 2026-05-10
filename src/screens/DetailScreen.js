import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, Dimensions, Share, ActivityIndicator,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { fetchTrailer, fetchFullDetail } from "../api";
import { colors } from "../theme";

const { width } = Dimensions.get("window");
const PLAYER_HEIGHT = width * 0.56;

export default function DetailScreen({ route, navigation }) {
  const { post } = route.params;
  const [trailerKey, setTrailerKey]         = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [showTrailer, setShowTrailer]       = useState(false);
  const [playing, setPlaying]               = useState(false);
  const [detail, setDetail]                 = useState(null);

  useEffect(() => {
    fetchTrailer(post.tmdbId, post.tmdbType)
      .then((key) => { setTrailerKey(key); setLoadingTrailer(false); })
      .catch(() => setLoadingTrailer(false));

    fetchFullDetail(post.tmdbId, post.tmdbType)
      .then((d) => setDetail(d))
      .catch(() => {});
  }, [post.tmdbId]);

  const openTrailer  = () => { setShowTrailer(true); setPlaying(true); };
  const closeTrailer = () => { setShowTrailer(false); setPlaying(false); };
  const openInBrowser = () => Linking.openURL(post.url);
  const sharePost = () => Share.share({
    message: `${post.title} — Miralo en CineWick: ${post.url}`,
  });

  // Extraer datos extra de TMDB
  const isMovie    = post.tmdbType === "movie";
  const runtime    = detail ? (isMovie ? detail.runtime : detail.episode_run_time?.[0]) : null;
  const genres     = detail?.genres?.map((g) => g.name) ?? [];
  const country    = detail ? (isMovie
    ? detail.production_countries?.[0]?.name
    : detail.origin_country?.[0]) : null;
  const voteCount  = detail?.vote_count ?? null;
  const originalTitle = detail ? (isMovie ? detail.original_title : detail.original_name) : null;
  const status     = detail?.status ?? null;
  const language   = detail?.original_language?.toUpperCase() ?? null;
  const seasons    = !isMovie ? detail?.number_of_seasons : null;
  const episodes   = !isMovie ? detail?.number_of_episodes : null;

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.heroWrap, { height: PLAYER_HEIGHT }]}>
          {showTrailer && trailerKey ? (
            <View style={s.playerWrap}>
              <YoutubePlayer
                height={PLAYER_HEIGHT}
                width={width}
                videoId={trailerKey}
                play={playing}
                webViewStyle={{ opacity: 0.99 }}
                onChangeState={(state) => { if (state === "ended") closeTrailer(); }}
              />
            </View>
          ) : (
            <>
              {post.backdrop || post.image ? (
                <Image source={{ uri: post.backdrop || post.image }} style={s.heroImg} />
              ) : (
                <View style={[s.heroImg, s.noImg]}>
                  <Text style={{ fontSize: 80 }}>🎬</Text>
                </View>
              )}
              <View style={s.heroFade} />
              {loadingTrailer && <View style={s.playBtn}><ActivityIndicator color="#fff" size="small" /></View>}
              {!loadingTrailer && trailerKey && (
                <TouchableOpacity style={s.playBtn} onPress={openTrailer}>
                  <Text style={s.playIcon}>▶</Text>
                  <Text style={s.playText}>Ver tráiler</Text>
                </TouchableOpacity>
              )}
              {!loadingTrailer && !trailerKey && (
                <View style={s.noTrailerBadge}>
                  <Text style={s.noTrailerText}>Sin tráiler disponible</Text>
                </View>
              )}
            </>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          {showTrailer ? (
            <TouchableOpacity style={s.shareBtn} onPress={closeTrailer}>
              <Text style={s.shareText}>✕ Cerrar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.shareBtn} onPress={sharePost}>
              <Text style={s.shareText}>↗ Compartir</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.content}>
          {/* Géneros */}
          <View style={s.metaRow}>
            {genres.length > 0
              ? genres.map((g) => <View key={g} style={s.labelChip}><Text style={s.labelText}>{g}</Text></View>)
              : post.labels.map((l) => <View key={l} style={s.labelChip}><Text style={s.labelText}>{l}</Text></View>)
            }
          </View>

          {/* Título */}
          <Text style={s.title}>{post.title}</Text>

          {/* Info grid */}
          <View style={s.infoGrid}>
            {originalTitle && originalTitle !== post.title && (
              <InfoRow icon="🎬" label="Título original" value={originalTitle} />
            )}
            {post.rating && (
              <InfoRow icon="⭐" label="Rating" value={`${post.rating} / 10`} highlight />
            )}
            {voteCount && (
              <InfoRow icon="🗳" label="Votos" value={voteCount.toLocaleString()} />
            )}
            {post.year && (
              <InfoRow icon="📅" label="Fecha de estreno" value={post.date || post.year} />
            )}
            {runtime && (
              <InfoRow icon="⏱" label="Duración" value={`${runtime} min`} />
            )}
            {country && (
              <InfoRow icon="🌎" label="País" value={country} />
            )}
            {language && (
              <InfoRow icon="🔊" label="Idioma" value={language} />
            )}
            {status && (
              <InfoRow icon="📡" label="Estado" value={status} />
            )}
            {seasons && (
              <InfoRow icon="📺" label="Temporadas" value={`${seasons} temporadas · ${episodes} episodios`} />
            )}
            <InfoRow icon="🏷" label="Categoría" value={isMovie ? "Película" : "Serie"} />
          </View>

          {/* Descripción */}
          <Text style={s.sectionTitle}>Descripción</Text>
          <Text style={s.body}>{post.content || post.summary}</Text>

          <TouchableOpacity style={s.cta} onPress={openInBrowser}>
            <Text style={s.ctaText}>▶ Ver en CineWick Web</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaSecondary} onPress={sharePost}>
            <Text style={s.ctaSecondaryText}>↗ Compartir</Text>
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
  container:     { flex: 1, backgroundColor: colors.bg },
  heroWrap:      { position: "relative", backgroundColor: "#000" },
  playerWrap:    { width: "100%", height: "100%", backgroundColor: "#000" },
  heroImg:       { width: "100%", height: "100%", resizeMode: "cover" },
  noImg:         { alignItems: "center", justifyContent: "center" },
  heroFade:      {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backBtn: {
    position: "absolute", top: 48, left: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  backText:      { color: "#fff", fontSize: 14, fontWeight: "600" },
  shareBtn:      {
    position: "absolute", top: 48, right: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  shareText:     { color: "#fff", fontSize: 14, fontWeight: "600" },
  playBtn:       {
    position: "absolute", bottom: 16, left: width / 2 - 70,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(230,57,70,0.92)",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
  },
  playIcon:      { color: "#fff", fontSize: 16 },
  playText:      { color: "#fff", fontSize: 14, fontWeight: "700" },
  noTrailerBadge:{
    position: "absolute", bottom: 16, left: width / 2 - 80,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  noTrailerText: { color: "#aaa", fontSize: 12 },
  content:       { padding: 20, paddingBottom: 48 },
  metaRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  labelChip:     {
    backgroundColor: "rgba(230,57,70,0.2)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  labelText:     { color: colors.red, fontSize: 12, fontWeight: "600" },
  title:         { color: colors.white, fontSize: 22, fontWeight: "800", lineHeight: 30, marginBottom: 16 },

  // Info grid
  infoGrid:      {
    backgroundColor: colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: "#ffffff10",
    marginBottom: 24, overflow: "hidden",
  },
  infoRow:       {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#ffffff08",
  },
  infoLeft:      { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  infoIcon:      { fontSize: 16 },
  infoLabel:     { color: colors.dim, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:     { color: colors.white, fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 },
  infoValueHighlight: { color: colors.gold, fontSize: 14, fontWeight: "800" },

  sectionTitle:  { color: colors.white, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  body:          { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 28 },
  cta:           {
    backgroundColor: colors.red, borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginBottom: 12,
  },
  ctaText:       { color: "#fff", fontSize: 16, fontWeight: "700" },
  ctaSecondary:  {
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#ffffff20",
  },
  ctaSecondaryText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
});