import mu.KotlinLogging
import okhttp3.Request
import schweppes.SchweppesYoinkser
import shared.Yoinkser
import shared.util.SerializationHelper
import shared.util.Translator
import thecocktaildb.CocktailDBYoinkser

private val logger = KotlinLogging.logger { }

fun main() {

   /*val yoinkser: List<Yoinkser> = listOf(
        SchweppesYoinkser,
        CocktailDBYoinkser
    )

    yoinkser.forEach { it.yoinks() }*/


    println(Translator.translate("Am Ende eines Semesters legen Studierende Prüfungen ab. Der erste Prüfungszeitraum liegt in der Regel in der letzten Vorlesungswoche und den ersten drei vorlesungsfreien Wochen. der zweite Prüfungszeitraum in den letzten drei vorlesungsfreien Wochen und der ersten Vorlesungswoche des Folgesemesters.", Translator.LANGUAGES.DE, Translator.LANGUAGES.EN))

    //printAllIngredientsFromCocktailAPI()
}

private fun printAllIngredientsFromCocktailAPI() {
    val request = Request.Builder()
        .url("https://cocktailapi.bean-studios.com/allIngredients")
        .build()

    val response = okhttp3.OkHttpClient().newCall(request).execute()
    val responseBody = response.body?.string() ?: throw IllegalStateException("Response body is null")
    val ingredients = SerializationHelper.convertJsonStringToObject<HashMap<String, String>>(responseBody)
    logger.info { "Found ${ingredients.size} ingredients" }

    ingredients.map {
        it.value
    }.distinct().apply {
        println(this.size)
    }.joinToString("") {
        if (it.contains(" ")) {
            "${it},,${it.replace(" ", "")}\n"
        } else "${it},\n"
    }.run {
            println(this)
    }
}