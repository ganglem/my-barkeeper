package shared.model

@kotlinx.serialization.Serializable
data class TranslationResponse(
    val translatedText: String
)
