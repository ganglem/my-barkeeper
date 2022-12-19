package thecocktaildb.model

import kotlinx.serialization.Serializable

@Serializable
data class Categories(
    val drinks: List<Category>
)

@Serializable
data class Category(
    val strCategory: String
)