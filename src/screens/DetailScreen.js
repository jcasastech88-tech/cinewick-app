import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, Dimensions, Share, ActivityIndicator, Modal,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { fetchTrailer } from "../api";
import { colors } from "../theme";

const { width, height } = Dimensions.get("window");

export default function DetailScreen({ route, navigation }) {
  const { post } = route.params;
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTrailer(post.tmdbId, post.tmdbType)
      .then((key) => { setTrailerKey(key); setLoadingTrailer(false); })
      .catch(() => setLoadingTrailer(false));
  }, [post.tmdbId]);

  const openTrailer = () => {
    setPlaying(true);
    setShowModal(true);
  };

  const closeTrailer = () => {
    setPlaying(false);
    setShowModal(false);
  };

  const openInBrowser = () => Linking.openURL(post.url);
  const sharePost = () => Share.share({
    message: `${post.title} — Miralo en CineWick: ${post.url}`,
  });

  const heroHeight = width * 0.56;

  return (
    <View style={s.container}>

      {/* Modal del tráiler en pantalla completa */}
      <Modal
        visible={showModal}
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={closeTrailer}
      >
        <View style={s.modalContainer}>
<YoutubePlayer
  height={width * 0.56}
  width={width}
  videoId={trailerKey}
  play={playing}
  webViewStyle={{ opacity: 0.99 }}
  onChangeState={(state) => {
    if (state === "ended") closeTrailer();
  }}
/>
          <TouchableOpacity style={s.closeModal} onPress={closeTrailer}>
            <Text style={s.closeModalText}>✕ Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero imagen */}
        <View style={[s.heroWrap, { height: heroHeight }]}>
          {post.backdrop || post.image ? (
            <Image source={{ uri: post.backdrop || post.image }} style={s.heroImg} />
          ) : (
            <View style={[s.heroImg, s.noImg]}>
              <Text style={{ fontSize: 80 }}>🎬</Text>
            </View>
          )}
          <View style={s.heroFade} />

          {/* Botón tráiler */}
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

          {/* Navegación */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.shareBtn} onPress={sharePost}>
            <Text style={s.shareText}>↗ Compartir</Text>
          </TouchableOpacity>
        </View>

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
  modalContainer:{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  closeModal:    {
    position: "absolute", top: 48, right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  closeModalText:{ color: "#fff", fontSize: 15, fontWeight: "700" },
  heroWrap:      { position: "relative", backgroundColor: "#000" },
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