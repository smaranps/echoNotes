import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { Audio } from "expo-av";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

interface TypewriterProps {
  text: string;
  delay?: number;
}

const TypewriterText: React.FC<TypewriterProps> = ({ text, delay = 25 }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text || currentIndex >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentIndex, text, delay]);

  return <Text style={styles.outputText}>{displayText}</Text>;
};

const AnimatedGradientText = ({ text = "Powered by EchoNotes" }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const slide = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  return (
    <MaskedView
      maskElement={<Text style={styles.poweredText}>{text}</Text>}
      style={{ alignSelf: "center", marginTop: -50, marginBottom: 20 }}
    >
      <Animated.View
        style={{ width: 300, height: 40, transform: [{ translateX: slide }] }}
      >
        <LinearGradient
          colors={["#00C2FF", "#6C4CFF", "#FF6EC7"]}
          start={[0, 0]}
          end={[1, 0]}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </MaskedView>
  );
};

export default function HomeScreen() {
  const GEMINI_API_KEY = "--------";
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted)
        return Alert.alert(
          "Permission Required",
          "Microphone permission is required."
        );

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
    } catch (err) {
      console.log("Recording error:", err);
    }
  };

  async function stopRecording() {
    if (!recording) return;
    setLoading(true);
    setSummary("");

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return setLoading(false);

      const base64Audio = await LegacyFileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      if (base64Audio.length < 100) {
        setSummary("Recording too short — try speaking longer.");
        return setLoading(false);
      }

      const result = await model.generateContent([
        { inlineData: { data: base64Audio, mimeType: "audio/mp4" } },
        {
          text: "Provide a summary in simple ADHD/dyslexia-friendly bullet points only.",
        },
      ]);

      setSummary(result.response.text());
      setRecording(null);
    } catch (e) {
      setSummary("Error — Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🎧 Audio Companion</Text>
      <Text style={styles.subtitle}>
        Tap to record your thoughts, get summary instantly.
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: recording ? "#CC0000" : "#007AFF" },
          ]}
          onPress={recording ? stopRecording : startRecording}
          disabled={loading}
        >
          <View style={styles.buttonContent}>
            {recording && <View style={styles.recordingIndicator} />}
            <Text style={styles.buttonText}>
              {recording ? "STOP & ANALYZE" : "START RECORDING"}
            </Text>
          </View>
        </TouchableOpacity>
        {recording && <Text style={styles.recordingStatus}>Recording...</Text>}
      </View>

      <View style={styles.outputContainer}>
        {loading && (
          <View style={styles.loadingView}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processing your thoughts...</Text>
          </View>
        )}

        {!loading && summary !== "" && (
          <View style={styles.card}>
            <Text style={styles.outputTitle}>Focused Summary:</Text>
            <TypewriterText text={summary} />
          </View>
        )}
      </View>

      <AnimatedGradientText text="Powered by EchoNotes" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF0E6",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 5,
    marginTop: 100,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 40,
  },
  controls: { alignItems: "center", marginBottom: 40 },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 8,
    width: "80%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700" },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "white",
    marginRight: 10,
  },
  recordingStatus: {
    marginTop: 15,
    fontSize: 16,
    color: "#CC0000",
    fontWeight: "bold",
  },
  outputContainer: { paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outputTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    color: "#007AFF",
  },
  outputText: { fontSize: 16, lineHeight: 28, color: "#333" },
  loadingView: { alignItems: "center", paddingVertical: 20 },
  loadingText: { marginTop: 10, color: "#666" },

  poweredText: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: "transparent",
  },
});
