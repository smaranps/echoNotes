import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";

import { GoogleGenerativeAI } from "@google/generative-ai";
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
    if (!text || currentIndex >= text.length) {
      return;
    }
    const timer = setTimeout(() => {
      setDisplayText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentIndex, text, delay]);

  return <Text style={styles.outputText}>{displayText}</Text>;
};

export default function HomeScreen() {
  const GEMINI_API_KEY = "AIzaSyBrk67tUu8xZvgr29jmU1UgRQ9WkVoabM0";
  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const [originalQuestion, setOriginalQuestion] = useState("");
  const [simplifiedQuestion, setSimplifiedQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [complicatedWord, setComplicatedWord] = useState("");
  const [quickDefinition, setQuickDefinition] = useState("");
  const [loadingDefinition, setLoadingDefinition] = useState(false);

  const simplifyQuestion = async () => {
    if (originalQuestion.trim().length < 10) {
      return Alert.alert(
        "Input Needed",
        "Please enter a question at least 10 characters long to simplify."
      );
    }
    setLoading(true);
    setSimplifiedQuestion("");
    setQuickDefinition("");

    const simplificationPrompt = `A user with ADHD/Dyslexia has provided a complex concept.
    1. Simplify: Rewrite into absolute simplest form.
    2. Chunk: Break solution into max 5 bullet points.
    3. Focus: Include a "Memory Hook" (analogy).
    4. CRITICAL: DO NOT give the final answer. Provide the method.
    5. Format: Use Markdown headings and lists.
    
    Return format MUST include:
    - Simplified Goal
    - Your Action Plan
    - Memory Hook

    Original Question: "${originalQuestion}"`;

    try {
      const result = await model.generateContent(simplificationPrompt);
      setSimplifiedQuestion(result.response.text().trim());
    } catch (e) {
      console.error("Gemini Simplification Error:", e);
      Alert.alert("Error", "Check API key or network.");
    } finally {
      setLoading(false);
    }
  };

  const defineWord = async () => {
    if (complicatedWord.trim().length === 0) return;

    setLoadingDefinition(true);
    setQuickDefinition("");

    const definitionPrompt = `Define the word/phrase: "${complicatedWord}" for someone with ADHD.
    Use ONE simple sentence, make sure it is very easy to understand. Use an analogy if possible. Start with the word followed by a colon.`;

    try {
      const result = await model.generateContent(definitionPrompt);
      setQuickDefinition(result.response.text().trim());
    } catch (e) {
      setQuickDefinition("Could not define word.");
    } finally {
      setLoadingDefinition(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}> Simplify Your Concept</Text>

      <View style={styles.card}>
        <Text style={styles.outputTitle}>1. Enter the Complex Concept:</Text>
        <TextInput
          style={styles.textInput}
          onChangeText={setOriginalQuestion}
          value={originalQuestion}
          placeholder="E.g., What are the kinetic and thermodynamic controls governing a substitution reaction?"
          multiline={true}
          numberOfLines={4}
          editable={!loading}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
        onPress={simplifyQuestion}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Generate Focused Guide</Text>
        )}
      </TouchableOpacity>

      <View style={styles.quickCard}>
        <Text style={styles.quickTitle}>Stuck on a specific word?</Text>
        <View style={styles.quickInputRow}>
          <TextInput
            style={styles.quickTextInput}
            onChangeText={setComplicatedWord}
            value={complicatedWord}
            placeholder="Type word here..."
            editable={!loading && !loadingDefinition}
          />
          <TouchableOpacity
            style={[
              styles.quickButton,
              { opacity: loadingDefinition ? 0.6 : 1 },
            ]}
            onPress={defineWord}
            disabled={loadingDefinition}
          >
            {loadingDefinition ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.quickButtonText}>Define</Text>
            )}
          </TouchableOpacity>
        </View>

        {quickDefinition !== "" && (
          <View style={styles.quickDefinitionBox}>
            <Text style={styles.quickDefinitionText}>{quickDefinition}</Text>
          </View>
        )}
      </View>

      {simplifiedQuestion !== "" && (
        <View style={styles.resultCard}>
          <Text style={styles.outputTitle}>3. Your Structured Guide:</Text>

          <TypewriterText text={simplifiedQuestion} />

          {simplifiedQuestion.toLowerCase().includes("action plan") && (
            <View style={styles.imageContainer}>
              <Text style={styles.mindMapText}>
                Tip: Visually map your action plan:
              </Text>
              [Image of a mind map diagram for visual learning]
            </View>
          )}
        </View>
      )}

      {!loading && originalQuestion.length > 0 && simplifiedQuestion === "" && (
        <Text style={styles.errorText}>
          No result yet. Tap 'Generate Focused Guide' to begin.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF0E6",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 30,
    marginTop: 50,
    color: "#007AFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  quickCard: {
    backgroundColor: "#F4F6F8",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    marginBottom: 25,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
    marginBottom: 8,
  },
  quickInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#fff",
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    fontSize: 14,
  },
  quickButton: {
    backgroundColor: "#6A5ACD",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  quickButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
  quickDefinitionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#E6E6FA",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#6A5ACD",
  },
  quickDefinitionText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },

  resultCard: {
    backgroundColor: "#F0F8FF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BDE0FE",
    marginBottom: 40,
  },
  outputTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#FF7A00",
  },
  textInput: {
    minHeight: 120,
    maxHeight: 200,
    borderColor: "#CCCCCC",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: "white",
    color: "#333",
  },
  button: {
    backgroundColor: "#FF7A00",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  outputText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "500",
    color: "#333333",
  },
  errorText: {
    textAlign: "center",
    color: "#CC0000",
    marginTop: 10,
  },
  imageContainer: {
    marginTop: 20,
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#BDE0FE",
  },
  mindMapText: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 10,
    fontStyle: "italic",
    fontWeight: "600",
  },
});
