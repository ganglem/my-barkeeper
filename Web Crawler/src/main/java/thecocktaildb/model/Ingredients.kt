package thecocktaildb.model

import kotlinx.serialization.Serializable

@Serializable
data class Ingredients(
    val drinks: List<Ingredient>
)

@Serializable
data class Ingredient(
    val strIngredient1: String
)