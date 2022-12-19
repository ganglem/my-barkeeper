package schweppes

import mu.KLogger
import mu.KotlinLogging
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import schweppes.model.SchweppesHomepageCocktailList
import schweppes.model.Source
import shared.Yoinkser
import shared.model.SharedCocktailDetails
import shared.model.SharedCocktailDetailsReadyForDatabase
import shared.model.SharedIngredient
import shared.util.DatabaseHelper
import shared.util.HttpHelper
import shared.util.Printer
import shared.util.SerializationHelper.convertObjectToJsonString
import shared.util.Translator
import java.util.*

object SchweppesYoinkser : Yoinkser {

    override val logger: KLogger = KotlinLogging.logger {  }

    override fun yoinks() {

        DatabaseHelper.createCreateTableQuery<SharedCocktailDetailsReadyForDatabase>()

        val cocktails = mutableListOf<SharedCocktailDetailsReadyForDatabase>()

        goThroughCocktails { cocktail ->
            val cocktailDetailsPage = try {
                HttpHelper.getResponseBody(
                    createGetCocktailDetailsPageRequest(
                        cleanUpCocktailNameForHttpRequest(cocktail.name!!)
                    )
                )
            } catch (e: Exception) {
                HttpHelper.getResponseBody(
                    createGetCocktailDetailsPageRequest(
                        cleanUpCocktailNameForHttpRequest(cocktail.name!!.replace("-", "").replace("&", ""))
                    )
                )
            }
            val ingredientsDE = ((cocktail.ingredients_schweppes ?: emptyList()).plus((cocktail.ingredients_other ?: emptyList()).asIterable()).plus((cocktail.ingredients_spirits ?: emptyList()))).map { ingredient ->
                SharedIngredient(
                    name = ingredient,
                    postfix = getIngredientPostfixFromHTML(cocktailDetailsPage, ingredient)
                )
            }
            val instructionsDE = getInstructionsFromHTML(cocktailDetailsPage)
            val cocktailDetails = SharedCocktailDetailsReadyForDatabase(
                id = UUID.randomUUID().toString(),
                name = cocktail.name!!,
                source = "SchweppesDE",
                ingredientsDE = convertObjectToJsonString(ingredientsDE),
                ingredientsEN = convertObjectToJsonString(ingredientsDE.map { ingredient ->
                    SharedIngredient(
                        name = Translator.translate(ingredient.name!!, Translator.LANGUAGES.DE, Translator.LANGUAGES.EN),
                        postfix = ingredient.postfix
                    )
                }),
                instructionsDE = instructionsDE,
                instructionsEN = Translator.translate(instructionsDE, Translator.LANGUAGES.DE, Translator.LANGUAGES.EN),
                image = getImageURLFromHTMLImage(cocktail.htmlImage!!)
            )
            logger.info { "Successfully yoinkst cocktail: $cocktailDetails" }
            cocktails.add(cocktailDetails)
        }

        DatabaseHelper.createInsertIntoQuery("insert_schweppes_cocktails.txt", cocktails)
        Printer.writeObjectToTextFile<List<SharedCocktailDetailsReadyForDatabase>>("schweppes_shared_cocktail_details.txt", cocktails)
    }

    private fun cleanUpCocktailNameForHttpRequest(name: String): String {
        return name
            .replace("'", "")
            .replace("(", "")
            .replace(")", "")
            .replace(",", "")
            .replace(".", "")
            .replace("&", "and")
    }

    private fun getInstructionsFromHTML(html: String): String {
        return html.split("cocktail-detail__preparation")[1].split("<p>")[1].split("</p>")[0].trim()
    }

    private fun getIngredientPostfixFromHTML(html: String, ingredient: String): String? {
        val ingredientCol = html.split("cocktail-detail__ingredients")[1].split("$ingredient")[1].split("<")[0]
        return if (ingredientCol.isNotEmpty()) {
            ingredientCol.split("(")[1].split(")")[0]
        } else {
            null
        }
    }

    private fun getImageURLFromHTMLImage(htmlImage: String): String {
        val imagePath = htmlImage.split("data-default-src=\"")[1].split("\">")[0]
        return "https://schweppes.de$imagePath"
    }

    private fun goThroughCocktails(run: (Source) -> Unit) {
        logger.info { "Start going through each cocktail" }
        try {
            val requestedCocktails = 15
            var startingFrom = 15
            while(true) {
                try {
                    val response = HttpHelper.getResponseAsObject<SchweppesHomepageCocktailList>(
                        createPostRequest(
                            requestedCocktails,
                            startingFrom
                        )
                    )
                    val amountOfReceivedCocktails = response.responses!![0].hits!!.hits!!.size;
                    if (amountOfReceivedCocktails < requestedCocktails) {
                        break;
                    }
                    response.responses!![0].hits!!.hits!!.map { it._source }.map {
                        try {
                            run(it!!)
                        } catch (_: Exception) {}
                    }
                } catch (e: Exception) {
                    logger.warn { "There was a problem while requesting a specific Cocktail. Maybe it does not exist anymore" }
                }
                startingFrom += requestedCocktails;
            }
            logger.info { "Total amount of received cocktails: ${(startingFrom + requestedCocktails)}" }
        } catch (exception: Exception) {
            logger.warn { "There was a Problem while requesting cocktails" }
        }
    }

    private fun createGetCocktailDetailsPageRequest(cocktailName: String): Request {
        return Request.Builder()
            .url("https://www.schweppes.de/mixen/cocktails/${cocktailName.replace(" ", "-")}")
            .get()
            .build()
    }

    private fun createPostRequest(requestedCocktails: Int, startingFrom: Int) : Request {
        val body = "{\"preference\":\"page\"}\n" +
                "{\"query\":{\"bool\":{\"must\":[{\"bool\":{\"must\":[{\"term\":{\"countries\":\"de\"}}]}}]}},\"size\":${requestedCocktails},\"_source\":{\"includes\":[\"*\"],\"excludes\":[]},\"from\":${startingFrom},\"sort\":[{\"visits\":{\"order\":\"desc\"}}]}\n"
        val request = Request.Builder()
                .url("https://www.schweppes.de/cocktail-finder/_msearch?")
                .post(body.toRequestBody("text/plain; charset=utf-8".toMediaType()))
                .addHeader("Host", "www.schweppes.de")
                .addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0")
                .addHeader("Accept", "application/json")
                .addHeader("Accept-Language", "de,en-US;q=0.7,en;q=0.3")
                .addHeader("Accept-Encoding", "gzip, deflate, br")
                .addHeader("Referer", "https://www.schweppes.de/mixen/cocktails?page=1")
                .addHeader("content-type", "application/x-ndjson")
                .addHeader("Content-Length", "200")
                .addHeader("Origin", "https://www.schweppes.de")
                .addHeader("DNT", "1")
                .addHeader("Connection", "keep-alive")
                .addHeader("Cookie", "agegate=agegate; _pin_unauth=dWlkPU5XVmpObVZrTVRRdFltTTFPUzAwTURreExUaGhZall0Tm1VeE16SmpNVFE0TkdJMw")
                .addHeader("Sec-Fetch-Dest", "empty")
                .addHeader("Sec-Fetch-Mode", "cors")
                .addHeader("Sec-Fetch-Site", "same-origin")
                .addHeader("TE", "trailers")
                .build()
        logger.info { "Created request: $request" }
        return request
    }
}