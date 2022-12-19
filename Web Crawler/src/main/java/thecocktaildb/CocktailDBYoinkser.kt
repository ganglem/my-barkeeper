package thecocktaildb

import shared.Yoinkser
import mu.KLogger
import mu.KotlinLogging
import okhttp3.Request
import shared.model.SharedCocktailDetails
import shared.model.SharedCocktailDetailsReadyForDatabase
import shared.model.SharedIngredient
import thecocktaildb.model.*
import shared.util.DatabaseHelper
import shared.util.HttpHelper
import shared.util.Printer
import shared.util.SerializationHelper.convertObjectToJsonString
import shared.util.Translator
import java.util.*

object CocktailDBYoinkser : Yoinkser {

    override val logger: KLogger = KotlinLogging.logger {  }

    override fun yoinks() {

        createCreateTableCommands()

        val alcoholicCocktails = getAndHandleAlcoholicCocktails()
        val nonAlcoholicCocktails = getAndHandleNonAlcoholicCocktails()
        val allCocktails = Cocktails(alcoholicCocktails.drinks + nonAlcoholicCocktails.drinks)
        DatabaseHelper.createInsertIntoQuery("allCocktails.txt", allCocktails.drinks)

        val listOfCocktailDetails = getAndHandleCocktailDetails(allCocktails)
        DatabaseHelper.createInsertIntoQuery("cocktailDetails.txt", listOfCocktailDetails.drinks)
        convertAndHandleCocktailDetailsInSharedFormat(listOfCocktailDetails)

        val categories = getAndHandleCategories()
        DatabaseHelper.createInsertIntoQuery("categories.txt", categories.drinks)

        val glasses = getAndHandleGlasses()
        DatabaseHelper.createInsertIntoQuery("glasses.txt", glasses.drinks)

        val ingredients = getAndHandleIngredients().apply {
            this.drinks.forEach {
                DatabaseHelper.createGetCocktailsByIngredientQuery(it.strIngredient1)
            }
        }
        DatabaseHelper.createInsertIntoQuery("ingredients.txt", ingredients.drinks)
    }

    fun createCreateTableCommands() {
        DatabaseHelper.createCreateTableQuery<Category>()
        DatabaseHelper.createCreateTableQuery<CocktailDetails>()
        DatabaseHelper.createCreateTableQuery<Cocktail>()
        DatabaseHelper.createCreateTableQuery<Glass>()
        DatabaseHelper.createCreateTableQuery<Ingredient>()
    }

    fun getAndHandleAlcoholicCocktails() : Cocktails {
        logger.info { "Start retrieving all alcoholic cocktail information" }

        val listAlcoholicRequest = createRequest(urlParams = "filter.php?a=Alcoholic")
        val cocktails = HttpHelper.getResponseAsObject<Cocktails>(listAlcoholicRequest)

        Printer.writeObjectToTextFile("cocktails_alcoholic.txt", cocktails)

        return cocktails
    }

    fun getAndHandleNonAlcoholicCocktails() : Cocktails {
        logger.info { "Start retrieving all non alcoholic cocktail information" }

        val listNonAlcoholicRequest = createRequest(urlParams = "filter.php?a=Non_Alcoholic")
        val cocktails = HttpHelper.getResponseAsObject<Cocktails>(listNonAlcoholicRequest)

        Printer.writeObjectToTextFile("cocktails_non_alcoholic.txt", cocktails)

        return cocktails
    }

    fun getAndHandleCocktailDetails(cocktails: Cocktails) : ListOfCocktailDetails {
        val cocktailDetails =  ListOfCocktailDetails(
                cocktails.drinks.map { cocktail ->
                    logger.info { "Getting details for drink: ${cocktail.strDrink}" }
                    val getDetailsRequest = createRequest(urlParams = "lookup.php?i=${cocktail.idDrink}")
                    val listOfCocktailDetails = HttpHelper.getResponseAsObject<ListOfCocktailDetails>(getDetailsRequest)
                    val cocktailDetails = listOfCocktailDetails.drinks.first()
                    cocktailDetails
                }.toList()
        )

        Printer.writeObjectToTextFile("cocktails_details.txt", cocktailDetails)

        return cocktailDetails
    }

    fun convertAndHandleCocktailDetailsInSharedFormat(cocktailDetails: ListOfCocktailDetails) {
        val allCocktailDetailsReadyForDatabase = cocktailDetails.drinks.map { cocktail ->
            val ingredientsEN = listOf(
                SharedIngredient(
                    name = cocktail.strIngredient1,
                    prefix = cocktail.strMeasure1
                ),
                SharedIngredient(
                    name = cocktail.strIngredient2,
                    prefix = cocktail.strMeasure2
                ),
                SharedIngredient(
                    name = cocktail.strIngredient3,
                    prefix = cocktail.strMeasure3
                ),
                SharedIngredient(
                    name = cocktail.strIngredient4,
                    prefix = cocktail.strMeasure4
                ),
                SharedIngredient(
                    name = cocktail.strIngredient5,
                    prefix = cocktail.strMeasure5
                ),
                SharedIngredient(
                    name = cocktail.strIngredient6,
                    prefix = cocktail.strMeasure6
                ),
                SharedIngredient(
                    name = cocktail.strIngredient7,
                    prefix = cocktail.strMeasure7
                ),
                SharedIngredient(
                    name = cocktail.strIngredient8,
                    prefix = cocktail.strMeasure8
                ),
                SharedIngredient(
                    name = cocktail.strIngredient9,
                    prefix = cocktail.strMeasure9
                ),
                SharedIngredient(
                    name = cocktail.strIngredient10,
                    prefix = cocktail.strMeasure10
                ),
                SharedIngredient(
                    name = cocktail.strIngredient11,
                    prefix = cocktail.strMeasure11
                ),
                SharedIngredient(
                    name = cocktail.strIngredient12,
                    prefix = cocktail.strMeasure12
                ),
                SharedIngredient(
                    name = cocktail.strIngredient13,
                    prefix = cocktail.strMeasure13
                ),
                SharedIngredient(
                    name = cocktail.strIngredient14,
                    prefix = cocktail.strMeasure14
                ),
                SharedIngredient(
                    name = cocktail.strIngredient15,
                    prefix = cocktail.strMeasure15
                ),
            ).filter { it.name != null && it.name.isNotEmpty() }
            SharedCocktailDetailsReadyForDatabase(
                id = UUID.randomUUID().toString(),
                name = cocktail.strDrink!!,
                source = "CocktailDB",
                ingredientsDE = convertObjectToJsonString(ingredientsEN.map { ingredient ->
                    SharedIngredient(
                        name = Translator.translate(ingredient.name!!, Translator.LANGUAGES.EN, Translator.LANGUAGES.DE),
                        prefix = ingredient.prefix
                    )
                }),
                ingredientsEN = convertObjectToJsonString(ingredientsEN),
                instructionsDE = cocktail.strInstructionsDE,
                instructionsEN = cocktail.strInstructions,
                image = cocktail.strDrinkThumb
            )
        }
        DatabaseHelper.createInsertIntoQuery("insert_cocktaildb_cocktails.txt", allCocktailDetailsReadyForDatabase)
        Printer.writeObjectToTextFile("cocktaildb_shared_cocktail_details", allCocktailDetailsReadyForDatabase)
    }

    fun getAndHandleCategories() : Categories {
        logger.info { "Start retrieving all categories" }

        val request = createRequest(urlParams = "list.php?c=list")
        return Printer.writeResponseToTextFile("categories.txt", request)
    }

    fun getAndHandleGlasses() : Glasses {
        logger.info { "Start retrieving all glasses" }

        val request = createRequest(urlParams = "list.php?g=list")
        return Printer.writeResponseToTextFile("glasses.txt", request)
    }

    fun getAndHandleIngredients(): Ingredients {
        logger.info { "Start of retrieving all ingredient information" }

        val request = createRequest(urlParams = "list.php?i=list")
        return Printer.writeResponseToTextFile("ingredients.txt", request)
    }

    fun createRequest(urlParams: String) : Request {
        val request = Request.Builder()
                .url("https://the-cocktail-db.p.rapidapi.com/$urlParams")
                .get()
                .addHeader("X-RapidAPI-Host", "the-cocktail-db.p.rapidapi.com")
                .addHeader("X-RapidAPI-Key", "7db05896a0msh2b22ee17d32dff3p1fb3bejsnc184e465c54e")
                .build()
        logger.info { "Created request: $request" }
        return request
    }

}