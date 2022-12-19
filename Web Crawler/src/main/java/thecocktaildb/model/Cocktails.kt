package thecocktaildb.model

import kotlinx.serialization.Serializable

@Serializable
data class Cocktails(
    val drinks: List<Cocktail>
)

@Serializable
data class Cocktail (
    val strDrink: String,
    val strDrinkThumb: String,
    val idDrink: String
)