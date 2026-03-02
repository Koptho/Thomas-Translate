import Foundation

enum TranslationServiceError: Error {
    case invalidResponse
}

struct TranslationService {
    private let endpoint = URL(string: "https://translate.argosopentech.com/translate")!

    func translateNorwegianToUkrainian(_ text: String) async throws -> String {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = TranslationRequest(q: text, source: "no", target: "uk", format: "text")
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw TranslationServiceError.invalidResponse
        }

        let decoded = try JSONDecoder().decode(TranslationResponse.self, from: data)
        return decoded.translatedText
    }
}

private struct TranslationRequest: Codable {
    let q: String
    let source: String
    let target: String
    let format: String
}

private struct TranslationResponse: Codable {
    let translatedText: String
}
