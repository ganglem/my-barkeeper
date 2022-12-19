package shared.model

@kotlinx.serialization.Serializable
data class SharedCocktailDetails(
    val id: String,
    val source: String,
    val name: String,
    val ingredientsDE: List<SharedIngredient>? = null,
    val ingredientsEN: List<SharedIngredient>? = null,
    val instructionsDE: String? = null,
    val instructionsEN: String? = null,
    val image: String? = null
)

@kotlinx.serialization.Serializable
data class SharedIngredient(
    val name: String?,
    val prefix: String? = null,
    val postfix: String? = null
)

@kotlinx.serialization.Serializable
data class SharedCocktailDetailsReadyForDatabase(
    val id: String,
    val source: String,
    val name: String,
    val ingredientsDE: String? = null,
    val ingredientsEN: String? = null,
    val instructionsDE: String? = null,
    val instructionsEN: String? = null,
    val image: String? = null
)
