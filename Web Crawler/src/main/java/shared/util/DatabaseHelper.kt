package shared.util

import shared.util.Printer.writeTextToFile
import kotlin.reflect.KProperty1
import kotlin.reflect.full.declaredMembers

object DatabaseHelper {

    inline fun <reified TypeOfObject> createCreateTableQuery() {
        var createTable = "CREATE TABLE ${TypeOfObject::class.simpleName}(\n"

        createTable += TypeOfObject::class.declaredMembers.filter { member ->
            when (member) {
                is KProperty1<*, *> -> true
                else -> false
            }
        }.map { it as KProperty1<TypeOfObject, *> }.map { property ->
            val name = property.name
            "\t$name VARCHAR(255)"
        }.joinToString( ",\n","", "\n" )

        createTable += ");"

        val fileName = "create_table/${TypeOfObject::class.simpleName}_create_table.txt"
        writeTextToFile(fileName, createTable)
    }

    inline fun <reified TypeOfObject> createInsertIntoQuery(fileName: String, listOfElementsToInsert: List<TypeOfObject>) {
        Printer.logger.info { "Printing table with rows from ${TypeOfObject::class.simpleName}" }

        var table = ""

        listOfElementsToInsert.forEach { listEntry ->
            val row = TypeOfObject::class.members.filter { member ->
                when (member) {
                    is KProperty1<*, *> -> true
                    else -> false
                }
            }.map { it as KProperty1<TypeOfObject, *> }.map { property ->
                val value = property.get(listEntry)
                (value?.toString() ?: "").replace("'", " ")
            }.joinToString("','", "'", "'")

            table += "INSERT INTO ${TypeOfObject::class.simpleName} VALUES ($row);\n"
        }

        writeTextToFile("seed_database/$fileName", table)
    }

    fun createGetCocktailsByIngredientQuery(ingredient: String) {

        fun generateQueryForIngredientRow(ingredientIndex: Int) : String {
            return  "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) = UPPER('$ingredient') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('% $ingredient%') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('%$ingredient %') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('% $ingredient %') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('%-$ingredient%') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('%$ingredient-%') OR\n" +
                    "\tUPPER(`CocktailDetails`.`strIngredient$ingredientIndex`) LIKE UPPER('%-$ingredient-%') OR \n"
        }

        var query = "SELECT * " +
                "FROM `CocktailDetails`\n" +
                "WHERE "

        repeat(15) {
            query += generateQueryForIngredientRow(it + 1)
        }
        // Remove last OR
        query = query.substring(0, query.length-5)

        val fileName = "get_cocktail_by_ingredient_${ingredient.lowercase().replace(" ", "_")}"
        writeTextToFile("queries/$fileName", query)
    }
}