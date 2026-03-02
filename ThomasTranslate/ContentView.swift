import SwiftUI

struct ContentView: View {
    @State private var selectedImage: UIImage?
    @State private var recognizedText = ""
    @State private var translatedText = ""
    @State private var isShowingCamera = false
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var autoReadAloud = true

    private let ocrService = OCRService()
    private let translationService = TranslationService()
    @State private var speechService = SpeechService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    imagePreview

                    actionButton(
                        title: "Ta bilde",
                        icon: "camera.fill",
                        style: .prominent
                    ) {
                        isShowingCamera = true
                    }

                    Toggle(isOn: $autoReadAloud) {
                        Text("Les automatisk opp")
                            .font(.title3.weight(.semibold))
                    }
                    .toggleStyle(.switch)
                    .padding(14)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                    if isProcessing {
                        statusCard(message: "Jobbar med tekst. Vent litt...")
                    }

                    if let errorMessage {
                        statusCard(message: errorMessage, isError: true)
                    }

                    textSection(title: "Norsk", text: recognizedText)
                    textSection(title: "Ukrainsk", text: translatedText)

                    actionButton(
                        title: "Les opp",
                        icon: "speaker.wave.2.fill",
                        style: .normal,
                        disabled: translatedText.isEmpty
                    ) {
                        speechService.speakUkrainian(translatedText)
                    }
                }
                .padding()
            }
            .navigationTitle("Oversett dokument")
        }
        .sheet(isPresented: $isShowingCamera) {
            CameraPicker(selectedImage: $selectedImage)
        }
        .onChange(of: selectedImage) { _, newImage in
            guard let newImage else { return }
            process(image: newImage)
        }
    }

    @ViewBuilder
    private var imagePreview: some View {
        if let selectedImage {
            Image(uiImage: selectedImage)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .frame(height: 320)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )
        } else {
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.gray.opacity(0.12))
                .frame(height: 320)
                .overlay {
                    VStack(spacing: 10) {
                        Image(systemName: "doc.text.viewfinder")
                            .font(.system(size: 44, weight: .semibold))
                        Text("Trykk 'Ta bilde' for å starte")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                }
        }
    }

    private func textSection(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.title3.weight(.bold))
            Text(text.isEmpty ? "Ingen tekst enno" : text)
                .font(.title3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func statusCard(message: String, isError: Bool = false) -> some View {
        Text(message)
            .font(.title3)
            .foregroundStyle(isError ? .red : .primary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(isError ? Color.red.opacity(0.1) : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func actionButton(
        title: String,
        icon: String,
        style: ButtonVisualStyle,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Group {
            if style == .prominent {
                Button(action: action) {
                    Label(title, systemImage: icon)
                        .font(.title3.weight(.bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(disabled)
            } else {
                Button(action: action) {
                    Label(title, systemImage: icon)
                        .font(.title3.weight(.bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .disabled(disabled)
            }
        }
    }

    private func process(image: UIImage) {
        isProcessing = true
        errorMessage = nil
        recognizedText = ""
        translatedText = ""
        speechService.stop()

        Task {
            do {
                let extracted = try await ocrService.extractText(from: image)
                let translated = try await translationService.translateNorwegianToUkrainian(extracted)

                await MainActor.run {
                    recognizedText = extracted
                    translatedText = translated
                    isProcessing = false

                    if autoReadAloud {
                        speechService.speakUkrainian(translated)
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Klarte ikkje å lese eller omsetje. Ta eit nytt bilde med meir lys."
                    isProcessing = false
                }
            }
        }
    }
}

private enum ButtonVisualStyle: Equatable {
    case prominent
    case normal
}

#Preview {
    ContentView()
}
