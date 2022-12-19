package shared.model

@kotlinx.serialization.Serializable
data class TranslationBody(
    val q: String,
    val source: String,
    val target: String
)
