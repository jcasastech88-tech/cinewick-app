import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, Dimensions, Share, ActivityIndicator,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { fetchTrailer } from "../api";
import { colors } from "../theme";

const { width } = Dimensions.get("window");
const PLAYER_HEIGHT = width * 0.56; // 16:9

export default function DetailScreen({ route, navigation }) {
  const { post } = route.params;
  const [trailerKey, setTrailerKey]     = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [showTrailer, setShowTrailer]   = useState(false);
  const [playing, setPlaying]           = useState(false);

  useEffect(() => {
    fetchTrailer(post.tmdbId, post.tmdbType)
      .then((key) => { setTrailerKey(key); setLoadingTrailer(false); })
      .catch(() => setLoadingTrailer(false));
  }, [post.tmdbId]);

  const openTrailer = () => {
    setShowTrailer(true);
    setPlaying(true);
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setPlaying(false);
  };

  const openInBrowser = () => Linking.openURL(post.url);
  const sharePost = () => Share.share({
    message: `${post.title} — Miralo en CineWick: ${post.url}`,
  });

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero: alterna entre imagen y reproductor */}
        <View style={[s.heroWrap, { height: PLAYER_HEIGHT }]}>
          {showTrailer && trailerKey ? (
            // ── Reproductor YouTube ──────────────────────────
            <View style={s.playerWrap}>
              <YoutubePlayer
                height={PLAYER_HEIGHT}
                width={width}
                videoId={trailerKey}
                play={playing}
                webViewStyle={{ opacity: 0.99 }}
                onChangeState={(state) => {
                  if (state === "ended") closeTrailer();
                }}
              />
            </View>
          ) : (
            // ── Imagen de fondo ──────────────────────────────
            <>
              {post.backdrop || post.image ? (
                <Image source={{ uri: post.backdrop || post.image }} style={s.heroImg} />
              ) : (
                <View style={[s.heroImg, s.noImg]}>
                  <Text style={{ fontSize: 80 }}>🎬</Text>
                </View>
              )}
              <View style={s.heroFade} />

              {/* Botón Ver tráiler */}
              {loadingTrailer && (
                <View style={s.playBtn}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
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

          {/* Botón volver — siempre visible */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>

          {/* Cerrar tráiler — solo cuando está reproduciendo */}
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

        {/* Contenido — siempre visible debajo */}
        <View style={s.content}>
          <View style={s.metaRow}>
            {post.labels.map((l) => (
              <View key={l} style={s.labelChip}>
                <Text style={s.labelText}>{l}</Text>
              </View>
            ))}
          </View>

          <Text style={s.title}>{post.title}</Text>

          <View style={s.statsRow}>
            {post.rating && (
              <View style={s.statBox}>
                <Text style={s.statValue}>⭐ {post.rating}</Text>
                <Text style={s.statLabel}>Puntuación</Text>
              </View>
            )}
            {post.year && (
              <View style={s.statBox}>
                <Text style={s.statValue}>📅 {post.year}</Text>
                <Text style={s.statLabel}>Año</Text>
              </View>
            )}
            <View style={s.statBox}>
              <Text style={s.statValue}>🗓 {post.date}</Text>
              <Text style={s.statLabel}>Publicado</Text>
            </View>
          </View>

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
  title:         { color: colors.white, fontSize: 24, fontWeight: "800", lineHeight: 32, marginBottom: 16 },
  statsRow:      { flexDirection: "row", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  statBox:       {
    backgroundColor: colors.bgCard, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#ffffff10", minWidth: 90,
  },
  statValue:     { color: colors.white, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  statLabel:     { color: colors.dim, fontSize: 11 },
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