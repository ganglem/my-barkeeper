package thecocktaildb.model

import kotlinx.serialization.Serializable

@Serializable
data class Glasses(
    val drinks: List<Glass>
)

@Serializable
data class Glass(
    val strGlass: String
)
